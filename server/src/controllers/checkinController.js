import crypto from 'crypto';
import Member from '../models/Member.js';
import Device from '../models/Device.js';
import Meeting from '../models/Meeting.js';
import Attendance from '../models/Attendance.js';
import Settings from '../models/Settings.js';
import { normalizePhone, isValidPhone } from '../utils/phone.js';
import {
  getKolkataToday,
  calculateAttendanceStatus,
  calculatePunctuality,
  formatKolkataTime,
} from '../utils/time.js';
import { generateRandomToken, hashToken } from '../utils/token.js';

export const DEVICE_COOKIE_NAME = 'device_token';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Helper to verify QR code access token
 */
export function verifyQrAccess(req, settings) {
  if (!settings || settings.qrSecurityEnabled === false) {
    return { valid: true };
  }

  const providedKey =
    req.headers['x-qr-key'] ||
    req.query.qr ||
    req.query.k ||
    req.query.code ||
    req.body?.qrKey ||
    req.body?.qr;

  if (!providedKey || typeof providedKey !== 'string') {
    return {
      valid: false,
      message: 'No QR code key detected. Please scan the official chapter QR code displayed at the meeting desk.',
    };
  }

  if (providedKey.trim() !== settings.qrKey) {
    return {
      valid: false,
      message: 'This attendance QR code has expired or is invalid. Please scan the official chapter QR code displayed at the meeting desk.',
    };
  }

  return { valid: true };
}

/**
 * GET /api/checkin/validate-qr
 */
