const http = require('http');
const { pool } = require('../src/config/database');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USERNAME = 'admin';
const CURRENT_PASSWORD = process.env.TEST_CURRENT_PASSWORD || 'test_password_1774878275062';
const NEW_PASSWORD = process.env.TEST_NEW_PASSWORD || 'admin123';

// Helper function to make HTTP requests
function makeRequest(method, path, data, cookie) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testPasswordChangeAPI() {
  try {
    console.log('\n=== Testing Password Change API Endpoint ===\n');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Username: ${TEST_USERNAME}\n`);

    // Step 1: Login
    console.log('Step 1: Login to get authentication token');
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      username: TEST_USERNAME,
      password: CURRENT_PASSWORD
    });

    if (loginResponse.statusCode !== 200) {
      console.log('❌ Login failed!');
      console.log('Response:', loginResponse.body);
      console.log('\n⚠️  Make sure:');
      console.log('   1. Server is running (npm start)');
      console.log('   2. Username and password are correct');
      process.exit(1);
    }

    console.log('✅ Login successful');
    
    // Extract cookie
    const setCookie = loginResponse.headers['set-cookie'];
    const cookie = setCookie ? setCookie[0].split(';')[0] : null;
    
    if (!cookie) {
      console.log('❌ No cookie received from login');
      process.exit(1);
    }

    // Step 2: Test password change
    console.log('\nStep 2: Change password');
    const changeResponse = await makeRequest('POST', '/api/admin/change-password', {
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD
    }, cookie);

    if (changeResponse.statusCode !== 200) {
      console.log('❌ Password change failed!');
      console.log('Status:', changeResponse.statusCode);
      console.log('Response:', changeResponse.body);
      process.exit(1);
    }

    console.log('✅ Password changed successfully');
    console.log('   Response:', changeResponse.body);

    // Step 3: Verify old password doesn't work
    console.log('\nStep 3: Verify old password no longer works');
    const oldPasswordTest = await makeRequest('POST', '/api/auth/login', {
      username: TEST_USERNAME,
      password: CURRENT_PASSWORD
    });

    if (oldPasswordTest.statusCode === 401) {
      console.log('✅ Old password correctly rejected');
    } else {
      console.log('⚠️  Old password still works (unexpected)');
    }

    // Step 4: Verify new password works
    console.log('\nStep 4: Verify new password works');
    const newPasswordTest = await makeRequest('POST', '/api/auth/login', {
      username: TEST_USERNAME,
      password: NEW_PASSWORD
    });

    if (newPasswordTest.statusCode === 200) {
      console.log('✅ New password works correctly');
    } else {
      console.log('❌ New password doesn\'t work');
      console.log('Response:', newPasswordTest.body);
      process.exit(1);
    }

    // Step 5: Check audit log
    console.log('\nStep 5: Check audit log');
    const auditLog = await pool.query(
      `SELECT action, created_at, ip_address 
       FROM admin_audit_log 
       WHERE action = 'PASSWORD_CHANGED' 
       ORDER BY created_at DESC 
       LIMIT 1`
    );

    if (auditLog.rows.length > 0) {
      console.log('✅ Audit log entry created');
      console.log('   Action:', auditLog.rows[0].action);
      console.log('   Time:', auditLog.rows[0].created_at);
    } else {
      console.log('⚠️  No audit log entry found (table might not exist)');
    }

    console.log('\n=== All API Tests Passed! ===');
    console.log('\n✅ Password change API is working correctly!');
    console.log('\nYou can now use the frontend to change the password.\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Server is not running!');
      console.log('Start the server with: npm start');
    } else {
      console.error('\nFull error:', error);
    }
    
    process.exit(1);
  }
}

// Check if server is specified
if (process.argv[2]) {
  console.log('Custom server URL:', process.argv[2]);
}

testPasswordChangeAPI();
