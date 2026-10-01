/**
 * Phone number utilities for BNI Attendance
 * Normalizes phone numbers to standard 10 digits
 */

/**
 * Normalizes any phone number input by removing all non-digit characters
 * and retaining the last 10 digits (standard Indian mobile format).
 * @param {string|number} phone - Raw input phone number
 * @returns {string|null} - 10-digit normalized phone string or null if invalid
 */
export function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/**
 * Validates if the normalized phone is a valid 10-digit number.
 * Indian mobile numbers start with 6, 7, 8, or 9 (though we can accept any 10-digit number).
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  return /^[5-9]\d{9}$/.test(normalized);
}

/**
 * Masks phone number for display (e.g. "******7890")
 * @param {string} phone
 * @returns {string}
 */
export function maskPhone(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return '**********';
  return '******' + normalized.slice(-4);
}
