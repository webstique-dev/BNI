import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import { ADMIN_COOKIE_NAME } from '../middleware/auth.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getAdminCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  };
}

/**
 * POST /api/admin/login
 */
export async function adminLogin(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username and password.',
      });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    const secret = process.env.JWT_SECRET || 'super_secret_bni_jwt_key_jubilant_chennai_2026';
    const token = jwt.sign(
      { id: admin._id, username: admin.username, name: admin.name },
      secret,
      { expiresIn: '7d' }
    );

    res.cookie(ADMIN_COOKIE_NAME, token, getAdminCookieOptions());

    return res.status(200).json({
      success: true,
      token, // Provide token for Authorization header storage
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/logout
 */
export async function adminLogout(req, res, next) {
  try {
    res.clearCookie(ADMIN_COOKIE_NAME, getAdminCookieOptions());
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/me
 */
export async function getAdminMe(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      admin: {
        id: req.admin._id,
        username: req.admin.username,
        name: req.admin.name,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/admins
 * List all admin accounts
 */
export async function getAdmins(req, res, next) {
  try {
    const admins = await Admin.find().select('-passwordHash').sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      admins,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/admins
 * Create a new admin account
 */
export async function createAdmin(req, res, next) {
  try {
    const { username, password, name } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long.',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const cleanUsername = username.toLowerCase().trim();
    const existing = await Admin.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Admin username "${cleanUsername}" already exists.`,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newAdmin = await Admin.create({
      username: cleanUsername,
      passwordHash,
      name: name?.trim() || 'Chapter Admin',
    });

    return res.status(201).json({
      success: true,
      message: `Admin account "${cleanUsername}" created successfully.`,
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        name: newAdmin.name,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/admins/:id
 * Delete an admin account
 */
export async function deleteAdmin(req, res, next) {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (req.admin._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account while logged in.',
      });
    }

    // Ensure at least 1 admin remains
    const adminCount = await Admin.countDocuments();
    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the only remaining admin account.',
      });
    }

    const deleted = await Admin.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Admin account "${deleted.username}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
}

