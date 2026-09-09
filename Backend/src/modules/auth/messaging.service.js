const env = require('../../config/env');

const TWILIO_TIMEOUT_MS = 10000;

function getTwilioVerifyService() {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_VERIFY_SERVICE_SID) {
    throw new Error('Phone OTP delivery is not configured. Set the Twilio Verify environment variables.');
  }

  const twilio = require('twilio');
  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN, {
    timeout: TWILIO_TIMEOUT_MS,
  });
  return client.verify.v2.services(env.TWILIO_VERIFY_SERVICE_SID);
}

function maskTarget(target, type) {
  if (!target) return '';
  const str = String(target).trim();
  if (type === 'EMAIL') {
    const parts = str.split('@');
    if (parts.length !== 2) return str;
    const name = parts[0];
    return name.length <= 2
      ? `${name[0]}***@${parts[1]}`
      : `${name[0]}***${name[name.length - 1]}@${parts[1]}`;
  }
  const digits = str.replace(/\D/g, '');
  return digits.length <= 4 ? '****' : `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

async function sendOtpNotification({ target, type, otpCode, expiresMinutes }) {
  const masked = maskTarget(target, type);

  if (type === 'EMAIL') {
    if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) {
      throw new Error('Email delivery is not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS.');
    }
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT,
        secure: env.EMAIL_PORT === 465,
        auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
      });
      await transporter.sendMail({
        from: env.EMAIL_FROM || env.EMAIL_USER,
        to: target,
        subject: 'Your GovBridge AI Verification Code',
        text: `Your verification code is ${otpCode}. It will expire in ${expiresMinutes} minutes.`,
        html: `<p>Your GovBridge AI verification code is:</p><h1>${otpCode}</h1><p>It expires in ${expiresMinutes} minutes.</p>`,
      });
      console.log(`[EMAIL OTP DISPATCH] Email sent successfully to ${masked}`);
      return { sentVia: 'EMAIL', channel: 'Email Message', maskedTarget: masked };
    } catch (error) {
      console.error(`[EMAIL OTP DISPATCH] SMTP dispatch failed: ${error.message}`);
      throw new Error(`Unable to send OTP email: ${error.message}`);
    }
  }

  const verifyService = getTwilioVerifyService();
  try {
    await verifyService.verifications.create({
      to: target,
      channel: 'whatsapp',
    });
  } catch (error) {
    console.error(`[TWILIO OTP DISPATCH] WhatsApp dispatch failed for ${masked}: ${error.message}`);
    throw new Error('Unable to send OTP through WhatsApp. Please try again later.');
  }
  return { sentVia: 'WHATSAPP', channel: 'WhatsApp', maskedTarget: masked };
}

async function verifyOtpWithTwilio(phone, otpCode) {
  const verifyService = getTwilioVerifyService();
  try {
    const verification = await verifyService.verificationChecks.create({
      to: phone,
      code: otpCode,
    });
    if (verification.status !== 'approved') {
      throw new Error('Twilio did not approve the OTP');
    }
    return true;
  } catch (error) {
    if (error.message === 'Twilio did not approve the OTP') {
      throw new Error('Invalid or expired OTP. Please request a new OTP.');
    }
    console.error(`[TWILIO OTP VERIFY] WhatsApp verification failed: ${error.message}`);
    throw new Error('Unable to verify OTP through WhatsApp. Please try again later.');
  }
}

module.exports = { maskTarget, sendOtpNotification, verifyOtpWithTwilio };
