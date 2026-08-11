const authService = require('./auth.service');

class AuthController {
  /**
   * Controller to request/send an OTP
   */
  async sendOtp(req, res, next) {
    try {
      const { identifier, email, phone } = req.body;
      const targetIdentifier = identifier || email || phone;

      const result = await authService.sendOTP(targetIdentifier);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to send OTP'
      });
    }
  }

  /**
   * Controller to verify OTP and log in user
   */
  async verifyOtp(req, res, next) {
    try {
      const { identifier, email, phone, otp, code } = req.body;
      const targetIdentifier = identifier || email || phone;
      const targetOtp = otp || code;

      const result = await authService.verifyOTP(targetIdentifier, targetOtp);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to verify OTP'
      });
    }
  }
}

module.exports = new AuthController();
