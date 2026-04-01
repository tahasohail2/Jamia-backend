const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'admission_system',
  user: process.env.DB_USER || 'admission_admin',
  password: process.env.DB_PASSWORD,
  max: 20,                      // Maximum pool size
  idleTimeoutMillis: 30000,     // Close idle clients after 30 seconds
  connectionTimeoutMillis: 30000, // 30 seconds for Neon cold starts
  ssl: {
    rejectUnauthorized: false   // Required for cloud databases like Neon
  }
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch (error) {
    // Log error without exposing sensitive connection details
    console.error(`[${new Date().toISOString()}] Database connection failed. Please verify your database configuration.`);
    return false;
  }
};

// Handle pool errors
pool.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] Database connection error occurred`);
});

// Graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error closing database connection pool`);
  }
};

module.exports = {
  pool,
  testConnection,
  closePool
};
