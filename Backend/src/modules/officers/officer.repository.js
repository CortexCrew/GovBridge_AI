const db = require('../../config/db');

class OfficerRepository {
  async init() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS departments (
        department_id SERIAL PRIMARY KEY,
        department_name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS officers (
        officer_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
        certificate_types TEXT[] NOT NULL DEFAULT '{}',
        role VARCHAR(50) NOT NULL DEFAULT 'OFFICER',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      ALTER TABLE officers
      ADD COLUMN IF NOT EXISTS certificate_types TEXT[] DEFAULT '{}';
    `);

    await db.query(`
      INSERT INTO departments (department_name)
      VALUES
        ('Revenue Department'),
        ('Municipal Administration'),
        ('Rural Development and Panchayat Raj'),
        ('Water Supply Department'),
        ('Electricity Department'),
        ('Health and Family Welfare'),
        ('Transport Department'),
        ('Police Department'),
        ('Public Works Department'),
        ('Agriculture Department'),
        ('Social Welfare Department'),
        ('Education Department'),
        ('Information Technology and Digital Services')
      ON CONFLICT (department_name) DO NOTHING;
    `);
  }

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
        certificate_types,
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
        certificate_types,
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

  async findEligibleOfficersByCertificateType(certificateType) {
    const query = `
      SELECT officer_id, name, email, department_id, certificate_types, role, is_active
      FROM officers
      WHERE is_active = TRUE
      AND $1 = ANY(certificate_types);
    `;

    const { rows } = await db.query(query, [certificateType]);
    return rows;
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
