const authService = require('./auth.service');

class AuthController {
  /**
   * Controller for citizen registration
   */
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return res.status(201).json(result);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Registration failed'
      });
    }
  }

  /**
   * Controller for citizen login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: err.message || 'Login failed'
      });
    }
  }

  /**
   * Controller to get currently authenticated user profile
   */
  async getProfile(req, res, next) {
    try {
      // Extract user_id from authenticated req.user (populated by authMiddleware)
      const userId = req.user && req.user.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized. User ID missing from session.'
        });
      }

      const result = await authService.getProfile(userId);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to retrieve user profile'
      });
    }
  }
}

module.exports = new AuthController();
