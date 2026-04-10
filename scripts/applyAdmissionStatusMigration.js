const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function run() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/ADD_ADMISSION_STATUS.sql'),
      'utf8'
    );

    console.log('Applying ADD_ADMISSION_STATUS migration...');
    await pool.query(sql);
    console.log('✓ app_settings table created and seeded');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

run();
