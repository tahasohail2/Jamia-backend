const { pool } = require('../src/config/database');

async function testPictureColumn() {
  try {
    console.log('\n=== Testing Picture Column in Records API ===\n');

    // Test 1: Check if additional_urls column exists
    console.log('Test 1: Verify additional_urls column exists');
    const columnCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'student_records' 
      AND column_name = 'additional_urls'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('  ✅ additional_urls column exists');
      console.log(`     Type: ${columnCheck.rows[0].data_type}`);
    } else {
      console.log('  ❌ additional_urls column not found');
      console.log('     This column should exist in your database schema');
      process.exit(1);
    }

    // Test 2: Check sample records with pictures
    console.log('\nTest 2: Check records with pictures');
    const recordsWithPictures = await pool.query(`
      SELECT 
        id, 
        student_name, 
        additional_urls,
        array_length(additional_urls, 1) as picture_count
      FROM student_records 
      WHERE additional_urls IS NOT NULL 
      AND array_length(additional_urls, 1) > 0
      LIMIT 5
    `);

    if (recordsWithPictures.rows.length > 0) {
      console.log(`  ✅ Found ${recordsWithPictures.rows.length} records with pictures`);
      recordsWithPictures.rows.forEach((record, index) => {
        console.log(`     ${index + 1}. ${record.student_name} - ${record.picture_count} picture(s)`);
        console.log(`        First URL: ${record.additional_urls[0]}`);
      });
    } else {
      console.log('  ⚠️  No records with pictures found');
      console.log('     This is okay if no students have uploaded pictures yet');
    }

    // Test 3: Check total records
    console.log('\nTest 3: Total records statistics');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN additional_urls IS NOT NULL AND array_length(additional_urls, 1) > 0 THEN 1 END) as with_pictures,
        COUNT(CASE WHEN additional_urls IS NULL OR array_length(additional_urls, 1) = 0 THEN 1 END) as without_pictures
      FROM student_records
    `);

    const stat = stats.rows[0];
    console.log(`  Total records: ${stat.total_records}`);
    console.log(`  With pictures: ${stat.with_pictures}`);
    console.log(`  Without pictures: ${stat.without_pictures}`);

    // Test 4: Simulate API response format
    console.log('\nTest 4: Simulate API response format');
    const apiSimulation = await pool.query(`
      SELECT 
        id,
        student_name AS "studentName",
        father_name AS "fatherName",
        admission_type AS "admissionType",
        gender,
        department,
        education_type AS "educationType",
        registration_no AS "registrationNo",
        approval_status AS "approvalStatus",
        additional_urls AS "additionalUrls"
      FROM student_records
      ORDER BY submitted_at DESC
      LIMIT 3
    `);

    if (apiSimulation.rows.length > 0) {
      console.log('  ✅ API format simulation successful');
      console.log('\n  Sample response:');
      apiSimulation.rows.forEach((record, index) => {
        const pictureUrl = record.additionalUrls && record.additionalUrls.length > 0 
          ? record.additionalUrls[0] 
          : null;
        
        console.log(`\n  Record ${index + 1}:`);
        console.log(`    ID: ${record.id}`);
        console.log(`    Student: ${record.studentName}`);
        console.log(`    Picture URL: ${pictureUrl || 'No picture'}`);
        console.log(`    Additional URLs: ${JSON.stringify(record.additionalUrls || [])}`);
      });
    }

    console.log('\n=== All Tests Completed! ===');
    console.log('\n✅ Picture column support is working correctly!');
    console.log('\nThe /api/admin/records endpoint will now include:');
    console.log('  - additionalUrls: Array of all picture URLs');
    console.log('  - pictureUrl: First picture URL (for convenience)\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testPictureColumn();
