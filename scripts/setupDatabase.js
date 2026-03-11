const { Pool } = require('pg');
require('dotenv').config();

const setupDatabase = async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'admission_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  });

  try {
    console.log('Connecting to database...');
    
    // Create table
    await pool.query(`
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
    console.log('✓ Table student_records created');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_student_records_cnic ON student_records(cnic);
    `);
    console.log('✓ Index on cnic created');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_student_records_submitted_at ON student_records(submitted_at DESC);
    `);
    console.log('✓ Index on submitted_at created');

    // Verify table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'student_records'
      ORDER BY ordinal_position;
    `);

    console.log('\nTable structure:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    console.log('\n✓ Database setup completed successfully!');
    
  } catch (error) {
    console.error('✗ Error setting up database:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

setupDatabase();
