import jwt from 'jsonwebtoken';
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
      token, // Also provide token for non-cookie / header clients if needed
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
