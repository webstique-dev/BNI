import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';

/**
 * Returns current dayjs instance in Asia/Kolkata timezone
 */
export function getKolkataNow() {
  return dayjs().tz(TIMEZONE);
}

/**
 * Returns today's date in 'YYYY-MM-DD' formatted string in Asia/Kolkata
 */
export function getKolkataToday() {
  return getKolkataNow().format('YYYY-MM-DD');
}

/**
 * Parses any date into Asia/Kolkata dayjs object
 * @param {Date|string|number} date
 */
export function toKolkata(date) {
  if (!date) return getKolkataNow();
  return dayjs(date).tz(TIMEZONE);
}

/**
 * Formats time into human readable format, e.g. "07:45 AM"
 * @param {Date|string|number} date
 */
export function formatKolkataTime(date) {
  if (!date) return '';
  return dayjs(date).tz(TIMEZONE).format('h:mm A');
}

/**
 * Formats date into 'YYYY-MM-DD' format
 * @param {Date|string|number} date
 */
export function formatKolkataDate(date) {
  if (!date) return getKolkataToday();
  return dayjs(date).tz(TIMEZONE).format('YYYY-MM-DD');
}

/**
 * Determines whether a check-in is "late" or "present"
 * Late = check-in time > (meeting startTime + graceMinutes)
 * 
 * @param {Date|string} checkInDate - Actual timestamp of check-in
 * @param {string} meetingDateStr - 'YYYY-MM-DD'
 * @param {string} startTimeStr - 'HH:mm' default '08:00'
 * @param {number} graceMinutes - Number of grace minutes (default 0)
 * @returns {'present'|'late'}
 */
export function calculateAttendanceStatus(
  checkInDate,
  meetingDateStr = getKolkataToday(),
  startTimeStr = '08:00',
  graceMinutes = 0
) {
  const checkInKolkata = toKolkata(checkInDate);
  
  // Create cutoff time for the meeting date in Asia/Kolkata
  const [hours, minutes] = startTimeStr.split(':').map(Number);
  const cutoffTime = dayjs.tz(meetingDateStr, TIMEZONE)
    .hour(hours)
    .minute(minutes + (Number(graceMinutes) || 0))
    .second(0)
    .millisecond(0);

  // If checkIn time is strictly after the cutoff time, it's late
  return checkInKolkata.isAfter(cutoffTime) ? 'late' : 'present';
}

export default dayjs;
