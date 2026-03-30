const { pool } = require('../src/config/database');
const AdminUser = require('../src/models/AdminUser');

async function testSuperAdminFeatures() {
  try {
    console.log('\n=== Testing Super Admin Features ===\n');

    // Test 1: Check current super admin
    console.log('Test 1: Check existing super admin');
    const users = await AdminUser.getAllUsers();
    console.log(`  Found ${users.length} user(s)`);
    users.forEach(user => {
      console.log(`  - ${user.username}: ${user.is_super_admin ? 'Super Admin' : 'Regular Admin'} (${user.is_active ? 'Active' : 'Inactive'})`);
    });

    // Test 2: Create a regular admin user
    console.log('\nTest 2: Create regular admin user');
    const testUsername = 'testadmin_' + Date.now();
    const testPassword = 'testpass123';
    
    try {
      const newUser = await AdminUser.createAdminUser(testUsername, testPassword, false);
      console.log(`  ✅ Created user: ${newUser.username} (ID: ${newUser.id})`);
      console.log(`     Super Admin: ${newUser.is_super_admin}`);
      console.log(`     Active: ${newUser.is_active}`);

      // Test 3: Check if user can login
      console.log('\nTest 3: Verify new user credentials');
      const foundUser = await AdminUser.findByUsername(testUsername);
      if (foundUser) {
        const isValid = await AdminUser.verifyPassword(testPassword, foundUser.password_hash);
        console.log(`  ✅ Password verification: ${isValid ? 'Success' : 'Failed'}`);
      }

      // Test 4: Change user's password
      console.log('\nTest 4: Change user password');
      const newPassword = 'newpass456';
      await AdminUser.changePassword(newUser.id, newPassword);
      console.log(`  ✅ Password changed`);

      // Verify new password works
      const updatedUser = await AdminUser.findById(newUser.id);
      const isNewPasswordValid = await AdminUser.verifyPassword(newPassword, updatedUser.password_hash);
      console.log(`  ✅ New password verification: ${isNewPasswordValid ? 'Success' : 'Failed'}`);

      // Test 5: Deactivate user
      console.log('\nTest 5: Deactivate user');
      await AdminUser.updateUserStatus(newUser.id, false);
      const deactivatedUser = await AdminUser.findById(newUser.id);
      console.log(`  ✅ User deactivated: ${!deactivatedUser.is_active ? 'Success' : 'Failed'}`);

      // Test 6: Reactivate user
      console.log('\nTest 6: Reactivate user');
      await AdminUser.updateUserStatus(newUser.id, true);
      const reactivatedUser = await AdminUser.findById(newUser.id);
      console.log(`  ✅ User reactivated: ${reactivatedUser.is_active ? 'Success' : 'Failed'}`);

      // Test 7: Check super admin status
      console.log('\nTest 7: Check super admin status');
      const isSuperAdmin = await AdminUser.checkIsSuperAdmin(newUser.id);
      console.log(`  ✅ Is super admin: ${isSuperAdmin ? 'Yes' : 'No'} (Expected: No)`);

      // Test 8: Get all users again
      console.log('\nTest 8: Get all users');
      const allUsers = await AdminUser.getAllUsers();
      console.log(`  ✅ Total users: ${allUsers.length}`);

      // Test 9: Delete test user
      console.log('\nTest 9: Delete test user');
      await AdminUser.deleteUser(newUser.id);
      console.log(`  ✅ User deleted`);

      // Verify deletion
      const deletedUser = await AdminUser.findById(newUser.id);
      console.log(`  ✅ Deletion verified: ${!deletedUser ? 'Success' : 'Failed'}`);

    } catch (error) {
      console.error('  ❌ Error:', error.message);
    }

    console.log('\n=== All Tests Completed! ===\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testSuperAdminFeatures();
