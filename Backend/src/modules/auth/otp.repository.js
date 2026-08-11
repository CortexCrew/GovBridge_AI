const db = require('../../config/db');

// In-memory fallback store: Map<identifier, { otpCode, expiresAt }>()
const inMemoryOtpStore = new Map();

// Helper to clean up expired in-memory OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [identifier, data] of inMemoryOtpStore.entries()) {
    if (data.expiresAt < now) {
      inMemoryOtpStore.delete(identifier);
    }
  }
}, 60 * 1000);

class OtpRepository {
  /**
   * Save an OTP for a given email/phone identifier
   * @param {string} identifier - Email or Phone Number
   * @param {string} otpCode - 6-digit OTP
   * @param {number} expiresAtTimestamp - Unix timestamp in milliseconds when OTP expires
   */
  async saveOTP(identifier, otpCode, expiresAtTimestamp) {
    const key = identifier.trim().toLowerCase();

    // 1. Store in memory map for fast lookup
    inMemoryOtpStore.set(key, {
      otpCode,
      expiresAt: expiresAtTimestamp,
      createdAt: Date.now()
    });

    // 2. Try persisting to PostgreSQL if table exists
    try {
      await db.query(
        `CREATE TABLE IF NOT EXISTS otps (
          id SERIAL PRIMARY KEY,
          identifier VARCHAR(255) NOT NULL,
          otp_code VARCHAR(10) NOT NULL,
          expires_at BIGINT NOT NULL,
          created_at BIGINT NOT NULL
        )`
      );
      await db.query(
        `DELETE FROM otps WHERE LOWER(identifier) = $1`,
        [key]
      );
      await db.query(
        `INSERT INTO otps (identifier, otp_code, expires_at, created_at) VALUES ($1, $2, $3, $4)`,
        [key, otpCode, expiresAtTimestamp, Date.now()]
      );
    } catch (err) {
      // In dev environment without active DB, fallback gracefully to in-memory store
      console.warn('DB query in saveOTP fallback to memory store:', err.message);
    }
  }

  /**
   * Get and validate OTP for identifier
   * @param {string} identifier 
   * @param {string} otpCode 
   * @returns {boolean} True if valid and not expired
   */
  async verifyOTP(identifier, otpCode) {
    const key = identifier.trim().toLowerCase();
    const now = Date.now();

    // Check in-memory store
    const memData = inMemoryOtpStore.get(key);
    if (memData) {
      if (memData.otpCode === otpCode && memData.expiresAt > now) {
        return true;
      }
    }

    // Check DB store if available
    try {
      const res = await db.query(
        `SELECT otp_code, expires_at FROM otps WHERE LOWER(identifier) = $1 ORDER BY id DESC LIMIT 1`,
        [key]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        if (row.otp_code === otpCode && parseInt(row.expires_at, 10) > now) {
          return true;
        }
      }
    } catch (err) {
      console.warn('DB query in verifyOTP fallback:', err.message);
    }

    return false;
  }

  /**
   * Delete / invalidate OTP after successful verification
   * @param {string} identifier 
   */
  async deleteOTP(identifier) {
    const key = identifier.trim().toLowerCase();
    inMemoryOtpStore.delete(key);

    try {
      await db.query(`DELETE FROM otps WHERE LOWER(identifier) = $1`, [key]);
    } catch (err) {
      // Ignore fallback
    }
  }
}

module.exports = new OtpRepository();
