const db = require('../../config/db');

class CertificateRepository {
  /**
   * Create certificate_applications and documents tables if they don't exist.
   */
  async createTables() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS certificate_applications (
        application_id     SERIAL PRIMARY KEY,
        user_id            INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        officer_id         INTEGER REFERENCES officers(officer_id) ON DELETE SET NULL,
        certificate_type   VARCHAR(100) NOT NULL CHECK (certificate_type IN (
          'Income Certificate',
          'Community Certificate',
          'Nativity Certificate',
          'Birth Certificate',
          'Residence Certificate'
        )),
        status             VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
        application_date   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        remarks            TEXT
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS documents (
        document_id      SERIAL PRIMARY KEY,
        application_id   INTEGER NOT NULL REFERENCES certificate_applications(application_id) ON DELETE CASCADE,
        user_id          INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        file_path        VARCHAR(500) NOT NULL,
        document_type    VARCHAR(100) NOT NULL,
        uploaded_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Create a new certificate application for a citizen.
   * @param {number} userId
   * @param {string} certificateType
   */
  async createApplication(userId, certificateType) {
    const query = `
      INSERT INTO certificate_applications (user_id, certificate_type)
      VALUES ($1, $2)
      RETURNING
        application_id,
        user_id,
        officer_id,
        certificate_type,
        status,
        application_date,
        remarks;
    `;
    const result = await db.query(query, [userId, certificateType]);
    return result.rows[0];
  }

  /**
   * Save an uploaded document linked to an application.
   * @param {number} applicationId
   * @param {number} userId
   * @param {string} filePath
   * @param {string} documentType
   */
  async saveDocument(applicationId, userId, filePath, documentType) {
    const query = `
      INSERT INTO documents (application_id, user_id, file_path, document_type)
      VALUES ($1, $2, $3, $4)
      RETURNING
        document_id,
        application_id,
        user_id,
        file_path,
        document_type,
        uploaded_at;
    `;
    const result = await db.query(query, [applicationId, userId, filePath, documentType]);
    return result.rows[0];
  }

  /**
   * Get all applications submitted by a citizen.
   * @param {number} userId
   */
  async getApplicationsByUser(userId) {
    const query = `
      SELECT
        application_id,
        user_id,
        officer_id,
        certificate_type,
        status,
        application_date,
        remarks
      FROM certificate_applications
      WHERE user_id = $1
      ORDER BY application_date DESC;
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get a single application by its ID.
   * @param {number} applicationId
   */
  async getApplicationById(applicationId) {
    const query = `
      SELECT
        application_id,
        user_id,
        officer_id,
        certificate_type,
        status,
        application_date,
        remarks
      FROM certificate_applications
      WHERE application_id = $1;
    `;
    const result = await db.query(query, [applicationId]);
    return result.rows[0] || null;
  }

  /**
   * Get all documents belonging to an application.
   * @param {number} applicationId
   */
  async getDocumentsByApplicationId(applicationId) {
    const query = `
      SELECT
        document_id,
        application_id,
        user_id,
        file_path,
        document_type,
        uploaded_at
      FROM documents
      WHERE application_id = $1
      ORDER BY uploaded_at ASC;
    `;
    const result = await db.query(query, [applicationId]);
    return result.rows;
  }

  /**
   * Update application status and record the reviewing officer_id.
   * @param {number} applicationId
   * @param {string} status - 'Approved' | 'Rejected'
   * @param {string|null} remarks
   * @param {number|null} officerId
   */
  async updateApplicationStatus(applicationId, status, remarks, officerId) {
    const query = `
      UPDATE certificate_applications
      SET
        status     = $2,
        remarks    = $3,
        officer_id = $4
      WHERE application_id = $1
      RETURNING
        application_id,
        user_id,
        officer_id,
        certificate_type,
        status,
        application_date,
        remarks;
    `;
    const result = await db.query(query, [applicationId, status, remarks, officerId]);
    return result.rows[0] || null;
  }
}

module.exports = new CertificateRepository();
