require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  database: process.env.DB_NAME, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/003_add_session_year_source.sql'),
      'utf8'
    );
    await pool.query(sql);
    console.log('✅ Migration applied: session_year and source columns added');

    const check = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'student_records' AND column_name IN ('session_year', 'source')"
    );
    check.rows.forEach(r => console.log(' ✓', r.column_name, '-', r.data_type));
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
  } finally {
    pool.end();
  }
}

run();
