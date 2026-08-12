const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header (Bearer <token>)
 * Attaches decoded user payload ({ user_id, email, role }) to req.user
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authorization token missing or malformed.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const reqUser = {
      email: decoded.email,
      role: decoded.role || 'CITIZEN'
    };

    if (decoded.user_id !== undefined && decoded.user_id !== null) {
      reqUser.user_id = decoded.user_id;
    }

    if (decoded.officer_id !== undefined && decoded.officer_id !== null) {
      reqUser.officer_id = decoded.officer_id;
    }

    req.user = reqUser;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.'
    });
  }
}

module.exports = authMiddleware;
