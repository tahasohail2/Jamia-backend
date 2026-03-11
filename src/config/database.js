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
  connectionTimeoutMillis: 2000 // Return error after 2 seconds if no connection available
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log(`[${new Date().toISOString()}] Database connected successfully`);
    console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`  Database: ${process.env.DB_NAME || 'admission_system'}`);
    client.release();
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database connection failed:`, error.message);
    return false;
  }
};

// Handle pool errors
pool.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] Unexpected database error:`, err);
});

// Graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
    console.log(`[${new Date().toISOString()}] Database connection pool closed`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error closing pool:`, error.message);
  }
};

module.exports = {
  pool,
  testConnection,
  closePool
};
