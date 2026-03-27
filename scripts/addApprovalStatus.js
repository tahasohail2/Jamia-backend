const { pool } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function addApprovalStatus() {
  try {
    console.log('Starting approval status migration...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../database/migrations/ADD_APPROVAL_STATUS.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✓ Approval status migration completed successfully');
    console.log('✓ Added approval_status column to student_records table');
    console.log('✓ Added approved_by and approved_at columns');
    console.log('✓ Created index for approval_status');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    
    // Check if the column already exists
    if (error.message.includes('already exists')) {
      console.log('✓ Approval status column already exists - skipping migration');
      process.exit(0);
    }
    
    process.exit(1);
  }
}

addApprovalStatus();
