const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const officerRepository = require('./officer.repository');

class OfficerService {
  /**
   * Authenticate officer credentials and issue JWT token.
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>} Object containing auth token and sanitized officer info
   */
  async loginOfficer({ email, password }) {
    // 1. Fetch officer record from database via Repository
    const officer = await officerRepository.findByEmail(email);
    if (!officer) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // 2. Verify if the officer account is active
    if (!officer.is_active) {
      const error = new Error('Your officer account has been deactivated');
      error.statusCode = 403;
      throw error;
    }

    // 3. Compare hashed password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, officer.password_hash);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // 4. Generate JWT Token
    const payload = {
      id: officer.id,
      email: officer.email,
      role: 'officer',
      department_id: officer.department_id
    };

    const secret = process.env.JWT_SECRET || 'default_jwt_secret';
    const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

    const token = jwt.sign(payload, secret, { expiresIn });

    // 5. Exclude password_hash before returning
    const { password_hash, ...sanitizedOfficer } = officer;

    return {
      token,
      officer: sanitizedOfficer
    };
  }
}

module.exports = new OfficerService();
