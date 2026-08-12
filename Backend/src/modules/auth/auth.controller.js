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

  /**
   * Controller for listing all users (admin only)
   */
  async getAllUsers(req, res, next) {
    try {
      const result = await authService.getAllUsers();
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to retrieve users'
      });
    }
  }

  /**
   * Controller to retrieve a user by user ID
   */
  async getUserById(req, res, next) {
    try {
      const requesterId = req.user && req.user.user_id;
      const requesterRole = req.user && req.user.role;
      const targetUserId = Number(req.params.id);

      if (!targetUserId || Number.isNaN(targetUserId)) {
        return res.status(400).json({
          success: false,
          message: 'A valid user ID is required.'
        });
      }

      const result = await authService.getUserById(targetUserId, requesterId, requesterRole);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Failed to retrieve user'
      });
    }
  }

  /**
   * Controller to update the current authenticated user profile
   */
  async updateProfile(req, res, next) {
    try {
      const requesterId = req.user && req.user.user_id;
      const requesterRole = req.user && req.user.role;

      const result = await authService.updateProfile(requesterId, req.body, requesterId, requesterRole);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to update profile'
      });
    }
  }

  /**
   * Controller to update a user by ID
   */
  async updateUser(req, res, next) {
    try {
      const requesterId = req.user && req.user.user_id;
      const requesterRole = req.user && req.user.role;
      const targetUserId = Number(req.params.id);

      if (!targetUserId || Number.isNaN(targetUserId)) {
        return res.status(400).json({
          success: false,
          message: 'A valid user ID is required.'
        });
      }

      const result = await authService.updateProfile(targetUserId, req.body, requesterId, requesterRole);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Failed to update user'
      });
    }
  }

  /**
   * Controller to delete the current authenticated account
   */
  async deleteAccount(req, res, next) {
    try {
      const requesterId = req.user && req.user.user_id;
      const requesterRole = req.user && req.user.role;

      const result = await authService.deleteUser(requesterId, requesterId, requesterRole);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Failed to delete account'
      });
    }
  }

  /**
   * Controller to delete a user by ID
   */
  async deleteUser(req, res, next) {
    try {
      const requesterId = req.user && req.user.user_id;
      const requesterRole = req.user && req.user.role;
      const targetUserId = Number(req.params.id);

      if (!targetUserId || Number.isNaN(targetUserId)) {
        return res.status(400).json({
          success: false,
          message: 'A valid user ID is required.'
        });
      }

      const result = await authService.deleteUser(targetUserId, requesterId, requesterRole);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Failed to delete user'
      });
    }
  }
}

module.exports = new AuthController();
