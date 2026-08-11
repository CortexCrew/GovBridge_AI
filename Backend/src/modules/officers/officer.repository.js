const db = require('../../config/db');

class OfficerRepository {
  /**
   * Find an officer record by officer_id.
   * @param {number|string} officerId 
   * @returns {Promise<Object|null>} Officer record or null
   */
  async findById(officerId) {
    const query = `
      SELECT 
        officer_id, 
        name, 
        email, 
        department_id, 
        role, 
        is_active, 
        created_at,
        updated_at
      FROM officers
      WHERE officer_id = $1;
    `;
    const { rows } = await db.query(query, [officerId]);
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
        officer_id, 
        name, 
        email, 
        password_hash, 
        department_id, 
        role, 
        is_active, 
        created_at,
        updated_at
      FROM officers
      WHERE email = $1;
    `;

    const { rows } = await db.query(query, [email]);
    return rows[0] || null;
  }

  /**
   * Fetch department details by department_id.
   * @param {number|string} departmentId 
   * @returns {Promise<Object|null>} Department details or null
   */
  async getDepartmentById(departmentId) {
    const query = `
      SELECT 
        department_id, 
        department_name, 
        description, 
        is_active, 
        created_at,
        updated_at
      FROM departments
      WHERE department_id = $1;
    `;
    const { rows } = await db.query(query, [departmentId]);
    return rows[0] || null;
  }
}

module.exports = new OfficerRepository();
