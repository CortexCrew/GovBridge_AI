const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const userRepository = require('./user.repository');

class AuthService {
  /**
   * Register a new citizen account and profile
   */
  async register(registrationData) {
    const { name, email, password, phone, address, city, state, pincode } = registrationData;

    // 1. Validation
    if (!name || name.trim() === '') {
      throw new Error('Name is required');
    }
    if (!email || email.trim() === '') {
      throw new Error('Email is required');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error('Please enter a valid email address');
    }

    // 2. Check existing user
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('A user with this email address already exists');
    }

    // 3. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Create USERS and CITIZENS record
    const userPayload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: 'CITIZEN'
    };

    const citizenPayload = {
      phone: phone ? phone.trim() : null,
      address: address ? address.trim() : null,
      city: city ? city.trim() : null,
      state: state ? state.trim() : null,
      pincode: pincode ? pincode.trim() : null
    };

    const createdRecord = await userRepository.createUserWithCitizen(userPayload, citizenPayload);

    return {
      success: true,
      message: 'Citizen registration successful',
      user: createdRecord
    };
  }

  /**
   * Authenticate citizen login and issue JWT token
   */
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // 1. Find user by email
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.is_active) {
      throw new Error('Your account has been deactivated. Please contact support.');
    }

    // 2. Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // 3. Generate JWT Token with user_id and role
    const tokenPayload = {
      user_id: user.user_id,
      email: user.email,
      role: user.role
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
        role: user.role
      }
    };
  }

  /**
   * Fetch authenticated user's citizen profile
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
      profile
    };
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers() {
    const users = await userRepository.getAllUsers();
    return {
      success: true,
      users
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
      user
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
      const normalizedEmail = updateData.email.toString().trim().toLowerCase();
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
      citizenUpdates.phone = updateData.phone.toString().trim();
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
      if (updateData.newPassword.toString().length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }

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
      user: updatedUser
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
      message: 'User account deleted successfully'
    };
  }
}

module.exports = new AuthService();
