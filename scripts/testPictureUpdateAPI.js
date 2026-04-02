const http = require('http');
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_IMAGE_PATH = process.argv[2]; // Pass image path as argument
const RECORD_ID = process.argv[3] || '1'; // Pass record ID as argument

// Helper function to make multipart/form-data request
function uploadPicture(recordId, imagePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(imagePath)) {
      reject(new Error(`Image file not found: ${imagePath}`));
      return;
    }

    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const fileName = path.basename(imagePath);
    const fileContent = fs.readFileSync(imagePath);
    
    // Build multipart form data
    const formData = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="additionalDocuments"; filename="${fileName}"\r\n`),
      Buffer.from(`Content-Type: ${getContentType(fileName)}\r\n\r\n`),
      fileContent,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/records/${recordId}/picture`,
      method: 'PATCH',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formData.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    req.write(formData);
    req.end();
  });
}

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf'
  };
  return types[ext] || 'application/octet-stream';
}

async function testPictureUpdateAPI() {
  try {
    console.log('\n=== Testing Picture Update API ===\n');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Record ID: ${RECORD_ID}\n`);

    // Check if image path is provided
    if (!TEST_IMAGE_PATH) {
      console.log('❌ No image path provided!\n');
      console.log('Usage:');
      console.log('  node scripts/testPictureUpdateAPI.js <image-path> [record-id]\n');
      console.log('Example:');
      console.log('  node scripts/testPictureUpdateAPI.js C:\\Users\\YourName\\Pictures\\photo.jpg 1\n');
      
      // Check if any records exist
      console.log('Checking database for existing records...\n');
      const records = await pool.query('SELECT id, student_name FROM student_records LIMIT 5');
      
      if (records.rows.length > 0) {
        console.log('Available records to test with:');
        records.rows.forEach(record => {
          console.log(`  ID: ${record.id} - ${record.student_name}`);
        });
        console.log('');
      } else {
        console.log('⚠️  No records found in database.');
        console.log('Create a student record first.\n');
      }
      
      process.exit(1);
    }

    // Step 1: Check if record exists
    console.log('Step 1: Checking if record exists');
    const recordCheck = await pool.query(
      'SELECT id, student_name, additional_urls FROM student_records WHERE id = $1',
      [RECORD_ID]
    );

    if (recordCheck.rows.length === 0) {
      console.log(`❌ Record with ID ${RECORD_ID} not found!\n`);
      process.exit(1);
    }

    const record = recordCheck.rows[0];
    console.log(`✅ Record found: ${record.student_name}`);
    console.log(`   Current pictures: ${record.additional_urls ? record.additional_urls.length : 0}\n`);

    // Step 2: Upload new picture
    console.log('Step 2: Uploading new picture');
    console.log(`   Image: ${TEST_IMAGE_PATH}`);
    
    const response = await uploadPicture(RECORD_ID, TEST_IMAGE_PATH);

    if (response.statusCode === 200) {
      console.log('✅ Picture uploaded successfully!\n');
      
      console.log('Response:');
      console.log(`   Status: ${response.body.status}`);
      console.log(`   Message: ${response.body.message}\n`);
      
      if (response.body.data) {
        console.log('Updated Record:');
        console.log(`   ID: ${response.body.data.id}`);
        console.log(`   Student: ${response.body.data.studentName}`);
        console.log(`   Pictures: ${response.body.data.additionalUrls.length}\n`);
        
        if (response.body.data.additionalUrls.length > 0) {
          console.log('New Picture URL:');
          console.log(`   ${response.body.data.additionalUrls[0]}\n`);
        }
      }
    } else {
      console.log(`❌ Upload failed with status ${response.statusCode}\n`);
      console.log('Response:', response.body);
      process.exit(1);
    }

    // Step 3: Verify in database
    console.log('Step 3: Verifying in database');
    const verifyResult = await pool.query(
      'SELECT additional_urls FROM student_records WHERE id = $1',
      [RECORD_ID]
    );

    const updatedRecord = verifyResult.rows[0];
    console.log(`✅ Database updated`);
    console.log(`   New picture count: ${updatedRecord.additional_urls ? updatedRecord.additional_urls.length : 0}\n`);

    console.log('=== All Tests Passed! ===\n');
    console.log('✅ Picture update API is working correctly!\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Server is not running!');
      console.log('Start the server with: npm start\n');
    } else if (error.code === 'ENOENT') {
      console.log('\n⚠️  Image file not found!');
      console.log('Check the file path and try again.\n');
    } else {
      console.error('\nFull error:', error);
    }
    
    process.exit(1);
  }
}

// Run the test
testPictureUpdateAPI();
