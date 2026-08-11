const db = require('../../config/db');

// In-memory fallback users store: Map<identifier, User>()
const inMemoryUsers = new Map();
let nextUserId = 1;

class UserRepository {
  /**
   * Find or create a user by email address or mobile phone number
   * @param {string} identifier - Email or Phone Number
   * @returns {Object} user object
   */
  async findOrCreateByIdentifier(identifier) {
    const key = identifier.trim().toLowerCase();
    const isEmail = key.includes('@');

    // 1. Try finding in DB if available
    try {
      await db.query(
        `CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE,
          phone VARCHAR(50) UNIQUE,
          role VARCHAR(50) DEFAULT 'citizen',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      );

      const queryText = isEmail
        ? 'SELECT * FROM users WHERE LOWER(email) = $1'
        : 'SELECT * FROM users WHERE phone = $1';
      
      const existing = await db.query(queryText, [key]);
      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      // Create new user in DB
      const insertText = isEmail
        ? 'INSERT INTO users (email, role) VALUES ($1, $2) RETURNING *'
        : 'INSERT INTO users (phone, role) VALUES ($1, $2) RETURNING *';
      
      const newUserRes = await db.query(insertText, [key, 'citizen']);
      return newUserRes.rows[0];
    } catch (err) {
      console.warn('DB query in UserRepository fallback to memory store:', err.message);
    }

    // 2. In-memory fallback
    if (inMemoryUsers.has(key)) {
      return inMemoryUsers.get(key);
    }

    const newUser = {
      id: nextUserId++,
      email: isEmail ? key : null,
      phone: !isEmail ? key : null,
      role: 'citizen',
      created_at: new Date().toISOString()
    };

    inMemoryUsers.set(key, newUser);
    return newUser;
  }
}

module.exports = new UserRepository();
