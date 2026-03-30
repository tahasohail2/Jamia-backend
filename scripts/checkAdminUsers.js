const { pool } = require('../src/config/database');

async function checkAdminUsers() {
  try {
    // Get table structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'admin_users'
      ORDER BY ordinal_position
    `);

    console.log('\n=== Admin Users Table Structure ===');
    console.log('Columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Get admin users
    const users = await pool.query('SELECT * FROM admin_users');
    
    console.log('\n=== Existing Admin Users ===');
    console.log(`Total users: ${users.rows.length}\n`);
    
    if (users.rows.length > 0) {
      users.rows.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Username: ${user.username}`);
        console.log(`  Created: ${user.created_at}`);
        console.log(`  Last Login: ${user.last_login || 'Never'}`);
        if (user.is_active !== undefined) {
          console.log(`  Active: ${user.is_active}`);
        }
        if (user.is_super_admin !== undefined) {
          console.log(`  Super Admin: ${user.is_super_admin}`);
        }
        console.log('');
      });
    } else {
      console.log('No admin users found.');
      console.log('\nCreate one with: node scripts/createSuperAdmin.js\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAdminUsers();
