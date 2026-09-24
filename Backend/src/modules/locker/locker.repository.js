const db = require('../../config/db');

class LockerRepository {
  /**
   * Create digital_locker if missing and bring older versions of the table up
   * to date: composite primary key, uploaded_at and uploaded_by.
   */
  async init() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS digital_locker (
        user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        application_id  INTEGER NOT NULL REFERENCES certificate_applications(application_id) ON DELETE CASCADE,
        file_path       VARCHAR(500) NOT NULL
      );
    `);

    await db.query(`
      ALTER TABLE digital_locker
        ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS uploaded_by INTEGER REFERENCES officers(officer_id) ON DELETE SET NULL,
        ALTER COLUMN application_id SET NOT NULL;
    `);

    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'digital_locker'::regclass AND contype = 'p'
        ) THEN
          ALTER TABLE digital_locker ADD PRIMARY KEY (user_id, application_id);
        END IF;
      END $$;
    `);
  }

  /**
   * Insert or replace the officer-issued certificate for an application.
   * Accepts an optional transaction client so callers can make it atomic.
   */
  async upsertEntry(client, userId, applicationId, filePath, officerId) {
    const query = `
      INSERT INTO digital_locker (user_id, application_id, file_path, uploaded_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, application_id)
      DO UPDATE SET
        file_path = EXCLUDED.file_path,
        uploaded_by = EXCLUDED.uploaded_by,
        uploaded_at = CURRENT_TIMESTAMP
      RETURNING user_id, application_id, file_path, uploaded_at, uploaded_by;
    `;
    const result = await (client || db).query(query, [userId, applicationId, filePath, officerId]);
    return result.rows[0];
  }

  /**
   * Everything a citizen has in their locker: certificates issued by officers
   * plus the documents they uploaded with their applications.
   */
  async getItemsByUser(userId) {
    const query = `
      SELECT
        'issued_certificate'::text AS source,
        dl.application_id          AS item_id,
        dl.application_id,
        ca.certificate_type,
        dl.file_path,
        NULL::varchar              AS document_type,
        dl.uploaded_at
      FROM digital_locker dl
      INNER JOIN certificate_applications ca ON ca.application_id = dl.application_id
      WHERE dl.user_id = $1
      UNION ALL
      SELECT
        'uploaded_document'::text  AS source,
        d.document_id              AS item_id,
        d.application_id,
        ca.certificate_type,
        d.file_path,
        d.document_type,
        d.uploaded_at
      FROM documents d
      INNER JOIN certificate_applications ca ON ca.application_id = d.application_id
      WHERE d.user_id = $1
      ORDER BY uploaded_at DESC;
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  async findIssuedCertificate(userId, applicationId) {
    const result = await db.query(
      'SELECT file_path FROM digital_locker WHERE user_id = $1 AND application_id = $2',
      [userId, applicationId]
    );
    return result.rows[0] || null;
  }

  async findUploadedDocument(userId, documentId) {
    const result = await db.query(
      'SELECT file_path FROM documents WHERE user_id = $1 AND document_id = $2',
      [userId, documentId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new LockerRepository();
