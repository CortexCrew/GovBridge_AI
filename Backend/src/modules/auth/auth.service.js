const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../../config/env');
const userRepository = require('./user.repository');
const otpRepository = require('./otp.repository');
const {
  normalizeEmail,
  normalizeIndianPhone,
  parseIdentifier,
  validatePassword,
  validateOtpCode,
} = require('./auth.validation');
const { sendOtpNotification, verifyOtpWithTwilio } = require('./messaging.service');
const officerRepository = require('../officers/officer.repository');

class AuthService {
  /**
   * Step 1 of OTP Registration: Validate inputs, check uniqueness, generate OTP and store pending state.
   * @param {Object} data - { name, email, phone, password, address, city, state, pincode }
   */
  async sendOtp(data) {
    const { name, email, phone, password, address, city, state, pincode } = data || {};

    if (!name || name.trim() === '') {
      throw new Error('Full name is required');
    }

    validatePassword(password);

    if (!email && !phone) {
      throw new Error('Either an email address or a phone number must be provided');
    }

    let targetIdentifier = null;
    let normalizedEmail = null;
    let normalizedPhone = null;

    if (email && email.trim() !== '') {
      normalizedEmail = normalizeEmail(email);
      const existingEmail = await userRepository.findByEmail(normalizedEmail);
      if (existingEmail) {
        throw new Error('An account with this email address already exists');
      }
      targetIdentifier = normalizedEmail;
    }

    if (phone && String(phone).trim() !== '') {
      normalizedPhone = normalizeIndianPhone(phone);
      const existingPhone = await userRepository.findByPhone(normalizedPhone);
      if (existingPhone) {
        throw new Error('An account with this phone number already exists');
      }
      if (!targetIdentifier) {
        targetIdentifier = normalizedPhone;
      }
    }

    // Prepare USERS and CITIZENS payloads
    // If no email was provided (phone-only), generate a fallback placeholder email for USERS.email NOT NULL constraint
    const dbEmail = normalizedEmail || `${normalizedPhone}@phone.govbridge.local`;

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password.toString(), saltRounds);

    const userPayload = {
      name: name.trim(),
      email: dbEmail,
      passwordHash,
      role: 'CITIZEN',
    };

    const citizenPayload = {
      phone: normalizedPhone || null,
      address: address ? address.trim() : null,
      city: city ? city.trim() : null,
      state: state ? state.trim() : null,
      pincode: pincode ? pincode.trim() : null,
    };

    const parsedTarget = parseIdentifier(targetIdentifier);
    const otpCode = parsedTarget.type === 'EMAIL'
      ? crypto.randomInt(100000, 999999).toString()
      : null;

    // Twilio Verify owns phone OTP state; local OTP storage remains only for email.
    await otpRepository.saveOTP(targetIdentifier, otpCode);
    await otpRepository.savePendingRegistration(targetIdentifier, { userPayload, citizenPayload });

    // Calculate timer details
    const expiresMinutes = env.OTP_EXPIRATION_MINUTES || 5;
    const cooldownSeconds = env.OTP_RESEND_COOLDOWN_SECONDS || 60;
    const expiresInSeconds = expiresMinutes * 60;
    const expiresAtIso = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // Dispatch OTP via Email or WhatsApp
    let delivery;
    try {
      delivery = await sendOtpNotification({
        target: targetIdentifier,
        type: parsedTarget.type,
        otpCode,
        expiresMinutes,
      });
    } catch (error) {
      await otpRepository.deletePendingRegistration(targetIdentifier);
      throw error;
    }

