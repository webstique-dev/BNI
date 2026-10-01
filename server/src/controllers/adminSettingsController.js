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
    const { chapterName, defaultStartTime, graceMinutes, requirePhoneLast4OnSearch } = req.body;
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
