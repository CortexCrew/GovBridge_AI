const db = require('../../config/db');

class CertificateRepository {
  async createTables() {
    const query = `
      CREATE TABLE IF NOT EXISTS certificate_applications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        certificate_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        remarks TEXT
      );

      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES certificate_applications(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS digital_locker (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        application_id INTEGER REFERENCES certificate_applications(id) ON DELETE CASCADE,
        certificate_file_path VARCHAR(255) NOT NULL,
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await db.query(query);
  }

  async createApplication(userId, certificateType) {
    const query = `
      INSERT INTO certificate_applications (user_id, certificate_type)
      VALUES ($1, $2)
      RETURNING *;
    `;
    const result = await db.query(query, [userId, certificateType]);
    return result.rows[0];
  }

  async saveDocument(applicationId, userId, filePath, documentType) {
    const query = `
      INSERT INTO documents (application_id, user_id, file_path, document_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await db.query(query, [applicationId, userId, filePath, documentType]);
    return result.rows[0];
  }

  async getApplicationsByUser(userId) {
    const query = `
      SELECT * FROM certificate_applications
      WHERE user_id = $1
      ORDER BY application_date DESC;
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  async getApplicationById(id) {
    const query = `
      SELECT * FROM certificate_applications
      WHERE id = $1;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  async updateApplicationStatus(id, status, remarks) {
    const query = `
      UPDATE certificate_applications
      SET status = $2, remarks = $3
      WHERE id = $1
      RETURNING *;
    `;
    const result = await db.query(query, [id, status, remarks]);
    return result.rows[0];
  }

  async getDocumentsByApplicationId(applicationId) {
    const query = `
      SELECT * FROM documents
      WHERE application_id = $1;
    `;
    const result = await db.query(query, [applicationId]);
    return result.rows;
  }

  async saveToDigitalLocker(userId, applicationId, certificateFilePath) {
    const query = `
      INSERT INTO digital_locker (user_id, application_id, certificate_file_path)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await db.query(query, [userId, applicationId, certificateFilePath]);
    return result.rows[0];
  }

  async getDigitalLockerByUser(userId) {
    const query = `
      SELECT * FROM digital_locker
      WHERE user_id = $1
      ORDER BY issued_at DESC;
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }
}

module.exports = new CertificateRepository();
