import ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
import Attendance from '../models/Attendance.js';
import Member from '../models/Member.js';
import Meeting from '../models/Meeting.js';
import Settings from '../models/Settings.js';
import { getKolkataToday, formatKolkataTime, getKolkataNow } from '../utils/time.js';

/**
 * GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function getAttendanceReports(req, res, next) {
  try {
    const today = getKolkataToday();
    const fromDate = req.query.from || today;
    const toDate = req.query.to || today;

    // 1. Find all distinct meeting dates that have occurred in range
    const distinctAttendanceDates = await Attendance.distinct('meetingDate', {
      meetingDate: { $gte: fromDate, $lte: toDate },
    });

    const distinctMeetingDates = await Meeting.distinct('date', {
      date: { $gte: fromDate, $lte: toDate },
    });

    // Combine and sort unique dates
    const allDatesSet = new Set([...distinctAttendanceDates, ...distinctMeetingDates]);
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
 * GET /api/admin/reports/export.xlsx or /api/admin/reports/export
 * Beautiful Excel export with ExcelJS (BNI Red/Gold Theme, Badges, KPIs, Auto Column Widths)
 */
export async function exportReportExcel(req, res, next) {
  try {
    const today = getKolkataToday();
    const fromDate = req.query.from || today;
    const toDate = req.query.to || today;
    const type = req.query.type || (req.query.date ? 'daily' : 'summary');
    const settings = await Settings.getSettings();
    const chapterTitle = settings.chapterName || 'BNI Jubilant – Chennai CBD A';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BNI Attendance System';
    workbook.created = new Date();

    const BNI_RED = 'CF2030';
    const BNI_CHARCOAL = '1C1917';
    const BNI_GOLD = 'C9A24B';
    const BNI_CREAM = 'FBF8F3';

    if (type === 'daily') {
      const date = req.query.date || today;
      const allActiveMembers = await Member.find({ isActive: true }).sort({ name: 1 }).lean();
      const attendances = await Attendance.find({ meetingDate: date }).populate('memberId').lean();

      const attendanceMap = new Map();
      let presentCount = 0;
      let lateCount = 0;

      attendances.forEach((att) => {
        if (att.memberId) {
          attendanceMap.set(att.memberId._id.toString(), att);
          if (att.status === 'late') lateCount++;
          else presentCount++;
        }
      });

      const totalMembers = allActiveMembers.length;
      const totalAttended = presentCount + lateCount;
      const absentCount = Math.max(0, totalMembers - totalAttended);
      const turnoutPct = totalMembers > 0 ? Math.round((totalAttended / totalMembers) * 100) : 0;

      const worksheet = workbook.addWorksheet('Daily Attendance', {
        views: [{ showGridLines: true, state: 'frozen', ySplit: 7 }],
      });

      // 1. Header Banner
      worksheet.mergeCells('A1:G1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `${chapterTitle.toUpperCase()} · DAILY ATTENDANCE`;
      titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BNI_RED } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 32;

      // 2. Subtitle / Timestamp
      worksheet.mergeCells('A2:G2');
      const subtitleCell = worksheet.getCell('A2');
      subtitleCell.value = `Meeting Date: ${date}   |   Exported: ${getKolkataNow().format('DD MMM YYYY, h:mm A')} IST`;
      subtitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(2).height = 20;

      // 3. KPI Summary Row
      worksheet.getRow(4).values = [
        'Total Active Members',
        'Present (On Time)',
        'Late Arrivals',
        'Total Attended',
        'Absent Members',
        'Turnout Rate',
      ];
      worksheet.getRow(5).values = [
        totalMembers,
        presentCount,
        lateCount,
        totalAttended,
        absentCount,
        `${turnoutPct}%`,
      ];

      ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col) => {
        const hCell = worksheet.getCell(`${col}4`);
        const vCell = worksheet.getCell(`${col}5`);

        hCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF555555' } };
        hCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        hCell.alignment = { horizontal: 'center', vertical: 'middle' };
        hCell.border = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } } };

        vCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1C1917' } };
        vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        vCell.alignment = { horizontal: 'center', vertical: 'middle' };
        vCell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
      });
      worksheet.getRow(4).height = 18;
      worksheet.getRow(5).height = 24;

      // 4. Table Header
      const headerRowIndex = 7;
      const headers = [
        'S.No',
        'Member Name',
        'Phone Number',
        'Attendance Status',
        'Check-in Time',
        'Method',
        'Notes',
      ];
      const headerRow = worksheet.getRow(headerRowIndex);
      headerRow.values = headers;
      headerRow.height = 26;

      headers.forEach((_, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BNI_CHARCOAL } };
        cell.alignment = { vertical: 'middle', horizontal: idx === 0 || idx === 3 || idx === 4 ? 'center' : 'left' };
        cell.border = {
          top: { style: 'medium', color: { argb: BNI_GOLD } },
          bottom: { style: 'medium', color: { argb: BNI_GOLD } },
        };
      });

      // 5. Data Rows
      allActiveMembers.forEach((m, idx) => {
        const att = attendanceMap.get(m._id.toString());
        const status = att ? att.status.toUpperCase() : 'ABSENT';
        const checkInTime = att ? formatKolkataTime(att.checkInAt) : '—';
        const method = att ? (att.method === 'device' ? 'QR Scan (Device)' : att.method === 'phone' ? 'Phone Number' : att.method === 'search' ? 'Member Search' : 'Admin Override') : '—';
        const notes = att?.notes || '';

        const row = worksheet.addRow([
          idx + 1,
          m.name,
          m.phone,
          status,
          checkInTime,
          method,
          notes,
        ]);

        row.height = 22;
        const isEven = idx % 2 === 0;

        row.eachCell((cell, colNum) => {
          cell.font = { name: 'Calibri', size: 10.5 };
          cell.alignment = {
            vertical: 'middle',
            horizontal: colNum === 1 || colNum === 4 || colNum === 5 ? 'center' : 'left',
          };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          };

          // Default zebra fill
          if (isEven) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAF9' } };
          }

          // Status Badge styling
          if (colNum === 4) {
            if (status === 'PRESENT') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF065F46' } };
            } else if (status === 'LATE') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF92400E' } };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF9F1239' } };
            }
          }
        });
      });

      // Auto-fit column widths
      worksheet.columns = [
        { width: 8 },  // S.No
        { width: 30 }, // Name
        { width: 18 }, // Phone
        { width: 20 }, // Status
        { width: 18 }, // Time
        { width: 24 }, // Method
        { width: 28 }, // Notes
      ];

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="BNI_Attendance_${date}.xlsx"`);
      return workbook.xlsx.write(res).then(() => res.end());
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
    let overallPresent = 0;
    let overallLate = 0;

    attendances.forEach((att) => {
      const mId = att.memberId.toString();
      if (!statsMap.has(mId)) {
        statsMap.set(mId, { present: 0, late: 0, totalAttended: 0 });
      }
      const st = statsMap.get(mId);
      if (att.status === 'late') {
        st.late += 1;
        overallLate += 1;
      } else {
        st.present += 1;
        overallPresent += 1;
      }
      st.totalAttended += 1;
    });

    const worksheet = workbook.addWorksheet('Attendance Summary', {
      views: [{ showGridLines: true, state: 'frozen', ySplit: 7 }],
    });

    // 1. Header Banner
    worksheet.mergeCells('A1:I1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `${chapterTitle.toUpperCase()} · ATTENDANCE SUMMARY REPORT`;
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BNI_RED } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 32;

    // 2. Subtitle / Range
    worksheet.mergeCells('A2:I2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = `Date Range: ${fromDate} to ${toDate} (${totalMeetings} Meeting Day${totalMeetings > 1 ? 's' : ''})   |   Generated: ${getKolkataNow().format('DD MMM YYYY, h:mm A')} IST`;
    subtitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    // 3. Summary KPIs
    const totalPossibleSlots = members.length * totalMeetings;
    const overallAttendedSlots = overallPresent + overallLate;
    const overallRate = totalPossibleSlots > 0 ? Math.round((overallAttendedSlots / totalPossibleSlots) * 100) : 0;

    worksheet.getRow(4).values = [
      'Total Members',
      'Meeting Days',
      'Present (On Time)',
      'Late Arrivals',
      'Total Attended',
      'Overall Attendance %',
    ];
    worksheet.getRow(5).values = [
      members.length,
      totalMeetings,
      overallPresent,
      overallLate,
      overallAttendedSlots,
      `${overallRate}%`,
    ];

    ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col) => {
      const hCell = worksheet.getCell(`${col}4`);
      const vCell = worksheet.getCell(`${col}5`);

      hCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF555555' } };
      hCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      hCell.alignment = { horizontal: 'center', vertical: 'middle' };
      hCell.border = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } } };

      vCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1C1917' } };
      vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      vCell.alignment = { horizontal: 'center', vertical: 'middle' };
      vCell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
    });
    worksheet.getRow(4).height = 18;
    worksheet.getRow(5).height = 24;

    // 4. Headers
    const headerRowIndex = 7;
    const headers = [
      'S.No',
      'Member Name',
      'Phone Number',
      'Total Meetings',
      'On Time (Present)',
      'Late',
      'Total Attended',
      'Absent',
      'Attendance %',
    ];

    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.values = headers;
    headerRow.height = 26;

    headers.forEach((_, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BNI_CHARCOAL } };
      cell.alignment = { vertical: 'middle', horizontal: idx === 0 || idx >= 3 ? 'center' : 'left' };
      cell.border = {
        top: { style: 'medium', color: { argb: BNI_GOLD } },
        bottom: { style: 'medium', color: { argb: BNI_GOLD } },
      };
    });

    // 5. Data Rows
    members.forEach((m, idx) => {
      const st = statsMap.get(m._id.toString()) || { present: 0, late: 0, totalAttended: 0 };
      const attended = st.totalAttended;
      const late = st.late;
      const onTime = st.present;
      const absent = Math.max(0, totalMeetings - attended);
      const percentage = totalMeetings > 0 ? Math.round((attended / totalMeetings) * 100) : 0;

      const row = worksheet.addRow([
        idx + 1,
        m.name,
        m.phone,
        totalMeetings,
        onTime,
        late,
        attended,
        absent,
        `${percentage}%`,
      ]);

      row.height = 22;
      const isEven = idx % 2 === 0;

      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: 10.5 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNum === 1 || colNum >= 4 ? 'center' : 'left',
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };

        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAF9' } };
        }

        // Colorize Attendance %
        if (colNum === 9) {
          if (percentage >= 80) {
            cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF065F46' } };
          } else if (percentage >= 60) {
            cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF92400E' } };
          } else {
            cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF9F1239' } };
          }
        }
      });
    });

    worksheet.columns = [
      { width: 8 },  // S.No
      { width: 30 }, // Name
      { width: 18 }, // Phone
      { width: 16 }, // Total Meetings
      { width: 18 }, // On Time
      { width: 12 }, // Late
      { width: 16 }, // Total Attended
      { width: 12 }, // Absent
      { width: 16 }, // %
    ];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="BNI_Attendance_Report_${fromDate}_to_${toDate}.xlsx"`
    );
    return workbook.xlsx.write(res).then(() => res.end());
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
    const type = req.query.type || (req.query.date ? 'daily' : 'summary');

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

