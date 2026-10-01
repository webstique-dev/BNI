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
  formatKolkataTime,
} from '../utils/time.js';
import { generateRandomToken, hashToken } from '../utils/token.js';

export const DEVICE_COOKIE_NAME = 'device_token';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Cookie options helper for device_token
 */
export function getDeviceCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax', // 'none' for cross-domain in production if needed, or 'lax'
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

  return {
    attendance,
    alreadyMarked,
    status: attendance.status,
    checkInAt: attendance.checkInAt,
    meetingDate: today,
    startTime,
    graceMinutes,
  };
}

/**
 * Helper to create a new device token and set the cookie on the response
 */
async function linkDeviceAndSetCookie(res, memberId, userAgent = '') {
  const rawToken = generateRandomToken();
  const tokenHash = hashToken(rawToken);

  await Device.create({
    tokenHash,
    memberId,
    userAgent,
    lastUsedAt: new Date(),
  });

  res.cookie(DEVICE_COOKIE_NAME, rawToken, getDeviceCookieOptions());
  return rawToken;
}

/**
 * POST /api/checkin/device
 * Auto check-in via device_token cookie
 */
export async function checkInByDevice(req, res, next) {
  try {
    const rawToken = req.cookies?.[DEVICE_COOKIE_NAME];

    if (!rawToken) {
      return res.status(401).json({
        success: false,
        needsIdentification: true,
        message: 'No device token found. Please identify yourself.',
      });
    }

    const tokenHash = hashToken(rawToken);
    const device = await Device.findOne({ tokenHash }).populate('memberId');

    if (!device || !device.memberId || !device.memberId.isActive) {
      // Token is stale, invalid or member inactive
      res.clearCookie(DEVICE_COOKIE_NAME, getDeviceCookieOptions());
      return res.status(401).json({
        success: false,
        needsIdentification: true,
        message: 'Device not recognized or member inactive.',
      });
    }

    const member = device.memberId;

    // Update device last used timestamp
    device.lastUsedAt = new Date();
    await device.save();

    const result = await recordAttendance({
      memberId: member._id,
      method: 'device',
      userAgent: req.headers['user-agent'] || '',
    });

    return res.status(200).json({
      success: true,
      alreadyMarked: result.alreadyMarked,
      member: {
        id: member._id,
        name: member.name,
        company: member.company || '',
        category: member.category || '',
      },
      checkInAt: result.checkInAt,
      checkInTimeFormatted: formatKolkataTime(result.checkInAt),
      status: result.status,
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
    await linkDeviceAndSetCookie(res, member._id, req.headers['user-agent'] || '');

    return res.status(200).json({
      success: true,
      isNew: false,
      alreadyMarked: result.alreadyMarked,
      member: {
        id: member._id,
        name: member.name,
        company: member.company || '',
        category: member.category || '',
      },
      checkInAt: result.checkInAt,
      checkInTimeFormatted: formatKolkataTime(result.checkInAt),
      status: result.status,
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

    await linkDeviceAndSetCookie(res, newMember._id, req.headers['user-agent'] || '');

    return res.status(201).json({
      success: true,
      alreadyMarked: false,
      member: {
        id: newMember._id,
        name: newMember.name,
        company: newMember.company || '',
        category: newMember.category || '',
      },
      checkInAt: result.checkInAt,
      checkInTimeFormatted: formatKolkataTime(result.checkInAt),
      status: result.status,
      meetingDate: result.meetingDate,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/members/search?q=
 * Public member search by name (returns ONLY name and ID, NEVER phone numbers)
 */
export async function searchMembers(req, res, next) {
  try {
    const q = req.query.q ? String(req.query.q).trim() : '';

    if (!q || q.length < 2) {
      return res.status(200).json({
        success: true,
        results: [],
      });
    }

    // Escape regex special characters
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const members = await Member.find(
      {
        name: { $regex: escaped, $options: 'i' },
        isActive: true,
      },
      { _id: 1, name: 1, company: 1, category: 1 } // NEVER include phone
    )
      .limit(10)
      .sort({ name: 1 })
      .lean();

    const formatted = members.map((m) => ({
      id: m._id,
      name: m.name,
      company: m.company || '',
      category: m.category || '',
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

    const settings = await Settings.getSettings();

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

    if (rememberDevice) {
      await linkDeviceAndSetCookie(res, member._id, req.headers['user-agent'] || '');
    }

    return res.status(200).json({
      success: true,
      alreadyMarked: result.alreadyMarked,
      member: {
        id: member._id,
        name: member.name,
        company: member.company || '',
        category: member.category || '',
      },
      checkInAt: result.checkInAt,
      checkInTimeFormatted: formatKolkataTime(result.checkInAt),
      status: result.status,
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
      today,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/checkin/forget-device
 * Clear device_token cookie
 */
export async function forgetDevice(req, res, next) {
  try {
    const rawToken = req.cookies?.[DEVICE_COOKIE_NAME];
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

