import crypto from 'crypto';

/**
 * Generates a cryptographically secure random token (32 bytes hex)
 * @returns {string} 64-char hex string
 */
export function generateRandomToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes SHA-256 hash of a raw token string
 * @param {string} token
 * @returns {string} SHA-256 hex string
 */
export function hashToken(token) {
  if (!token) return '';
  return crypto.createHash('sha256').update(token).digest('hex');
}
