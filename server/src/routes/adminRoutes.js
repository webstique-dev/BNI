import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  adminLogin,
  adminLogout,
  getAdminMe,
} from '../controllers/adminAuthController.js';
import {
  getAttendanceByDate,
  markManualAttendance,
  deleteAttendance,
} from '../controllers/adminAttendanceController.js';
import {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  toggleMemberActive,
  deleteMember,
  resetMemberDevices,
  importMembersCsv,
} from '../controllers/adminMembersController.js';
import {
  getSettings,
  updateSettings,
} from '../controllers/adminSettingsController.js';
import {
  getAttendanceReports,
  exportReportCsv,
} from '../controllers/adminReportsController.js';
import { requireAdmin } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const router = express.Router();

// Validation schemas
const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const memberSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().min(10, 'Valid phone number required'),
    company: z.string().optional(),
    category: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const manualAttendanceSchema = z.object({
  body: z.object({
    memberId: z.string().min(1, 'Member ID is required'),
    date: z.string().optional(),
    status: z.enum(['present', 'late']).default('present'),
    notes: z.string().optional(),
  }),
});

// Authentication endpoints
router.post('/admin/login', loginLimiter, validate(loginSchema), adminLogin);
router.post('/admin/logout', adminLogout);
router.get('/admin/me', requireAdmin, getAdminMe);

// Attendance endpoints
router.get('/admin/attendance', requireAdmin, getAttendanceByDate);
router.post('/admin/attendance', requireAdmin, validate(manualAttendanceSchema), markManualAttendance);
router.delete('/admin/attendance/:id', requireAdmin, deleteAttendance);

// Member CRUD & Device Management
router.get('/admin/members', requireAdmin, getMembers);
router.get('/admin/members/:id', requireAdmin, getMemberById);
router.post('/admin/members', requireAdmin, validate(memberSchema), createMember);
router.put('/admin/members/:id', requireAdmin, updateMember);
router.patch('/admin/members/:id/toggle-active', requireAdmin, toggleMemberActive);
router.delete('/admin/members/:id', requireAdmin, deleteMember);
router.post('/admin/members/:id/reset-devices', requireAdmin, resetMemberDevices);
router.post('/admin/members/import-csv', requireAdmin, upload.single('file'), importMembersCsv);

// Settings
router.get('/admin/settings', requireAdmin, getSettings);
router.put('/admin/settings', requireAdmin, updateSettings);

// Reports & Export
router.get('/admin/reports', requireAdmin, getAttendanceReports);
router.get('/admin/reports/export.csv', requireAdmin, exportReportCsv);

export default router;
