import { stringify } from 'csv-stringify/sync';
import Attendance from '../models/Attendance.js';
import Member from '../models/Member.js';
import Meeting from '../models/Meeting.js';
import { getKolkataToday, formatKolkataTime } from '../utils/time.js';

/**
 * GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function getAttendanceReports(req, res, next) {
  try {
    const today = getKolkataToday();
    const fromDate = req.query.from || today;
    const toDate = req.query.to || today;

    // 1. Find all distinct meeting dates that have occurred in range
    // Check both Meeting records and distinct meetingDate in Attendance
    const distinctAttendanceDates = await Attendance.distinct('meetingDate', {
      meetingDate: { $gte: fromDate, $lte: toDate },
    });

    const distinctMeetingDates = await Meeting.distinct('date', {
      date: { $gte: fromDate, $lte: toDate },
    });

    // Combine and sort unique dates
    const allDatesSet = new Set([...distinctAttendanceDates, ...distinctMeetingDates]);
    // If range is today and no records yet, at least count today as 1 meeting date
    if (allDatesSet.size === 0 && fromDate === toDate) {
      allDatesSet.add(fromDate);
    }
    const meetingDates = Array.from(allDatesSet).sort();
    const totalMeetings = meetingDates.length || 1;

    // 2. Fetch all active members
    const members = await Member.find({ isActive: true }).sort({ name: 1 }).lean();

    // 3. Fetch all attendance records in range
    const attendances = await Attendance.find({
      meetingDate: { $gte: fromDate, $lte: toDate },
    }).lean();

    // 4. Calculate per member stats
    // memberId -> { present: 0, late: 0, totalAttended: 0 }
    const statsMap = new Map();

    attendances.forEach((att) => {
      const mId = att.memberId.toString();
      if (!statsMap.has(mId)) {
        statsMap.set(mId, { present: 0, late: 0, totalAttended: 0 });
      }
      const st = statsMap.get(mId);
      if (att.status === 'late') {
        st.late += 1;
      } else {
        st.present += 1;
      }
      st.totalAttended += 1;
    });

    let overallPresentCount = 0;
    let overallLateCount = 0;
    let overallAbsentCount = 0;

    const memberReports = members.map((m) => {
      const st = statsMap.get(m._id.toString()) || { present: 0, late: 0, totalAttended: 0 };
      const attended = st.totalAttended;
      const late = st.late;
      const onTime = st.present;
      const absent = Math.max(0, totalMeetings - attended);
      const percentage = totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 0;

      overallPresentCount += onTime;
      overallLateCount += late;
      overallAbsentCount += absent;

      return {
        memberId: m._id,
        name: m.name,
        phone: m.phone,
        company: m.company || '',
        category: m.category || '',
        totalMeetings,
        onTimeCount: onTime,
        lateCount: late,
        totalAttended: attended,
        absentCount: absent,
        attendancePercentage: percentage,
      };
    });

    const totalPossibleSlots = members.length * totalMeetings;
    const overallAttendedSlots = overallPresentCount + overallLateCount;
    const overallRate = totalPossibleSlots > 0 ? Math.round((overallAttendedSlots / totalPossibleSlots) * 100) : 0;

    return res.status(200).json({
      success: true,
      range: { from: fromDate, to: toDate },
      meetingDates,
      totalMeetings,
      summary: {
        totalMembers: members.length,
        totalMeetings,
        overallRate,
        totalPresent: overallPresentCount,
        totalLate: overallLateCount,
        totalAbsent: overallAbsentCount,
      },
      reports: memberReports,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/reports/export.csv
 * Export report as CSV
 */
export async function exportReportCsv(req, res, next) {
  try {
    const today = getKolkataToday();
    const fromDate = req.query.from || today;
    const toDate = req.query.to || today;
    const type = req.query.type || 'summary'; // 'summary' or 'daily'

    if (type === 'daily') {
      const date = req.query.date || today;
      const allActiveMembers = await Member.find({ isActive: true }).sort({ name: 1 }).lean();
      const attendances = await Attendance.find({ meetingDate: date }).populate('memberId').lean();

      const attendanceMap = new Map();
      attendances.forEach((att) => {
        if (att.memberId) {
          attendanceMap.set(att.memberId._id.toString(), att);
        }
      });

      const rows = allActiveMembers.map((m) => {
        const att = attendanceMap.get(m._id.toString());
        return {
          'Member Name': m.name,
          'Phone': m.phone,
          'Company': m.company || '',
          'Classification': m.category || '',
          'Date': date,
          'Status': att ? att.status.toUpperCase() : 'ABSENT',
          'Check-in Time': att ? formatKolkataTime(att.checkInAt) : 'N/A',
          'Method': att ? att.method : 'N/A',
          'Notes': att?.notes || '',
        };
      });

      const csvString = stringify(rows, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="BNI_Attendance_${date}.csv"`);
      return res.status(200).send(csvString);
    }

    // Default: Aggregate Summary Range Export
    const distinctAttendanceDates = await Attendance.distinct('meetingDate', {
      meetingDate: { $gte: fromDate, $lte: toDate },
    });
    const distinctMeetingDates = await Meeting.distinct('date', {
      date: { $gte: fromDate, $lte: toDate },
    });
    const allDatesSet = new Set([...distinctAttendanceDates, ...distinctMeetingDates]);
    if (allDatesSet.size === 0 && fromDate === toDate) allDatesSet.add(fromDate);
    const totalMeetings = allDatesSet.size || 1;

    const members = await Member.find({ isActive: true }).sort({ name: 1 }).lean();
    const attendances = await Attendance.find({
      meetingDate: { $gte: fromDate, $lte: toDate },
    }).lean();

    const statsMap = new Map();
    attendances.forEach((att) => {
      const mId = att.memberId.toString();
      if (!statsMap.has(mId)) {
        statsMap.set(mId, { present: 0, late: 0, totalAttended: 0 });
      }
      const st = statsMap.get(mId);
      if (att.status === 'late') st.late += 1;
      else st.present += 1;
      st.totalAttended += 1;
    });

    const rows = members.map((m) => {
      const st = statsMap.get(m._id.toString()) || { present: 0, late: 0, totalAttended: 0 };
      const attended = st.totalAttended;
      const late = st.late;
      const onTime = st.present;
      const absent = Math.max(0, totalMeetings - attended);
      const percentage = totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 0;

      return {
        'Member Name': m.name,
        'Phone': m.phone,
        'Company': m.company || '',
        'Classification': m.category || '',
        'Total Meetings': totalMeetings,
        'On Time (Present)': onTime,
        'Late': late,
        'Total Attended': attended,
        'Absent': absent,
        'Attendance %': `${percentage}%`,
      };
    });

    const csvString = stringify(rows, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="BNI_Attendance_Report_${fromDate}_to_${toDate}.csv"`
    );
    return res.status(200).send(csvString);
  } catch (error) {
    next(error);
  }
}
