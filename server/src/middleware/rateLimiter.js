import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for Admin Login attempts
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
});

/**
 * Rate limiter for Public Search Check-in (Prevent brute force guessing)
 */
export const searchCheckInLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Max 10 check-in attempts per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many search check-in attempts. Please wait a minute and try again.',
  },
});

/**
 * Rate limiter for Public Member Search Query
 */
export const memberSearchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 40, // 40 live search queries per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many search requests. Please slow down.',
  },
});

/**
 * General Public Check-in rate limiter
 */
export const generalCheckInLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many check-in requests. Please try again shortly.',
  },
});
