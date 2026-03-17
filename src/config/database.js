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
    console.log(`[${new Date().toISOString()}] Attempting database connection...`);
    console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`  Database: ${process.env.DB_NAME || 'admission_system'}`);
    console.log(`  User: ${process.env.DB_USER || 'admission_admin'}`);
    console.log(`  (Neon databases may take 10-30 seconds to wake up from sleep)`);
    
    const client = await pool.connect();
    console.log(`[${new Date().toISOString()}] Database connected successfully ✓`);
    client.release();
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database connection failed:`, error.message);
    console.error(`\nTroubleshooting tips:`);
    console.error(`  1. Check if your Neon database is active (may be sleeping)`);
    console.error(`  2. Verify credentials in .env file`);
    console.error(`  3. Check your internet connection`);
    console.error(`  4. Try connecting via Neon dashboard first`);
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
