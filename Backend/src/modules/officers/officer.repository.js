const db = require('../../config/db');

class OfficerRepository {
  /**
   * Find an officer record by ID.
   * @param {number|string} id 
   * @returns {Promise<Object|null>} Officer record or null
   */
  async findById(id) {
    const query = `
      SELECT 
        id, 
        name, 
        email, 
        department_id, 
        designation, 
        is_active, 
        created_at
      FROM officers
      WHERE id = $1;
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Find an officer record by email address using raw parameterized SQL.
   * @param {string} email
   * @returns {Promise<Object|null>} Officer row or null if not found
   */
  async findByEmail(email) {
    const query = `
      SELECT 
        id, 
        name, 
        email, 
        password_hash, 
        department_id, 
        designation, 
        is_active, 
        created_at
      FROM officers
      WHERE email = $1;
    `;

    const { rows } = await db.query(query, [email]);
    return rows[0] || null;
  }
}

module.exports = new OfficerRepository();
