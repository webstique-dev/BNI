import Attendance from '../models/Attendance.js';
import Member from '../models/Member.js';
import Meeting from '../models/Meeting.js';
import Settings from '../models/Settings.js';
import { getKolkataToday, formatKolkataTime, toKolkata } from '../utils/time.js';

/**
 * GET /api/admin/attendance?date=YYYY-MM-DD
 */
export async function getAttendanceByDate(req, res, next) {
  try {
    const targetDate = req.query.date || getKolkataToday();

    // 1. Fetch all active members
    const allActiveMembers = await Member.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    // 2. Fetch all attendance records for this date
    const attendances = await Attendance.find({ meetingDate: targetDate })
      .populate('memberId')
      .lean();

    // 3. Get meeting info for this date if exists
    const meeting = await Meeting.findOne({ date: targetDate }).lean();
    const settings = await Settings.getSettings();

    // Map attended member IDs
    const attendedMap = new Map();
    const presentList = [];
    const lateList = [];

    attendances.forEach((att) => {
      if (!att.memberId) return; // skip if member was deleted or null
      const member = att.memberId;
      attendedMap.set(member._id.toString(), att);

      const item = {
        attendanceId: att._id,
        memberId: member._id,
        name: member.name,
        phone: member.phone,
        company: member.company || '',
        category: member.category || '',
        checkInAt: att.checkInAt,
        checkInTimeFormatted: formatKolkataTime(att.checkInAt),
        status: att.status, // 'present' or 'late'
        method: att.method,
        notes: att.notes || '',
      };

      if (att.status === 'late') {
        lateList.push(item);
      } else {
        presentList.push(item);
      }
    });

    // 4. Compute absent list (active members who have NO attendance record for this date)
    const absentList = allActiveMembers
      .filter((m) => !attendedMap.has(m._id.toString()))
      .map((m) => ({
        memberId: m._id,
        name: m.name,
        phone: m.phone,
        company: m.company || '',
        category: m.category || '',
        status: 'absent',
      }));

    const totalActive = allActiveMembers.length;
    const presentCount = presentList.length;
    const lateCount = lateList.length;
    const absentCount = absentList.length;

    return res.status(200).json({
      success: true,
      date: targetDate,
      counts: {
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        total: totalActive,
      },
      meeting: {
        startTime: meeting?.startTime || settings.defaultStartTime || '08:00',
        graceMinutes: meeting?.graceMinutes ?? settings.graceMinutes ?? 0,
        status: meeting?.status || 'open',
      },
      present: presentList,
      late: lateList,
      absent: absentList,
      allAttended: [...presentList, ...lateList],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/attendance
 * Manually mark attendance (or update existing)
 */
export async function markManualAttendance(req, res, next) {
  try {
    const { memberId, date, status = 'present', notes = '' } = req.body;
    const meetingDate = date || getKolkataToday();

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID is required.',
      });
    }

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found.',
      });
    }

    // Upsert attendance record
    const attendance = await Attendance.findOneAndUpdate(
      { memberId, meetingDate },
      {
        $set: {
          status,
          method: 'admin',
          notes,
          checkInAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: `Marked ${member.name} as ${status}.`,
      attendance,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/attendance/:id
 * Delete an attendance record (marks member as absent)
 */
export async function deleteAttendance(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await Attendance.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance record removed successfully.',
    });
  } catch (error) {
    next(error);
  }
}
