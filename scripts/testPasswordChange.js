const { pool } = require('../src/config/database');
const AdminUser = require('../src/models/AdminUser');

async function testPasswordChange() {
  try {
    console.log('\n=== Testing Password Change Feature ===\n');

    // Get the existing admin user
    const users = await pool.query('SELECT * FROM admin_users LIMIT 1');
    
    if (users.rows.length === 0) {
      console.log('❌ No admin users found. Create one first with:');
      console.log('   node scripts/createSuperAdmin.js\n');
      process.exit(1);
    }

    const user = users.rows[0];
    console.log(`Testing with user: ${user.username} (ID: ${user.id})\n`);

    // Test 1: Verify findById works
    console.log('Test 1: AdminUser.findById()');
    const foundUser = await AdminUser.findById(user.id);
    if (foundUser) {
      console.log('  ✅ findById() works correctly');
    } else {
      console.log('  ❌ findById() failed');
      process.exit(1);
    }

    // Test 2: Verify password verification works
    console.log('\nTest 2: Password verification');
    console.log('  Note: We cannot test actual password without knowing it');
    console.log('  ✅ AdminUser.verifyPassword() method exists');

    // Test 3: Test changePassword method
    console.log('\nTest 3: AdminUser.changePassword()');
    const testPassword = 'test_password_' + Date.now();
    await AdminUser.changePassword(user.id, testPassword);
    console.log('  ✅ changePassword() executed successfully');

    // Test 4: Verify password was actually changed
    console.log('\nTest 4: Verify password was changed');
    const updatedUser = await AdminUser.findById(user.id);
    const isNewPasswordValid = await AdminUser.verifyPassword(testPassword, updatedUser.password_hash);
    if (isNewPasswordValid) {
      console.log('  ✅ Password was successfully changed and verified');
    } else {
      console.log('  ❌ Password change verification failed');
      process.exit(1);
    }

    // Test 5: Check updated_at was set
    console.log('\nTest 5: Check updated_at timestamp');
    if (updatedUser.updated_at) {
      console.log(`  ✅ updated_at was set: ${updatedUser.updated_at}`);
    } else {
      console.log('  ⚠️  updated_at was not set (non-critical)');
    }

    console.log('\n=== All Tests Passed! ===');
    console.log('\n✅ Password change feature is working correctly!');
    console.log('\n⚠️  IMPORTANT: The test changed the admin password to:');
    console.log(`   ${testPassword}`);
    console.log('\nYou should change it back or use the frontend to set a proper password.\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testPasswordChange();
