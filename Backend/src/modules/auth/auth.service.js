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
}

module.exports = new AuthService();
