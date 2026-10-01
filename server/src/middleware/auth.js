import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

export const ADMIN_COOKIE_NAME = 'admin_token';

/**
 * Middleware to verify Admin JWT authentication
 */
export async function requireAdmin(req, res, next) {
  try {
    let token = req.cookies?.[ADMIN_COOKIE_NAME];

    // Fallback to Bearer token in Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in as admin.',
      });
    }

    const secret = process.env.JWT_SECRET || 'super_secret_bni_jwt_key_jubilant_chennai_2026';
    const decoded = jwt.verify(token, secret);

    const admin = await Admin.findById(decoded.id).select('-passwordHash');
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin account not found or deactivated.',
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token.',
    });
  }
}
