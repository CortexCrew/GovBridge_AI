const authService = require('./auth.service');

class AuthController {
  /**
   * Send OTP to requested email or phone for registration
   * POST /api/auth/send-otp
   */
  async sendOtp(req, res, next) {
    try {
      const result = await authService.sendOtp(req.body);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to send OTP',
      });
    }
  }

  /**
   * Verify OTP and finalize citizen registration
   * POST /api/auth/verify-otp
   */
  async verifyOtp(req, res, next) {
    try {
      const { identifier, otpCode, otp, email, phone } = req.body || {};
      const targetId = identifier || email || phone;
      const result = await authService.verifyOtp(targetId, otpCode || otp);
      return res.status(201).json(result);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'OTP verification failed',
      });
    }
  }

  /**
   * Controller for citizen registration (initiates OTP or verifies if otpCode is present)
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      const statusCode = req.body && req.body.otpCode ? 201 : 200;
      return res.status(statusCode).json(result);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Registration failed',
      });
    }
  }

  /**
   * Controller for citizen login (Email OR Phone + Password)
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: err.message || 'Login failed',
      });
    }
  }

  async requestPasswordChange(req, res, next) {
    try {
      return res.status(200).json(await authService.requestPasswordChange(req.user));
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
  }

  async confirmPasswordChange(req, res, next) {
    try {
      const { otpCode, newPassword } = req.body || {};
      return res.status(200).json(await authService.confirmPasswordChange(req.user, otpCode, newPassword));
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
  }

  async requestPasswordReset(req, res, next) {
    try {
      const { identifier, role } = req.body || {};
      return res.status(200).json(await authService.requestPasswordReset(identifier, role));
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
  }

  async confirmPasswordReset(req, res, next) {
    try {
      const { identifier, role, otpCode, newPassword } = req.body || {};
      return res.status(200).json(await authService.confirmPasswordReset(identifier, role, otpCode, newPassword));
    } catch (err) {
      return res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }
  }

  /**
   * Controller to get currently authenticated user profile
   * GET /api/auth/me  OR  GET /api/auth/profile
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user && req.user.user_id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized. User ID missing from session.',
        });
      }

      const result = await authService.getProfile(userId);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to retrieve user profile',
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
        message: err.message || 'Failed to retrieve users',
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
          message: 'A valid user ID is required.',
        });
      }

      const result = await authService.getUserById(targetUserId, requesterId, requesterRole);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Failed to retrieve user',
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
        message: err.message || 'Failed to update profile',
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
          message: 'A valid user ID is required.',
        });
      }

      const result = await authService.updateProfile(targetUserId, req.body, requesterId, requesterRole);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Failed to update user',
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
        message: err.message || 'Failed to delete account',
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
          message: 'A valid user ID is required.',
        });
      }

      const result = await authService.deleteUser(targetUserId, requesterId, requesterRole);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(403).json({
        success: false,
        message: err.message || 'Failed to delete user',
      });
    }
  }
}

module.exports = new AuthController();
