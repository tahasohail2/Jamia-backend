const { Pool } = require('pg');
require('dotenv').config();

// Create test database pool
const testPool = new Pool({
  host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || process.env.DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || 'admission_system_test',
  user: process.env.TEST_DB_USER || process.env.DB_USER || 'admission_admin',
  password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD
});

// Setup: Create test schema before all tests
beforeAll(async () => {
  try {
    await testPool.query(`
      CREATE TABLE IF NOT EXISTS student_records (
        id SERIAL PRIMARY KEY,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Personal Information
        admission_type VARCHAR(50) NOT NULL,
        gender VARCHAR(20) NOT NULL,
        department VARCHAR(100) NOT NULL,
        student_name VARCHAR(200) NOT NULL,
        father_name VARCHAR(200) NOT NULL,
        dob DATE NOT NULL,
        cnic VARCHAR(15) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        whatsapp VARCHAR(20) NOT NULL,
        full_address TEXT NOT NULL,
        current_address TEXT NOT NULL,
        
        -- Academic Information
        required_grade VARCHAR(50) NOT NULL,
        previous_education VARCHAR(200) NOT NULL,
        registration_no VARCHAR(100) NOT NULL,
        last_year_grade VARCHAR(50) NOT NULL,
        next_year_grade VARCHAR(50) NOT NULL,
        
        -- Exam Marks
        exam_part1_marks VARCHAR(10) NOT NULL,
        exam_part2_marks VARCHAR(10) NOT NULL,
        total_marks VARCHAR(10) NOT NULL,
        
        -- Additional Information
        remarks TEXT NOT NULL
      );
    `);

    await testPool.query(`
      CREATE INDEX IF NOT EXISTS idx_student_records_cnic ON student_records(cnic);
    `);

    await testPool.query(`
      CREATE INDEX IF NOT EXISTS idx_student_records_submitted_at ON student_records(submitted_at DESC);
    `);

    console.log('Test database schema created');
  } catch (error) {
    console.error('Error creating test schema:', error);
    throw error;
  }
});

// Clear data before each test
beforeEach(async () => {
  try {
    await testPool.query('DELETE FROM student_records');
  } catch (error) {
    console.error('Error clearing test data:', error);
    throw error;
  }
});

// Cleanup: Close pool after all tests
afterAll(async () => {
  try {
    await testPool.end();
    console.log('Test database connection closed');
  } catch (error) {
    console.error('Error closing test pool:', error);
  }
});

module.exports = { testPool };
