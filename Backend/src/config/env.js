require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 5432,
  DB_NAME: process.env.DB_NAME || 'govbridge_db',
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretjwtkey',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
};
