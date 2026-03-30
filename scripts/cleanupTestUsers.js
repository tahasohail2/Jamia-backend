const { pool } = require('../src/config/database');

async function cleanup() {
  try {
    const result = await pool.query(
      "DELETE FROM admin_users WHERE username LIKE 'testadmin_%' RETURNING username"
    );
    
    if (result.rows.length > 0) {
      console.log(`Deleted ${result.rows.length} test user(s):`);
      result.rows.forEach(row => console.log(`  - ${row.username}`));
    } else {
      console.log('No test users to clean up');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

cleanup();
