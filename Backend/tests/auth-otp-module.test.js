const test = require('node:test');
const assert = require('node:assert/strict');
const otpRepository = require('../src/modules/auth/otp.repository');
const { parseIdentifier, normalizePhone, normalizeIndianPhone, normalizeEmail, validateOtpCode } = require('../src/modules/auth/auth.validation');
const { maskTarget, sendOtpNotification } = require('../src/modules/auth/messaging.service');

test('Validation helpers parse email and phone accurately', () => {
  const emailRes = parseIdentifier('  User@Example.Com ');
  assert.equal(emailRes.type, 'EMAIL');
  assert.equal(emailRes.value, 'user@example.com');

  const phoneRes = parseIdentifier(' +1 (987) 654-3210 ');
  assert.equal(phoneRes.type, 'PHONE');
  assert.equal(phoneRes.value, '19876543210');

  assert.equal(normalizeIndianPhone('9876543210'), '+919876543210');
  assert.equal(normalizeIndianPhone('+919876543210'), '+919876543210');

  assert.throws(() => parseIdentifier('invalid-text'), /Please enter a valid phone number/i);
});

test('Masking helper masks email and phone for privacy', () => {
  assert.equal(maskTarget('john.doe@example.com', 'EMAIL'), 'j***e@example.com');
  assert.equal(maskTarget('9876543210', 'PHONE'), '******3210');
});

test('Messaging service requires Twilio configuration for WhatsApp', async () => {
  const emailDispatch = await sendOtpNotification({
    target: 'citizen@govbridge.in',
    type: 'EMAIL',
    otpCode: '852963',
    expiresMinutes: 5
  });
  assert.equal(emailDispatch.sentVia, 'EMAIL');
  assert.equal(emailDispatch.channel, 'Email Message');

  await assert.rejects(sendOtpNotification({
    target: '9876543210',
    type: 'PHONE',
    otpCode: '147258',
    expiresMinutes: 5
  }), /Twilio Verify environment variables/i);
});

test('OTP repository handles in-memory rate limiting and attempts without DB queries', async () => {
  const identifier = 'test_user@example.com';
  const otpCode = '123456';

  await otpRepository.saveOTP(identifier, otpCode);

  // Attempting to save again immediately triggers rate limit cooldown
  await assert.rejects(
    async () => await otpRepository.saveOTP(identifier, '654321'),
    /Please wait.*second/i
  );

  // Invalid OTP decreases attempts counter
  await assert.rejects(
    async () => await otpRepository.verifyOTP(identifier, '000000'),
    /Invalid OTP code. You have 2 attempt\(s\) remaining/i
  );

  // Correct OTP succeeds
  const verified = await otpRepository.verifyOTP(identifier, '123456');
  assert.equal(verified, true);

  // Reusing verified OTP throws expired error
  await assert.rejects(
    async () => await otpRepository.verifyOTP(identifier, '123456'),
    /OTP has expired or was not requested/i
  );
});

test('Validation functions throw clean errors on invalid input', () => {
  assert.throws(() => normalizeEmail('bademail'), /Please enter a valid email address/i);
  assert.throws(() => normalizePhone('123'), /Please enter a valid phone number/i);
  assert.throws(() => validateOtpCode('1234'), /OTP code must be a 6-digit number/i);
});
