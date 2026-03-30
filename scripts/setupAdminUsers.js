const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function setupAdminUsers() {
  try {
    console.log('=== Setting up Admin Users and Audit Log ===\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/CREATE_ADMIN_USERS.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration: CREATE_ADMIN_USERS.sql...');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!\n');

    // Check if tables were created
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('admin_users', 'admin_audit_log')
      ORDER BY table_name
    `);

    console.log('Tables created:');
    tablesCheck.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Check if any admin users exist
    const adminCount = await pool.query('SELECT COUNT(*) FROM admin_users');
    const count = parseInt(adminCount.rows[0].count);

    console.log(`\nAdmin users in database: ${count}`);

    if (count === 0) {
      console.log('\n⚠️  No admin users found!');
      console.log('Run the following command to create a super admin:');
      console.log('  node scripts/createSuperAdmin.js\n');
    } else {
      console.log('\n✓ Admin users already exist');
      console.log('You can create additional users with:');
      console.log('  node scripts/createSuperAdmin.js\n');
    }

    console.log('Setup completed successfully! 🎉\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('already exists')) {
      console.log('\n💡 Tables already exist. This is fine!');
      console.log('You can proceed to create an admin user:');
      console.log('  node scripts/createSuperAdmin.js\n');
      process.exit(0);
    } else {
      console.error('\nFull error:', error);
      process.exit(1);
    }
  }
}

// Run the setup
setupAdminUsers();
