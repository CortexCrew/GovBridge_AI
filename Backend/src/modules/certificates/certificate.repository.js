const path = require('path');
const db = require('../../config/db');
const lockerRepository = require('../locker/locker.repository');

function mapApplicationRow(row) {
  if (!row) return null;
  let docs = row.documents;
  if (typeof docs === 'string') {
    try {
      docs = JSON.parse(docs);
    } catch (e) {
      docs = [];
    }
  }
  if (!Array.isArray(docs)) {
    docs = [];
  }
  return {
    ...row,
    documents: docs
      .filter(doc => doc && (doc.document_id || doc.file_path || doc.file_name))
      .map(doc => {
        const fileName = doc.file_name || (doc.file_path ? path.basename(String(doc.file_path).split('\\').join('/')) : 'document');
        return {
          ...doc,
          file_name: fileName,
          download_url: `/api/locker/download/document/${doc.document_id}`,
          file_url: `/api/locker/download/document/${doc.document_id}`
        };
      })
  };
}

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
        file_name        VARCHAR(255),
        content_type     VARCHAR(150),
        file_size        BIGINT,
        storage_provider VARCHAR(20) NOT NULL DEFAULT 'local',
        uploaded_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS content_type VARCHAR(150),
        ADD COLUMN IF NOT EXISTS file_size BIGINT,
        ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) NOT NULL DEFAULT 'local';
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
  async saveDocument(applicationId, userId, filePath, documentType, metadata = {}) {
    const query = `
      INSERT INTO documents (application_id, user_id, file_path, document_type, file_name, content_type, file_size, storage_provider)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        document_id,
        application_id,
        user_id,
        file_path,
        document_type,
        file_name,
        content_type,
        file_size,
        storage_provider,
        uploaded_at;
    `;
    const result = await db.query(query, [
      applicationId, userId, filePath, documentType,
      metadata.file_name || documentType,
      metadata.content_type || null,
      metadata.file_size || null,
      metadata.storage_provider || 'local'
    ]);
    return result.rows[0];
  }

  async getDocumentById(documentId) {
    const result = await db.query(`
      SELECT d.document_id, d.application_id, d.user_id, d.file_path, d.document_type,
        d.file_name, d.content_type, d.file_size, d.storage_provider, d.uploaded_at,
        ca.certificate_type
      FROM documents d
      INNER JOIN certificate_applications ca ON ca.application_id = d.application_id
      WHERE d.document_id = $1;
    `, [documentId]);
    return result.rows[0] || null;
  }

  async getIssuedCertificate(applicationId) {
    const result = await db.query(
      'SELECT application_id, file_path, uploaded_at, file_name, content_type, file_size, storage_provider FROM digital_locker WHERE application_id = $1',
      [applicationId]
    );
    return result.rows[0] || null;
  }

  async deleteApplication(applicationId, userId) {
    await db.query(
      'DELETE FROM certificate_applications WHERE application_id = $1 AND user_id = $2',
      [applicationId, userId]
    );
  }

  /**
   * Get all applications submitted by a citizen.
   * @param {number} userId
   */
  /**
   * Get all applications submitted by a citizen.
   * @param {number} userId
   */
  async getApplicationsByUser(userId) {
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
      WHERE ca.user_id = $1
      ORDER BY ca.application_date DESC;
    `;
    const result = await db.query(query, [userId]);
    const apps = result.rows;
    if (apps.length === 0) return [];

    const appIds = apps.map(a => a.application_id);
    const docsResult = await db.query(
      `SELECT document_id, application_id, user_id, file_path, document_type, file_name, content_type, file_size, storage_provider, uploaded_at
       FROM documents 
       WHERE application_id = ANY($1::int[]) 
       ORDER BY uploaded_at ASC`,
      [appIds]
    );

    const docsByApp = {};
    for (const doc of docsResult.rows) {
      const rawPath = String(doc.file_path || '').replace(/\\/g, '/');
      const fileName = doc.file_name || rawPath.split('/').pop() || 'document';
      const formattedDoc = {
        ...doc,
        file_name: fileName,
        download_url: `/api/locker/download/document/${doc.document_id}`,
        file_url: `/api/locker/download/document/${doc.document_id}`
      };
      if (!docsByApp[doc.application_id]) {
        docsByApp[doc.application_id] = [];
      }
      docsByApp[doc.application_id].push(formattedDoc);
    }

    const lockerResult = await db.query(
      `SELECT application_id, file_path, uploaded_at, uploaded_by, file_name, content_type, file_size, storage_provider
       FROM digital_locker 
       WHERE application_id = ANY($1::int[])`,
      [appIds]
    );
    const lockerByApp = {};
    for (const row of lockerResult.rows) {
      const rawPath = String(row.file_path || '').replace(/\\/g, '/');
      const fileName = row.file_name || rawPath.split('/').pop() || 'certificate.pdf';
      lockerByApp[row.application_id] = {
        application_id: row.application_id,
        file_name: fileName,
        content_type: row.content_type,
        file_size: row.file_size,
        storage_provider: row.storage_provider || 'local',
        download_url: `/api/locker/download/issued/${row.application_id}`,
        file_url: `/api/locker/download/issued/${row.application_id}`,
        uploaded_at: row.uploaded_at
      };
    }

    return apps.map(app => ({
      ...app,
      documents: docsByApp[app.application_id] || [],
      issued_certificate: lockerByApp[app.application_id] || null
    }));
  }

  /**
   * Get a single application by its ID.
   * @param {number} applicationId
   */
  async getApplicationById(applicationId) {
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
      WHERE ca.application_id = $1;
    `;
    const result = await db.query(query, [applicationId]);
    if (!result.rows[0]) return null;
    const app = result.rows[0];

    const docsResult = await db.query(
      `SELECT document_id, application_id, user_id, file_path, document_type, file_name, content_type, file_size, storage_provider, uploaded_at
       FROM documents 
       WHERE application_id = $1 
       ORDER BY uploaded_at ASC`,
      [applicationId]
    );

    const documents = docsResult.rows.map(doc => {
      const rawPath = String(doc.file_path || '').replace(/\\/g, '/');
      const fileName = doc.file_name || rawPath.split('/').pop() || 'document';
      return {
        ...doc,
        file_name: fileName,
        download_url: `/api/locker/download/document/${doc.document_id}`,
        file_url: `/api/locker/download/document/${doc.document_id}`
      };
    });

    const lockerResult = await db.query(
      `SELECT file_path, uploaded_at, uploaded_by, file_name, content_type, file_size, storage_provider
       FROM digital_locker 
       WHERE application_id = $1`,
      [applicationId]
    );

    let issuedCertificate = null;
    if (lockerResult.rows[0]) {
      const row = lockerResult.rows[0];
      const rawPath = String(row.file_path || '').replace(/\\/g, '/');
      const fileName = rawPath.split('/').pop() || 'certificate.pdf';
      issuedCertificate = {
        application_id: applicationId,
        file_name: row.file_name || fileName,
        content_type: row.content_type,
        file_size: row.file_size,
        storage_provider: row.storage_provider || 'local',
        download_url: `/api/locker/download/issued/${applicationId}`,
        file_url: `/api/locker/download/issued/${applicationId}`,
        uploaded_at: row.uploaded_at
      };
    }

    return {
      ...app,
      documents,
      issued_certificate: issuedCertificate
    };
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
      AND (
        o.certificate_types IS NULL 
        OR cardinality(o.certificate_types) = 0 
        OR ca.certificate_type = ANY(o.certificate_types)
      )
      ORDER BY ca.application_date DESC;
    `;

    const result = await db.query(query, [officerId]);
    const apps = result.rows;
    if (apps.length === 0) return [];

    const appIds = apps.map(a => a.application_id);
    const docsResult = await db.query(
      `SELECT document_id, application_id, user_id, file_path, document_type, file_name, content_type, file_size, storage_provider, uploaded_at
       FROM documents 
       WHERE application_id = ANY($1::int[]) 
       ORDER BY uploaded_at ASC`,
      [appIds]
    );

    const docsByApp = {};
    for (const doc of docsResult.rows) {
      const rawPath = String(doc.file_path || '').replace(/\\/g, '/');
      const fileName = doc.file_name || rawPath.split('/').pop() || 'document';
      const formattedDoc = {
        ...doc,
        file_name: fileName,
        download_url: `/api/locker/download/document/${doc.document_id}`,
        file_url: `/api/locker/download/document/${doc.document_id}`
      };
      if (!docsByApp[doc.application_id]) {
        docsByApp[doc.application_id] = [];
      }
      docsByApp[doc.application_id].push(formattedDoc);
    }

    const lockerResult = await db.query(
      `SELECT application_id, file_path, uploaded_at, uploaded_by, file_name, content_type, file_size, storage_provider
       FROM digital_locker 
       WHERE application_id = ANY($1::int[])`,
      [appIds]
    );
    const lockerByApp = {};
    for (const row of lockerResult.rows) {
      const rawPath = String(row.file_path || '').replace(/\\/g, '/');
      const fileName = row.file_name || rawPath.split('/').pop() || 'certificate.pdf';
      lockerByApp[row.application_id] = {
        application_id: row.application_id,
        file_name: fileName,
        content_type: row.content_type,
        file_size: row.file_size,
        storage_provider: row.storage_provider || 'local',
        download_url: `/api/locker/download/issued/${row.application_id}`,
        file_url: `/api/locker/download/issued/${row.application_id}`,
        uploaded_at: row.uploaded_at
      };
    }

    return apps.map(app => ({
      ...app,
      documents: docsByApp[app.application_id] || [],
      issued_certificate: lockerByApp[app.application_id] || null
    }));
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
        file_name,
        content_type,
        file_size,
        storage_provider,
        uploaded_at
      FROM documents
      WHERE application_id = $1
      ORDER BY uploaded_at ASC;
    `;
    const result = await db.query(query, [applicationId]);
    return result.rows.map(row => {
      const rawPath = String(row.file_path || '').replace(/\\/g, '/');
      const fileName = row.file_name || rawPath.split('/').pop() || 'document';
      return {
        ...row,
        file_name: fileName,
        download_url: `/api/locker/download/document/${row.document_id}`,
        file_url: `/api/locker/download/document/${row.document_id}`
      };
    });
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
  async approveWithCertificate(applicationId, remarks, userId, officerId, filePath, metadata = {}) {
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

      await lockerRepository.upsertEntry(client, userId, applicationId, filePath, officerId, metadata);
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
