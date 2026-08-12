const db = require('../../config/db');

class UserRepository {
  /**
   * Initialize USERS and CITIZENS tables if they do not exist
   */
  async init() {
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'CITIZEN',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createCitizensTableQuery = `
      CREATE TABLE IF NOT EXISTS citizens (
        citizen_id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        phone VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await db.query(createUsersTableQuery);
    await db.query(createCitizensTableQuery);
  }

  /**
   * Create a new User and corresponding Citizen profile within a SQL transaction
   * @param {Object} userData - { name, email, passwordHash, role }
   * @param {Object} citizenData - { phone, address, city, state, pincode }
   * @returns {Promise<Object>} Created user and citizen profile
   */
  async createUserWithCitizen(userData, citizenData) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const userInsertQuery = `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING user_id, name, email, role, is_active, created_at, updated_at;
      `;
      const userResult = await client.query(userInsertQuery, [
        userData.name,
        userData.email.trim().toLowerCase(),
        userData.passwordHash,
        userData.role || 'CITIZEN'
      ]);
      const newUser = userResult.rows[0];

      const citizenInsertQuery = `
        INSERT INTO citizens (user_id, phone, address, city, state, pincode)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING citizen_id, user_id, phone, address, city, state, pincode, created_at, updated_at;
      `;
      const citizenResult = await client.query(citizenInsertQuery, [
        newUser.user_id,
        citizenData.phone || null,
        citizenData.address || null,
        citizenData.city || null,
        citizenData.state || null,
        citizenData.pincode || null
      ]);
      const newCitizen = citizenResult.rows[0];

      await client.query('COMMIT');

      return {
        ...newUser,
        citizen: newCitizen
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find a user by email address (includes password_hash for auth validation)
   * @param {string} email 
   * @returns {Promise<Object|null>} User record or null
   */
  async findByEmail(email) {
    const queryText = `
      SELECT user_id, name, email, password_hash, role, is_active, created_at, updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1);
    `;
    const result = await db.query(queryText, [email.trim()]);
    return result.rows[0] || null;
  }

  /**
   * Find citizen profile details by user_id
   * @param {number} userId 
   * @returns {Promise<Object|null>} Combined user + citizen data or null
   */
  async findById(userId) {
    const queryText = `
      SELECT 
        u.user_id,
        u.name,
        u.email,
        u.role,
        u.is_active,
        u.created_at AS user_created_at,
        c.citizen_id,
        c.phone,
        c.address,
        c.city,
        c.state,
        c.pincode
      FROM users u
      LEFT JOIN citizens c ON u.user_id = c.user_id
      WHERE u.user_id = $1;
    `;
    const result = await db.query(queryText, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Get all users and their citizen details
   */
  async getAllUsers() {
    const queryText = `
      SELECT 
        u.user_id,
        u.name,
        u.email,
        u.role,
        u.is_active,
        u.created_at AS user_created_at,
        c.citizen_id,
        c.phone,
        c.address,
        c.city,
        c.state,
        c.pincode
      FROM users u
      LEFT JOIN citizens c ON u.user_id = c.user_id
      ORDER BY u.user_id;
    `;
    const result = await db.query(queryText);
    return result.rows;
  }

  /**
   * Update fields on the users table
   */
  async updateUser(userId, updates) {
    const allowedFields = ['name', 'email', 'role', 'is_active'];
    const fields = Object.keys(updates).filter((field) => allowedFields.includes(field));
    if (fields.length === 0) {
      return false;
    }

    const setClauses = fields.map((field, index) => `${field} = $${index + 1}`);
    const values = fields.map((field) => updates[field]);
    values.push(userId);

    const queryText = `
      UPDATE users
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $${values.length};
    `;

    const result = await db.query(queryText, values);
    return result.rowCount > 0;
  }

  /**
   * Update fields on the citizens table for a given user
   */
  async updateCitizenProfile(userId, updates) {
    const allowedFields = ['phone', 'address', 'city', 'state', 'pincode'];
    const fields = Object.keys(updates).filter((field) => allowedFields.includes(field));
    if (fields.length === 0) {
      return false;
    }

    const setClauses = fields.map((field, index) => `${field} = $${index + 1}`);
    const values = fields.map((field) => updates[field]);
    values.push(userId);

    const queryText = `
      UPDATE citizens
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $${values.length};
    `;

    const result = await db.query(queryText, values);
    return result.rowCount > 0;
  }

  /**
   * Delete a user account by ID
   */
  async deleteUser(userId) {
    const queryText = `
      DELETE FROM users
      WHERE user_id = $1;
    `;
    const result = await db.query(queryText, [userId]);
    return result.rowCount > 0;
  }

  /**
   * Update password hash for a user
   * @param {number} userId 
   * @param {string} newPasswordHash 
   * @returns {Promise<boolean>} True if updated
   */
  async updatePassword(userId, newPasswordHash) {
    const queryText = `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2;
    `;
    const result = await db.query(queryText, [newPasswordHash, userId]);
    return result.rowCount > 0;
  }
}

module.exports = new UserRepository();
