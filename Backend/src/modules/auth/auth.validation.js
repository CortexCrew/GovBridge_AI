/**
 * Auth Validation Helpers
 */

/**
 * Clean and validate an email address
 * @param {string} email 
 * @returns {string} Lowercase trimmed email
 */
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email address is required');
  }
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error('Please enter a valid email address');
  }
  return trimmed;
}

/**
 * Clean and validate a 10-digit phone number
 * @param {string} phone 
 * @returns {string} Normalized numeric phone string
 */
function normalizePhone(phone) {
  if (!phone || (typeof phone !== 'string' && typeof phone !== 'number')) {
    throw new Error('Phone number is required');
  }
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Please enter a valid phone number (10 to 15 digits)');
  }
  return digits;
}

/**
 * Normalize an Indian mobile number to E.164 format: +91XXXXXXXXXX.
 * @param {string|number} phone
 * @returns {string} E.164-formatted Indian mobile number
 */
function normalizeIndianPhone(phone) {
  if (!phone || (typeof phone !== 'string' && typeof phone !== 'number')) {
    throw new Error('Phone number is required');
  }
  const digits = String(phone).replace(/\D/g, '');
  const nationalNumber = digits.startsWith('91') && digits.length === 12
    ? digits.slice(2)
    : digits;
  if (!/^[6-9]\d{9}$/.test(nationalNumber)) {
    throw new Error('Please enter a valid Indian mobile number');
  }
  return `+91${nationalNumber}`;
}

/**
 * Determine whether identifier is Email or Phone Number
 * @param {string} identifier 
 * @returns {{ type: 'EMAIL'|'PHONE', value: string }}
 */
function parseIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    throw new Error('Email or phone number identifier is required');
  }
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    return { type: 'EMAIL', value: normalizeEmail(trimmed) };
  } else {
    return { type: 'PHONE', value: normalizePhone(trimmed) };
  }
}

/**
 * Validate password strength
 * @param {string} password 
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
}

/**
 * Validate OTP code format
 * @param {string|number} otpCode 
 * @returns {string} Normalized 6-digit OTP code string
 */
function validateOtpCode(otpCode) {
  if (!otpCode) {
    throw new Error('OTP code is required');
  }
  const codeStr = String(otpCode).trim();
  if (!/^\d{6}$/.test(codeStr)) {
    throw new Error('OTP code must be a 6-digit number');
  }
  return codeStr;
}

module.exports = {
  normalizeEmail,
  normalizePhone,
  normalizeIndianPhone,
  parseIdentifier,
  validatePassword,
  validateOtpCode,
};
