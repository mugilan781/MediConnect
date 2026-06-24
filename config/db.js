// ============================================================
// MediConnect – config/db.js
// MySQL connection pool using mysql2/promise
// ============================================================

const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+00:00',
  // Enable SSL for cloud-hosted MySQL (Aiven, TiDB, etc.)
  ...(env.NODE_ENV === 'production' && {
    ssl: { rejectUnauthorized: false }
  }),
});

module.exports = pool;
