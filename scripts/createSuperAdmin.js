const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createSuperAdmin() {
  try {
    console.log('\n=== Create Super Admin User ===\n');

    // Check if admin user already exists
    const existingAdmin = await pool.query('SELECT COUNT(*) FROM admin_users');
    const adminCount = parseInt(existingAdmin.rows[0].count);

    if (adminCount > 0) {
      console.log(`⚠️  Warning: ${adminCount} admin user(s) already exist in the database.`);
      const proceed = await question('Do you want to create another admin user? (yes/no): ');
      
      if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
        console.log('Operation cancelled.');
        rl.close();
        process.exit(0);
      }
    }

    // Get username
    let username = await question('Enter username (default: admin): ');
    username = username.trim() || 'admin';

    // Check if username already exists
    const userCheck = await pool.query(
      'SELECT id FROM admin_users WHERE username = $1',
      [username]
    );

    if (userCheck.rows.length > 0) {
      console.log(`❌ Error: Username "${username}" already exists.`);
      rl.close();
      process.exit(1);
    }

    // Get password
    let password = await question('Enter password (minimum 6 characters): ');
    
    if (password.length < 6) {
      console.log('❌ Error: Password must be at least 6 characters long.');
      rl.close();
      process.exit(1);
    }

    // Confirm password
    const confirmPassword = await question('Confirm password: ');
    
    if (password !== confirmPassword) {
      console.log('❌ Error: Passwords do not match.');
      rl.close();
      process.exit(1);
    }

    // Hash password
    console.log('\nHashing password...');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert admin user
    console.log('Creating admin user...');
    const result = await pool.query(
      `INSERT INTO admin_users (username, password_hash, is_super_admin, is_active)
       VALUES ($1, $2, TRUE, TRUE)
       RETURNING id, username, created_at`,
      [username, passwordHash]
    );

    const newAdmin = result.rows[0];

    console.log('\n✅ Super admin user created successfully!\n');
    console.log('Details:');
    console.log('  ID:', newAdmin.id);
    console.log('  Username:', newAdmin.username);
    console.log('  Created:', newAdmin.created_at);
    console.log('\n⚠️  IMPORTANT: Store these credentials securely!');
    console.log('  Username:', username);
    console.log('  Password:', password);
    console.log('\n💡 You can change the password after logging in.\n');

    rl.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error creating super admin:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Run the script
createSuperAdmin();