export async function validateQr(req, res, next) {
  try {
    const settings = await Settings.getSettings();
    const check = verifyQrAccess(req, settings);
    return res.status(200).json({
      success: true,
      valid: check.valid,
      message: check.valid ? 'QR code is valid' : check.message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cookie options helper for device_token
 */
export function getDeviceCookieOptions(req) {
  const isProd = process.env.NODE_ENV === 'production';
  const isHttps = req?.secure || req?.headers?.['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure: isHttps || isProd,
    sameSite: 'lax', // 'lax' ensures cookie is reliably sent on QR scan top-level navigation
    maxAge: ONE_YEAR_MS,
    path: '/',
  };
}

/**
 * Helper to record attendance idempotently
 */
async function recordAttendance({ memberId, method, userAgent }) {
  const today = getKolkataToday();
  const settings = await Settings.getSettings();

  // Check if today has a custom meeting configuration or fallback to settings
  const meeting = await Meeting.findOne({ date: today });
  const startTime = meeting?.startTime || settings.defaultStartTime || '08:00';
  const graceMinutes = meeting?.graceMinutes ?? settings.graceMinutes ?? 0;

  const checkInDate = new Date();
  const status = calculateAttendanceStatus(checkInDate, today, startTime, graceMinutes);

  // Use findOneAndUpdate with upsert to guarantee idempotency and avoid race conditions
  let attendance;
  let alreadyMarked = false;

  try {
    const existing = await Attendance.findOne({ memberId, meetingDate: today });
    if (existing) {
      attendance = existing;
      alreadyMarked = true;
    } else {
      attendance = await Attendance.create({
        memberId,
        meetingDate: today,
        checkInAt: checkInDate,
        status,
        method,
      });
      alreadyMarked = false;
    }
  } catch (err) {
    if (err.code === 11000) {
      // Race condition caught by unique compound index
      attendance = await Attendance.findOne({ memberId, meetingDate: today });
      alreadyMarked = true;
    } else {
      throw err;
    }
  }

  const effectiveCheckInAt = attendance.checkInAt || checkInDate;
  const punctualityResult = calculatePunctuality(effectiveCheckInAt, today, startTime);

  return {
    attendance,
    alreadyMarked,
    status: attendance.status,
    checkInAt: effectiveCheckInAt,
    meetingDate: today,
    startTime,
    graceMinutes,
    punctuality: punctualityResult.punctuality,
    punctualityMessage: punctualityResult.message,
    expectedStartTime: startTime,
    expectedStartTimeFormatted: punctualityResult.expectedTime,
  };
}

/**
 * Helper to create a new device token and set the cookie on the response
 */
async function linkDeviceAndSetCookie(res, memberId, userAgent = '', req = null) {
  const rawToken = generateRandomToken();
  const tokenHash = hashToken(rawToken);

  await Device.create({
    tokenHash,
    memberId,
    userAgent,
    lastUsedAt: new Date(),
  });

  res.cookie(DEVICE_COOKIE_NAME, rawToken, getDeviceCookieOptions(req));
  return rawToken;
}

/**
 * POST /api/checkin/device
 * Auto check-in via device_token cookie, header, or body with mobile storage fallback
 */
export async function checkInByDevice(req, res, next) {
  try {
    const settings = await Settings.getSettings();
    const qrAccess = verifyQrAccess(req, settings);
    if (!qrAccess.valid) {
      return res.status(403).json({
        success: false,
        invalidQr: true,
        message: qrAccess.message,
      });
    }

    const rawToken =
      req.body?.deviceToken ||
      req.cookies?.[DEVICE_COOKIE_NAME] ||
      req.headers['x-device-token'];

    const { memberId, phone } = req.body || {};

    let member = null;
    let activeDevice = null;
    let effectiveDeviceToken = rawToken || '';

    // 1. First attempt: recognize by device token
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      const device = await Device.findOne({ tokenHash }).populate('memberId');

      if (device && device.memberId && device.memberId.isActive) {
        member = device.memberId;
        activeDevice = device;
      }
    }

    // 2. Secondary fallback: recognize by remembered phone or memberId
    if (!member && (memberId || phone)) {
      if (phone) {
        const normalized = normalizePhone(phone);
        if (normalized) {
          member = await Member.findOne({ phone: normalized, isActive: true });
        }
      }
      if (!member && memberId) {
        member = await Member.findOne({ _id: memberId, isActive: true });
      }

      // Re-link device seamlessly so subsequent scans work via device token directly
      if (member) {
        effectiveDeviceToken = await linkDeviceAndSetCookie(
          res,
          member._id,
          req.headers['user-agent'] || '',
          req
        );
      }
    }

    if (!member) {
      res.clearCookie(DEVICE_COOKIE_NAME, getDeviceCookieOptions(req));
      return res.status(401).json({
        success: false,
        needsIdentification: true,
        message: 'No device token found. Please identify yourself.',
      });
    }

    // Refresh last used timestamp and cookie if device document is found
    if (activeDevice) {
      activeDevice.lastUsedAt = new Date();
      await activeDevice.save();
      res.cookie(DEVICE_COOKIE_NAME, rawToken, getDeviceCookieOptions(req));
    }

    const result = await recordAttendance({
      memberId: member._id,
      method: 'device',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(200).json({
      success: true,
      alreadyMarked: result.alreadyMarked,
      deviceToken: effectiveDeviceToken,
      member: {
        id: member._id,
        name: member.name,
        phone: member.phone || '',
        company: member.company || '',
        category: member.category || '',
      },
      checkInAt: result.checkInAt,
      checkInTimeFormatted: formatKolkataTime(result.checkInAt),
      status: result.status,
      punctuality: result.punctuality,
      punctualityMessage: result.punctualityMessage,
      expectedStartTime: result.startTime,
      expectedStartTimeFormatted: result.expectedStartTimeFormatted,
      meetingDate: result.meetingDate,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/checkin/phone
 * Check-in by phone number
 */
export async function checkInByPhone(req, res, next) {
  try {
    const settings = await Settings.getSettings();
    const qrAccess = verifyQrAccess(req, settings);
    if (!qrAccess.valid) {
      return res.status(403).json({
        success: false,
        invalidQr: true,
        message: qrAccess.message,
      });
    }

    const { phone } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile number.',
      });
    }

    const member = await Member.findOne({ phone: normalizedPhone, isActive: true });

    if (!member) {
      return res.status(200).json({
        success: true,
        isNew: true,
        phone: normalizedPhone,
        message: 'Member not found. Please enter your name to register.',
      });
    }

    // Mark attendance
    const result = await recordAttendance({
      memberId: member._id,
      method: 'phone',
      userAgent: req.headers['user-agent'] || '',
    });

    // Link device for one-scan future check-ins
    const deviceToken = await linkDeviceAndSetCookie(res, member._id, req.headers['user-agent'] || '');

    return res.status(200).json({
      success: true,
      isNew: false,
      alreadyMarked: result.alreadyMarked,
      deviceToken,
      member: {
        id: member._id,
        name: member.name,
        company: member.company || '',
        category: member.category || '',
      },
      checkInAt: result.checkInAt,
      checkInTimeFormatted: formatKolkataTime(result.checkInAt),
      status: result.status,
      punctuality: result.punctuality,
      punctualityMessage: result.punctualityMessage,
      expectedStartTime: result.startTime,
      expectedStartTimeFormatted: result.expectedStartTimeFormatted,
      meetingDate: result.meetingDate,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/checkin/register
 * New member self-registration and instant check-in
 */
export async function registerAndCheckIn(req, res, next) {
  try {
    const settings = await Settings.getSettings();
    const qrAccess = verifyQrAccess(req, settings);
    if (!qrAccess.valid) {
      return res.status(403).json({
        success: false,
        invalidQr: true,
        message: qrAccess.message,
      });
    }

    const { phone, name, company, category } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid full name (at least 2 characters).',
      });
    }

    if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile number.',
      });
    }

    // Check if phone is already registered
    const existing = await Member.findOne({ phone: normalizedPhone });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A member with this phone number is already registered. Please check in with your phone.',
      });
    }

    const newMember = await Member.create({
      name: name.trim(),
      phone: normalizedPhone,
      company: company?.trim() || '',
      category: category?.trim() || '',
      isActive: true,
    });

    const result = await recordAttendance({
      memberId: newMember._id,
      method: 'phone',
      userAgent: req.headers['user-agent'] || '',
    });

    const deviceToken = await linkDeviceAndSetCookie(res, newMember._id, req.headers['user-agent'] || '');

    return res.status(201).json({
      success: true,
      alreadyMarked: false,
      deviceToken,
      member: {
        id: newMember._id,
        name: newMember.name,
        company: newMember.company || '',
        category: newMember.category || '',
      },
      checkInAt: result.checkInAt,
      checkInTimeFormatted: formatKolkataTime(result.checkInAt),
      status: result.status,
      punctuality: result.punctuality,
      punctualityMessage: result.punctualityMessage,
      expectedStartTime: result.startTime,
      expectedStartTimeFormatted: result.expectedStartTimeFormatted,
      meetingDate: result.meetingDate,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/members/search?q=
 * Public member search by name or phone (returns name, company, category, maskedPhone, NEVER full phone numbers)
 */
export async function searchMembers(req, res, next) {
  try {
    const settings = await Settings.getSettings();
    const qrAccess = verifyQrAccess(req, settings);
    if (!qrAccess.valid) {
      return res.status(403).json({
        success: false,
        invalidQr: true,
        message: qrAccess.message,
      });
    }

    const q = req.query.q ? String(req.query.q).trim() : '';

    // If q is 'all', return all active members for client-side instant fuzzy search
    if (q === '__all__') {
      const allMembers = await Member.find(
        { isActive: true },
        { _id: 1, name: 1, company: 1, category: 1, phone: 1 }
      )
        .sort({ name: 1 })
        .lean();

      const formatted = allMembers.map((m) => ({
        id: m._id,
        name: m.name,
        company: m.company || '',
        category: m.category || '',
        maskedPhone: m.phone ? '******' + m.phone.slice(-4) : '',
        last4: m.phone ? m.phone.slice(-4) : '',
      }));

      return res.status(200).json({
        success: true,
        results: formatted,
      });
    }

    if (!q || q.length < 2) {
      return res.status(200).json({
        success: true,
        results: [],
      });
    }

    // Escape regex special characters
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const digitsOnly = q.replace(/\D/g, '');

    const orConditions = [
      { name: { $regex: escaped, $options: 'i' } },
      { company: { $regex: escaped, $options: 'i' } },
      { category: { $regex: escaped, $options: 'i' } },
    ];

    if (digitsOnly.length >= 2) {
      orConditions.push({ phone: { $regex: digitsOnly, $options: 'i' } });
    }

    const members = await Member.find(
      {
        $or: orConditions,
        isActive: true,
      },
      { _id: 1, name: 1, company: 1, category: 1, phone: 1 }
    )
      .limit(15)
      .sort({ name: 1 })
      .lean();

    const formatted = members.map((m) => ({
      id: m._id,
      name: m.name,
      company: m.company || '',
      category: m.category || '',
      maskedPhone: m.phone ? '******' + m.phone.slice(-4) : '',
      last4: m.phone ? m.phone.slice(-4) : '',
    }));

    return res.status(200).json({
      success: true,
      results: formatted,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/checkin/search
 * Check in via member search with optional last-4 digits verification and device remembering
 */
export async function checkInBySearch(req, res, next) {
  try {
    const settings = await Settings.getSettings();
    const qrAccess = verifyQrAccess(req, settings);
    if (!qrAccess.valid) {
      return res.status(403).json({
        success: false,
        invalidQr: true,
        message: qrAccess.message,
      });
    }

    const { memberId, phoneLast4, rememberDevice } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID is required.',
      });
    }

    const member = await Member.findOne({ _id: memberId, isActive: true });
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found or inactive.',
      });
    }

    // Check last 4 digits if enabled
    if (settings.requirePhoneLast4OnSearch) {
      if (!phoneLast4 || String(phoneLast4).trim().length !== 4) {
        return res.status(400).json({
          success: false,
          message: 'Please enter the last 4 digits of your registered phone number for security.',
        });
      }

      const cleanLast4 = String(phoneLast4).trim();
      if (!member.phone.endsWith(cleanLast4)) {
        return res.status(400).json({
          success: false,
          message: 'The last 4 digits of the phone number do not match our records.',
        });
      }
    }

    const result = await recordAttendance({
      memberId: member._id,
      method: 'search',
      userAgent: req.headers['user-agent'] || '',
    });

    let deviceToken = null;
    if (rememberDevice) {
      deviceToken = await linkDeviceAndSetCookie(res, member._id, req.headers['user-agent'] || '');
    }

    return res.status(200).json({
      success: true,
      alreadyMarked: result.alreadyMarked,
      deviceToken,
      member: {
        id: member._id,
        name: member.name,
        company: member.company || '',
        category: member.category || '',
      },
      checkInAt: result.checkInAt,
      checkInTimeFormatted: formatKolkataTime(result.checkInAt),
      status: result.status,
      punctuality: result.punctuality,
      punctualityMessage: result.punctualityMessage,
      expectedStartTime: result.startTime,
      expectedStartTimeFormatted: result.expectedStartTimeFormatted,
      meetingDate: result.meetingDate,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/public/info
 * Public chapter info and search requirements
 */
export async function getPublicInfo(req, res, next) {
  try {
    const settings = await Settings.getSettings();
    const today = getKolkataToday();

    return res.status(200).json({
      success: true,
      chapterName: settings.chapterName || 'BNI Jubilant – Chennai CBD A',
      defaultStartTime: settings.defaultStartTime || '08:00',
      requirePhoneLast4OnSearch: settings.requirePhoneLast4OnSearch ?? true,
      qrSecurityEnabled: settings.qrSecurityEnabled ?? true,
      today,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/checkin/forget-device
 * Clear device_token cookie and DB record
 */
export async function forgetDevice(req, res, next) {
  try {
    const rawToken =
      req.cookies?.[DEVICE_COOKIE_NAME] ||
      req.headers['x-device-token'] ||
      req.body?.deviceToken;

    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await Device.deleteOne({ tokenHash });
    }
    res.clearCookie(DEVICE_COOKIE_NAME, getDeviceCookieOptions());
    return res.status(200).json({
      success: true,
      message: 'Device unlinked successfully.',
    });
  } catch (error) {
    next(error);
  }
}

