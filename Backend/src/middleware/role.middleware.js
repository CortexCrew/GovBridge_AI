/**
 * Role Guard Middleware Factory
 *
 * Usage:
 *   const { requireRole } = require('./role.middleware');
 *   router.patch('/review', authMiddleware, requireRole('OFFICER'), controller.review);
 *
 * Requires authMiddleware to have already run and populated req.user.
 */

/**
 * Returns a middleware that allows access only if req.user.role matches
 * one of the provided allowed roles.
 * @param {...string} roles - One or more allowed role strings (e.g. 'OFFICER', 'CITIZEN')
 * @returns {function} Express middleware
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
}

module.exports = { requireRole };