    return {
      success: true,
      message: `OTP sent successfully via ${delivery.channel} to ${delivery.maskedTarget}`,
      identifier: targetIdentifier,
      sentVia: delivery.sentVia, // 'EMAIL' or 'SMS'
      maskedTarget: delivery.maskedTarget,
      timer: {
        expiresInSeconds,
        resendAvailableInSeconds: cooldownSeconds,
        expiresAt: expiresAtIso,
      },
    };
  }

  /**
   * Step 2 of OTP Registration: Verify OTP code and execute DB transaction to create USERS + CITIZENS records.
   * @param {string} identifier - Email or Phone Number
   * @param {string} otpCode - 6-digit OTP code
   */
  async verifyOtp(identifier, otpCode) {
    if (!identifier) {
      throw new Error('Email or phone number identifier is required');
    }

    const validCode = validateOtpCode(otpCode);
    const parsed = String(identifier).includes('@')
      ? parseIdentifier(identifier)
      : { type: 'PHONE', value: normalizeIndianPhone(identifier) };
    const key = parsed.value;

    const pendingData = await otpRepository.getPendingRegistration(key);
    if (!pendingData) {
      throw new Error('Registration session expired or invalid. Please request a new OTP.');
    }

    if (parsed.type === 'PHONE') {
      await verifyOtpWithTwilio(parsed.value, validCode);
    } else {
      await otpRepository.verifyOTP(key, validCode);
    }

    // Create user and citizen records atomically in DB transaction
    const createdRecord = await userRepository.createUserWithCitizen(
      pendingData.userPayload,
      pendingData.citizenPayload
    );

    // Clean up pending registration payload
    await otpRepository.deletePendingRegistration(key);

    return {
      success: true,
      message: 'OTP verified successfully. Citizen registration complete.',
      user: {
        user_id: createdRecord.user_id,
        name: createdRecord.name,
        email: createdRecord.email,
        role: createdRecord.role,
      }
    };
  }

  /**
   * Convenience method: Register citizen directly or route to OTP verify if otpCode is provided.
   */
  async register(registrationData) {
    const { identifier, otpCode, email, phone } = registrationData || {};

    if (otpCode) {
      const id = identifier || email || phone;
      return await this.verifyOtp(id, otpCode);
    }

    // Otherwise initiate OTP generation
    return await this.sendOtp(registrationData);
  }

  /**
   * Authenticate citizen login using Email OR Phone number
   * @param {string|Object} identifierParam - Email, Phone, or { identifier, email, phone, password }
   * @param {string} [passwordParam] 
   */
  async login(identifierParam, passwordParam) {
    let rawIdentifier = null;
    let password = null;

    if (typeof identifierParam === 'object' && identifierParam !== null) {
      rawIdentifier = identifierParam.identifier || identifierParam.email || identifierParam.phone;
      password = identifierParam.password;
    } else {
      rawIdentifier = identifierParam;
      password = passwordParam;
    }

    if (!rawIdentifier || !password) {
      throw new Error('Identifier (email or phone) and password are required');
    }

    const parsed = parseIdentifier(rawIdentifier);
    const user = await userRepository.findByIdentifier(parsed.value);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.is_active) {
      throw new Error('Your account has been deactivated. Please contact support.');
    }

    const isPasswordValid = await bcrypt.compare(password.toString(), user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const tokenPayload = {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, env.JWT_SECRET, { expiresIn: '7d' });

    return {
      success: true,
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    };
  }

  async requestPasswordChange(reqUser) {
    const isOfficer = reqUser.role === 'OFFICER' || reqUser.officer_id != null;
    const account = isOfficer
      ? await officerRepository.findById(reqUser.officer_id)
      : await userRepository.findById(reqUser.user_id);

    if (!account || !account.is_active || !account.email) {
      throw new Error('Unable to find an active account email for verification');
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    await otpRepository.saveOtpForPurpose(account.email, otpCode, 'password-change');
    const delivery = await sendOtpNotification({
      target: account.email,
      type: 'EMAIL',
      otpCode,
      expiresMinutes: env.OTP_EXPIRATION_MINUTES || 5,
    });

    return {
      success: true,
      message: `Verification code sent via ${delivery.channel} to ${delivery.maskedTarget}`,
      maskedTarget: delivery.maskedTarget,
    };
  }

  async confirmPasswordChange(reqUser, otpCode, newPassword) {
    validatePassword(newPassword);
    const isOfficer = reqUser.role === 'OFFICER' || reqUser.officer_id != null;
    const account = isOfficer
      ? await officerRepository.findById(reqUser.officer_id)
      : await userRepository.findById(reqUser.user_id);

    if (!account || !account.is_active || !account.email) {
      throw new Error('Unable to find the account for verification');
    }

    const validCode = validateOtpCode(otpCode);
    await otpRepository.verifyOtpForPurpose(account.email, validCode, 'password-change');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = isOfficer
      ? await officerRepository.updatePassword(account.officer_id, passwordHash)
      : await userRepository.updatePassword(account.user_id, passwordHash);

    if (!updated) throw new Error('Password could not be updated');
    return { success: true, message: 'Password changed successfully. Please sign in again.' };
  }

  async requestPasswordReset(identifier, role = 'CITIZEN') {
    const email = normalizeEmail(identifier);
    const isOfficer = role === 'OFFICER';
    const account = isOfficer
      ? await officerRepository.findByEmail(email)
      : await userRepository.findByEmail(email);

    if (!account || !account.is_active) {
      throw new Error('No active account was found for that email address.');
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const purpose = `password-reset-${isOfficer ? 'officer' : 'citizen'}`;
    await otpRepository.saveOtpForPurpose(email, otpCode, purpose);
    const delivery = await sendOtpNotification({
      target: email,
      type: 'EMAIL',
      otpCode,
      expiresMinutes: env.OTP_EXPIRATION_MINUTES || 5,
    });
    return { success: true, message: `Verification code sent via ${delivery.channel} to ${delivery.maskedTarget}` };
  }

  async confirmPasswordReset(identifier, role, otpCode, newPassword) {
    const email = normalizeEmail(identifier);
    validatePassword(newPassword);
    const isOfficer = role === 'OFFICER';
    const account = isOfficer
      ? await officerRepository.findByEmail(email)
      : await userRepository.findByEmail(email);
    if (!account || !account.is_active) throw new Error('Account verification failed.');

    const purpose = `password-reset-${isOfficer ? 'officer' : 'citizen'}`;
    await otpRepository.verifyOtpForPurpose(email, validateOtpCode(otpCode), purpose);
    const hash = await bcrypt.hash(newPassword, 10);
    const updated = isOfficer
      ? await officerRepository.updatePassword(account.officer_id, hash)
      : await userRepository.updatePassword(account.user_id, hash);
    if (!updated) throw new Error('Password could not be updated.');
    return { success: true, message: 'Password changed successfully. You can now sign in.' };
  }

  /**
   * Get current authenticated user profile
   * @param {number} userId 
   */
  async getProfile(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const profile = await userRepository.findById(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    return {
      success: true,
      user: profile,
    };
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers() {
    const users = await userRepository.getAllUsers();
    return {
      success: true,
      users,
    };
  }

  /**
   * Get a single user by ID
   */
  async getUserById(targetUserId, requesterId, requesterRole) {
    if (!targetUserId) {
      throw new Error('User ID is required');
    }

    if (requesterId !== targetUserId && requesterRole !== 'ADMIN') {
      throw new Error('Access denied');
    }

    const user = await userRepository.findById(targetUserId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      user,
    };
  }

  /**
   * Update a user profile and citizen details
   */
  async updateProfile(targetUserId, updateData, requesterId, requesterRole) {
    if (!targetUserId) {
      throw new Error('User ID is required');
    }

    if (requesterId !== targetUserId && requesterRole !== 'ADMIN') {
      throw new Error('Access denied');
    }

    const existing = await userRepository.findById(targetUserId);
    if (!existing) {
      throw new Error('User not found');
    }

    const userUpdates = {};
    const citizenUpdates = {};

    if (updateData.name != null && updateData.name.toString().trim() !== '') {
      userUpdates.name = updateData.name.toString().trim();
    }

    if (updateData.email != null && updateData.email.toString().trim() !== '') {
      const normalizedEmail = normalizeEmail(updateData.email);
      if (normalizedEmail !== existing.email.toLowerCase()) {
        const emailTaken = await userRepository.findByEmail(normalizedEmail);
        if (emailTaken) {
          throw new Error('A user with this email address already exists');
        }
        userUpdates.email = normalizedEmail;
      }
    }

    if (requesterRole === 'ADMIN') {
      if (updateData.role != null) {
        userUpdates.role = updateData.role.toString().trim();
      }
      if (updateData.is_active != null) {
        const value = updateData.is_active;
        userUpdates.is_active = ['true', '1', 'yes'].includes(String(value).trim().toLowerCase());
      }
    }

    if (updateData.phone != null) {
      citizenUpdates.phone = normalizePhone(updateData.phone);
    }
    if (updateData.address != null) {
      citizenUpdates.address = updateData.address.toString().trim();
    }
    if (updateData.city != null) {
      citizenUpdates.city = updateData.city.toString().trim();
    }
    if (updateData.state != null) {
      citizenUpdates.state = updateData.state.toString().trim();
    }
    if (updateData.pincode != null) {
      citizenUpdates.pincode = updateData.pincode.toString().trim();
    }

    if (updateData.newPassword != null) {
      validatePassword(updateData.newPassword);

      if (requesterRole !== 'ADMIN') {
        if (!updateData.currentPassword || updateData.currentPassword.toString().trim() === '') {
          throw new Error('Current password is required to change the password');
        }

        const authUser = await userRepository.findByEmail(existing.email);
        if (!authUser) {
          throw new Error('Unable to validate current password');
        }

        const validPassword = await bcrypt.compare(updateData.currentPassword.toString(), authUser.password_hash);
        if (!validPassword) {
          throw new Error('Current password is incorrect');
        }
      }

      const newPasswordHash = await bcrypt.hash(updateData.newPassword.toString(), 10);
      await userRepository.updatePassword(targetUserId, newPasswordHash);
    }

    if (Object.keys(userUpdates).length > 0) {
      await userRepository.updateUser(targetUserId, userUpdates);
    }

    if (Object.keys(citizenUpdates).length > 0) {
      await userRepository.updateCitizenProfile(targetUserId, citizenUpdates);
    }

    const updatedUser = await userRepository.findById(targetUserId);
    return {
      success: true,
      user: updatedUser,
    };
  }

  /**
   * Delete a user account
   */
  async deleteUser(targetUserId, requesterId, requesterRole) {
    if (!targetUserId) {
      throw new Error('User ID is required');
    }

    if (requesterId !== targetUserId && requesterRole !== 'ADMIN') {
      throw new Error('Access denied');
    }

    const deleted = await userRepository.deleteUser(targetUserId);
    if (!deleted) {
      throw new Error('User not found');
    }

    return {
      success: true,
      message: 'User account deleted successfully',
    };
  }
}

module.exports = new AuthService();
