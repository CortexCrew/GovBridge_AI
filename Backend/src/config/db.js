<<<<<<< HEAD
// Database configuration mod
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

module.exports = pool;
=======
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  user: env.DB_USER,
  host: env.DB_HOST,
  database: env.DB_NAME,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: async () => {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT NOW()');
      console.log('Database connected at:', res.rows[0].now);
    } finally {
      client.release();
    }
  },
  pool
};
>>>>>>> origin/main
