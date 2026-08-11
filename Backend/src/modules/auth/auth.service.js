const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const env = require('../../config/env');
const otpRepository = require('./otp.repository');
const userRepository = require('./user.repository');

class AuthService {
  /**
   * Helper to validate email or phone number input
   */
  validateIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string' || identifier.trim() === '') {
      throw new Error('Email or Mobile phone number is required');
    }

    const clean = identifier.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[1-9]\d{7,14}$/; // E.164 phone format check

    const isEmail = emailRegex.test(clean);
    const isPhone = phoneRegex.test(clean.replace(/[\s-]/g, ''));

    if (!isEmail && !isPhone) {
      throw new Error('Please enter a valid email address or phone number (e.g. +1234567890)');
    }

    return { cleanIdentifier: clean, isEmail };
  }

  /**
   * Send OTP to Email or Phone Number
   */
  async sendOTP(identifier) {
    const { cleanIdentifier, isEmail } = this.validateIdentifier(identifier);

    // Generate random 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMs = env.OTP_EXPIRY_MINUTES * 60 * 1000;
    const expiresAt = Date.now() + expiryMs;

    // Store in OTP Repository
    await otpRepository.saveOTP(cleanIdentifier, otpCode, expiresAt);

    // ALWAYS log OTP to console for easy local testing & debugging
    console.log(`\n========================================`);
    console.log(`[OTP DISPATCH] Destination: ${cleanIdentifier}`);
    console.log(`[OTP DISPATCH] OTP Code   : ${otpCode}`);
    console.log(`[OTP DISPATCH] Expires in : ${env.OTP_EXPIRY_MINUTES} minute(s)`);
    console.log(`========================================\n`);

    // Dispatch via Nodemailer if SMTP credentials exist
    console.log(`[DEBUG] isEmail: ${isEmail}, EMAIL_USER: "${env.EMAIL_USER}", EMAIL_PASS exists: ${!!env.EMAIL_PASS}`);
    if (isEmail && env.EMAIL_USER && env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: env.EMAIL_HOST,
          port: env.EMAIL_PORT,
          secure: env.EMAIL_PORT === 465,
          auth: {
            user: env.EMAIL_USER,
            pass: env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: `"GovBridge Verification" <${env.EMAIL_USER}>`,
          to: cleanIdentifier,
          subject: 'Your GovBridge Login Verification Code',
          text: `Your OTP for GovBridge login is: ${otpCode}. It will expire in ${env.OTP_EXPIRY_MINUTES} minutes.`,
          html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>GovBridge Verification Code</h2>
            <p>Your OTP for login is: <strong style="font-size: 24px; color: #2563eb;">${otpCode}</strong></p>
            <p>This code will expire in ${env.OTP_EXPIRY_MINUTES} minutes.</p>
          </div>`
        });
        console.log(`[Nodemailer] Successfully sent OTP email to ${cleanIdentifier}`);
      } catch (mailErr) {
        console.error(`[Nodemailer Error] Failed to send email to ${cleanIdentifier}:`, mailErr.message);
      }
    }

    return {
      success: true,
      message: `OTP sent successfully to ${cleanIdentifier}`,
      expiresInMinutes: env.OTP_EXPIRY_MINUTES
    };
  }

  /**
   * Verify OTP and return JWT token
   */
  async verifyOTP(identifier, otpCode) {
    const { cleanIdentifier } = this.validateIdentifier(identifier);

    if (!otpCode || typeof otpCode !== 'string' || otpCode.trim() === '') {
      throw new Error('OTP code is required');
    }

    const isValid = await otpRepository.verifyOTP(cleanIdentifier, otpCode.trim());

    if (!isValid) {
      return {
        success: false,
        message: 'Invalid or expired OTP code. Please try again or request a new OTP.'
      };
    }

    // Find or create user record
    const user = await userRepository.findOrCreateByIdentifier(cleanIdentifier);

    // Delete used OTP
    await otpRepository.deleteOTP(cleanIdentifier);

    // Generate JWT token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role || 'citizen'
    };

    const token = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '7d' });

    return {
      success: true,
      message: 'Login successful',
      token,
      user
    };
  }
}

module.exports = new AuthService();
