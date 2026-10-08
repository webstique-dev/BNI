import crypto from 'crypto';
import Settings from '../models/Settings.js';
import Meeting from '../models/Meeting.js';
import { getKolkataToday } from '../utils/time.js';

/**
 * GET /api/admin/settings
 */
export async function getSettings(req, res, next) {
  try {
    const settings = await Settings.getSettings();
    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/settings
 */
export async function updateSettings(req, res, next) {
  try {
    const {
      chapterName,
      defaultStartTime,
      graceMinutes,
      requirePhoneLast4OnSearch,
      qrKey,
      qrSecurityEnabled,
    } = req.body;
    let settings = await Settings.findOne();

    if (!settings) {
      settings = new Settings();
    }

    if (chapterName !== undefined) settings.chapterName = chapterName.trim();
    if (defaultStartTime !== undefined) {
      // Validate HH:mm format
      if (!/^\d{2}:\d{2}$/.test(defaultStartTime)) {
        return res.status(400).json({
          success: false,
          message: 'Expected login time must be in HH:mm 24-hour format (e.g. 08:00).',
        });
      }
      settings.defaultStartTime = defaultStartTime;

      // Dynamically sync today's meeting start time if it exists
      const today = getKolkataToday();
      await Meeting.updateMany({ date: today }, { $set: { startTime: defaultStartTime } });
    }

    if (graceMinutes !== undefined) {
      const parsedGrace = Number(graceMinutes);
      if (isNaN(parsedGrace) || parsedGrace < 0) {
        return res.status(400).json({
          success: false,
          message: 'Grace minutes must be a non-negative number.',
        });
      }
      settings.graceMinutes = parsedGrace;

      const today = getKolkataToday();
      await Meeting.updateMany({ date: today }, { $set: { graceMinutes: parsedGrace } });
    }

    if (requirePhoneLast4OnSearch !== undefined) {
      settings.requirePhoneLast4OnSearch = Boolean(requirePhoneLast4OnSearch);
    }

    if (qrSecurityEnabled !== undefined) {
      settings.qrSecurityEnabled = Boolean(qrSecurityEnabled);
    }

    if (qrKey !== undefined) {
      const cleanKey = String(qrKey).trim();
      if (!cleanKey || cleanKey.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'QR Key must be at least 3 characters.',
        });
      }
      if (cleanKey !== settings.qrKey) {
        settings.qrKey = cleanKey;
        settings.qrRotatedAt = new Date();
      }
    }

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Chapter settings saved successfully.',
      settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/settings/regenerate-qr
 * Instantly generates a new QR code key and invalidates all previous QR links
 */
export async function regenerateQrKey(req, res, next) {
  try {
    let settings = await Settings.getSettings();
    const newQrKey = crypto.randomBytes(6).toString('hex');
    settings.qrKey = newQrKey;
    settings.qrRotatedAt = new Date();
    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'New Chapter QR Code generated. Previous QR links are now invalid.',
      settings,
    });
  } catch (error) {
    next(error);
  }
}

