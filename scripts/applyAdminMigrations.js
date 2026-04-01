const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function applyMigrations() {
  try {
    console.log('Starting admin panel migrations...\n');

    // Read migration files
    const migration1 = fs.readFileSync(
      path.join(__dirname, '../database/migrations/001_create_admin_users.sql'),
      'utf8'
    );
    const migration2 = fs.readFileSync(
      path.join(__dirname, '../database/migrations/002_create_audit_log.sql'),
      'utf8'
    );

    // Apply migration 1: Create admin_users table
    console.log('Applying migration 001_create_admin_users.sql...');
    await pool.query(migration1);
    console.log('✓ Admin users table created\n');

    // Apply migration 2: Create audit_log table
    console.log('Applying migration 002_create_audit_log.sql...');
    await pool.query(migration2);
    console.log('✓ Audit log table created\n');

    // Verify default admin user
    const result = await pool.query('SELECT username FROM admin_users WHERE username = $1', ['admin']);
    if (result.rows.length > 0) {
      console.log('✓ Default admin user exists');
      console.log('  Username: admin');
      console.log('  ⚠️  Please change the default password immediately!\n');
    }

    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigrations();
