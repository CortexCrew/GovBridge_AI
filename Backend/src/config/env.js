require('dotenv').config();

const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;

if (!dbHost || !dbHost.toLowerCase().endsWith('.postgres.database.azure.com')) {
  throw new Error('DB_HOST must point to an Azure Database for PostgreSQL server.');
}
if (!dbPort || !dbName || !dbUser || !dbPassword) {
  throw new Error('DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD must be configured.');
}
if (process.env.DB_SSL !== 'true') {
  throw new Error('DB_SSL=true is required for Azure Database for PostgreSQL.');
}

module.exports = {
  PORT: process.env.PORT || 5000,
  DB_USER: dbUser,
  DB_PASSWORD: dbPassword,
  DB_HOST: dbHost,
  DB_PORT: parseInt(dbPort, 10),
  DB_NAME: dbName,
  DB_SSL: true,
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretjwtkey',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  OTP_EXPIRATION_MINUTES: parseInt(process.env.OTP_EXPIRATION_MINUTES || '5', 10),
  OTP_RESEND_COOLDOWN_SECONDS: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10),

  // Email Configuration
  EMAIL_HOST: process.env.EMAIL_HOST || '',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'GovBridge AI <no-reply@govbridge.gov.in>',

  // Twilio Verify Configuration
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_VERIFY_SERVICE_SID: process.env.TWILIO_VERIFY_SERVICE_SID || '',

};

