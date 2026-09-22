const db = require('../../config/db');

class LockerRepository {
  /**
   * Create digital_locker table if it doesn't exist, and enforce the
   * composite primary key (user_id, application_id) on pre-existing tables
   * that predate this constraint.
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
      ALTER TABLE digital_locker ALTER COLUMN application_id SET NOT NULL;
    `);

    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'digital_locker_pkey'
        ) THEN
          ALTER TABLE digital_locker ADD CONSTRAINT digital_locker_pkey PRIMARY KEY (user_id, application_id);
        END IF;
      END $$;
    `);
  }

  /**
   * Insert or replace the locker entry for a given application.
   * @param {number} userId
   * @param {number} applicationId
   * @param {string} filePath
   */
  async upsertEntry(userId, applicationId, filePath) {
    const query = `
      INSERT INTO digital_locker (user_id, application_id, file_path)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, application_id)
      DO UPDATE SET file_path = EXCLUDED.file_path
      RETURNING user_id, application_id, file_path;
    `;
    const result = await db.query(query, [userId, applicationId, filePath]);
    return result.rows[0];
  }

  /**
   * Get all locker entries belonging to a citizen, with certificate details.
   * @param {number} userId
   */
  async getByUser(userId) {
    const query = `
      SELECT
        dl.user_id,
        dl.application_id,
        dl.file_path,
        ca.certificate_type,
        ca.status,
        ca.application_date
      FROM digital_locker dl
      INNER JOIN certificate_applications ca ON ca.application_id = dl.application_id
      WHERE dl.user_id = $1
      ORDER BY ca.application_date DESC;
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }
}

module.exports = new LockerRepository();
