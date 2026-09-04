const env = require('../../config/env');

/**
 * 100% In-Memory Store for OTPs and Pending Registration Payloads.
 * Strictly NO PostgreSQL tables or dynamic DB queries used here.
 */
const otpStore = new Map();
const pendingRegStore = new Map();

const DEFAULT_TTL_MS = (env.OTP_EXPIRATION_MINUTES || 5) * 60 * 1000;
const RESEND_COOLDOWN_MS = (env.OTP_RESEND_COOLDOWN_SECONDS || 60) * 1000;
const MAX_VERIFY_ATTEMPTS = 3;

// Periodic cleanup of expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();

  for (const [key, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(key);
    }
  }

  for (const [key, data] of pendingRegStore.entries()) {
    if (data.expiresAt < now) {
      pendingRegStore.delete(key);
    }
  }
}, 60 * 1000);

class OtpRepository {
  /**
  * Reserve an OTP request with cooldown. For phone OTPs, the code is owned by MSG91.
   * @param {string} identifier 
   * @param {string} otpCode 
   * @param {number} [ttlMs] 
   */
  async saveOTP(identifier, otpCode, ttlMs = DEFAULT_TTL_MS) {
    const key = identifier.trim().toLowerCase();
    const now = Date.now();
    const existing = otpStore.get(key);

    if (existing && existing.lastSentAt && (now - existing.lastSentAt) < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      throw new Error(`Please wait ${waitSec} second(s) before requesting a new OTP.`);
    }

    otpStore.set(key, {
      ...(otpCode ? { otpCode } : {}),
      expiresAt: now + ttlMs,
      createdAt: now,
      lastSentAt: now,
      attempts: 0,
    });
  }

  /**
   * Verify an OTP code against in-memory store
   * @param {string} identifier 
   * @param {string} otpCode 
   * @returns {boolean}
   */
  async verifyOTP(identifier, otpCode) {
    const key = identifier.trim().toLowerCase();
    const now = Date.now();
    const data = otpStore.get(key);

    if (!data) {
      throw new Error('OTP has expired or was not requested. Please request a new OTP.');
    }

    if (data.expiresAt < now) {
      otpStore.delete(key);
      throw new Error('OTP has expired. Please request a new OTP.');
    }

    if (data.attempts >= MAX_VERIFY_ATTEMPTS) {
      otpStore.delete(key);
      throw new Error('Maximum OTP verification attempts exceeded. Please request a new OTP.');
    }

    if (data.otpCode !== otpCode) {
      data.attempts += 1;
      const remaining = MAX_VERIFY_ATTEMPTS - data.attempts;
      if (remaining <= 0) {
        otpStore.delete(key);
        throw new Error('Maximum OTP verification attempts exceeded. Please request a new OTP.');
      }
      throw new Error(`Invalid OTP code. You have ${remaining} attempt(s) remaining.`);
    }

    // OTP verified successfully -> clear OTP from store
    otpStore.delete(key);
    return true;
  }

  /**
   * Save temporary pending registration data in memory until OTP is verified
   * @param {string} identifier 
   * @param {Object} payload 
   * @param {number} [ttlMs] 
   */
  async savePendingRegistration(identifier, payload, ttlMs = DEFAULT_TTL_MS) {
    const key = identifier.trim().toLowerCase();
    pendingRegStore.set(key, {
      payload,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Retrieve pending registration payload
   * @param {string} identifier 
   * @returns {Object|null}
   */
  async getPendingRegistration(identifier) {
    const key = identifier.trim().toLowerCase();
    const now = Date.now();
    const data = pendingRegStore.get(key);

    if (!data) return null;
    if (data.expiresAt < now) {
      pendingRegStore.delete(key);
      return null;
    }
    return data.payload;
  }

  /**
   * Delete pending registration payload
   * @param {string} identifier 
   */
  async deletePendingRegistration(identifier) {
    const key = identifier.trim().toLowerCase();
    pendingRegStore.delete(key);
    otpStore.delete(key);
  }
}

module.exports = new OtpRepository();
