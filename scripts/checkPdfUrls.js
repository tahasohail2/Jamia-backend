require('dotenv').config();
const { pool } = require('../src/config/database');
const https = require('https');

// Test if a URL is accessible
function testUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ url, status: res.statusCode });
    }).on('error', (err) => {
      resolve({ url, status: 'ERROR', error: err.message });
    });
  });
}

async function checkUrls() {
  try {
    const result = await pool.query(`
      SELECT id, certificate_urls, cnic_urls, additional_urls 
      FROM student_records 
      WHERE certificate_urls != '{}' OR cnic_urls != '{}' OR additional_urls != '{}'
      LIMIT 5
    `);

    console.log(`Found ${result.rows.length} records with documents\n`);

    for (const row of result.rows) {
      const allUrls = [
        ...(row.certificate_urls || []),
        ...(row.cnic_urls || []),
        ...(row.additional_urls || [])
      ].filter(u => u.includes('.pdf'));

      if (allUrls.length > 0) {
        console.log(`Record ID ${row.id} - PDF URLs:`);
        for (const url of allUrls) {
          const result = await testUrl(url);
          console.log(`  ${result.status === 200 ? '✓' : '✗'} [${result.status}] ${url}`);

          // Also test the alternative URL
          if (url.includes('/image/upload/')) {
            const rawUrl = url.replace('/image/upload/', '/raw/upload/');
            const rawResult = await testUrl(rawUrl);
            console.log(`  ${rawResult.status === 200 ? '✓' : '✗'} [${rawResult.status}] ${rawUrl} (raw)`);
          } else if (url.includes('/raw/upload/')) {
            const imageUrl = url.replace('/raw/upload/', '/image/upload/');
            const imageResult = await testUrl(imageUrl);
            console.log(`  ${imageResult.status === 200 ? '✓' : '✗'} [${imageResult.status}] ${imageUrl} (image)`);
          }
        }
        console.log('');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUrls();
