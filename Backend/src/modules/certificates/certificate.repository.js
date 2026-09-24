const db = require('../../config/db');
const lockerRepository = require('../locker/locker.repository');

class CertificateRepository {
  /**
   * Create certificate_applications and documents tables if they don't exist.
   */
  async createTables() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS certificate_applications (
        application_id     SERIAL PRIMARY KEY,
        user_id            INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
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
      ALTER TABLE certificate_applications
      ADD COLUMN IF NOT EXISTS application_data JSONB;
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
   * @param {Object|null} applicationData - Type-specific form fields (stored as JSONB)
   */
  async createApplication(userId, certificateType, applicationData = null) {
    const query = `
      INSERT INTO certificate_applications (user_id, certificate_type, application_data)
      VALUES ($1, $2, $3)
      RETURNING
        application_id,
        user_id,
        certificate_type,
        status,
        application_date,
        remarks,
        application_data;
    `;
    const result = await db.query(query, [userId, certificateType, applicationData]);
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
        certificate_type,
        status,
        application_date,
        remarks,
        application_data
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
        certificate_type,
        status,
        application_date,
        remarks,
        application_data
      FROM certificate_applications
      WHERE application_id = $1;
    `;
    const result = await db.query(query, [applicationId]);
    return result.rows[0] || null;
  }

  async getApplicationsForOfficer(officerId) {
    const query = `
      SELECT
        ca.application_id,
        ca.user_id,
        ca.certificate_type,
        ca.status,
        ca.application_date,
        ca.remarks,
        ca.application_data
      FROM certificate_applications ca
      INNER JOIN officers o ON o.officer_id = $1
      WHERE o.is_active = TRUE
      AND ca.certificate_type = ANY(COALESCE(o.certificate_types, ARRAY[]::text[]))
      ORDER BY ca.application_date DESC;
    `;

    const result = await db.query(query, [officerId]);
    return result.rows;
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
  async updateApplicationStatus(applicationId, status, remarks) {
    const query = `
      UPDATE certificate_applications
      SET
        status  = $2,
        remarks = $3
      WHERE application_id = $1
      RETURNING
        application_id,
        user_id,
        certificate_type,
        status,
        application_date,
        remarks,
        application_data;
    `;
    const result = await db.query(query, [applicationId, status, remarks]);
    return result.rows[0] || null;
  }

  /**
   * Approve an application and store the officer's certificate file in the
   * citizen's Digital Locker in a single transaction.
   * @param {number} applicationId
   * @param {string|null} remarks
   * @param {number} userId - Owner of the application
   * @param {number} officerId - Approving officer
   * @param {string} filePath - Uploaded certificate file
   */
  async approveWithCertificate(applicationId, remarks, userId, officerId, filePath) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `
        UPDATE certificate_applications
        SET status = 'Approved', remarks = $2
        WHERE application_id = $1
        RETURNING
          application_id,
          user_id,
          certificate_type,
          status,
          application_date,
          remarks,
          application_data;
        `,
        [applicationId, remarks]
      );

      if (!result.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }

      await lockerRepository.upsertEntry(client, userId, applicationId, filePath, officerId);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new CertificateRepository();
