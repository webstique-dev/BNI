import express from 'express';
import { z } from 'zod';
import {
  checkInByDevice,
  checkInByPhone,
  registerAndCheckIn,
  searchMembers,
  checkInBySearch,
  getPublicInfo,
  validateQr,
  forgetDevice,
} from '../controllers/checkinController.js';
import {
  generalCheckInLimiter,
  memberSearchLimiter,
  searchCheckInLimiter,
} from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Validation schemas
const phoneCheckInSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone must have at least 10 digits'),
  }),
});

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().min(10, 'Phone must have at least 10 digits'),
    company: z.string().optional(),
    category: z.string().optional(),
  }),
});

const searchCheckInSchema = z.object({
  body: z.object({
    memberId: z.string().min(1, 'Member ID is required'),
    phoneLast4: z.string().optional(),
    rememberDevice: z.boolean().optional(),
  }),
});

// Public info & QR validation
router.get('/public/info', getPublicInfo);
router.get('/checkin/validate-qr', validateQr);

// Device auto check-in (from QR landing page)
router.post('/checkin/device', generalCheckInLimiter, checkInByDevice);

// Phone check-in
router.post(
  '/checkin/phone',
  generalCheckInLimiter,
  validate(phoneCheckInSchema),
  checkInByPhone
);

// New member self-registration
router.post(
  '/checkin/register',
  generalCheckInLimiter,
  validate(registerSchema),
  registerAndCheckIn
);

// Search members by name (rate limited, no phone returned)
router.get('/members/search', memberSearchLimiter, searchMembers);

// Check-in via search
router.post(
  '/checkin/search',
  searchCheckInLimiter,
  validate(searchCheckInSchema),
  checkInBySearch
);

// Forget / unlink current device
router.post('/checkin/forget-device', forgetDevice);

export default router;
