const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  user: env.DB_USER,
  host: env.DB_HOST,
  database: env.DB_NAME,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
  ssl: env.DB_SSL ? { rejectUnauthorized: true } : undefined,
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
  getClient: () => pool.connect(),
  pool,
};
