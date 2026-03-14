const { pool } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function addEducationTypeField() {
  let client;
  try {
    console.log('Starting migration: Add education_type field...\n');

    // Get a client from the pool
    client = await pool.connect();
    console.log('✓ Connected to database\n');

    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'student_records' AND column_name = 'education_type'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ Column education_type already exists!');
      client.release();
      await pool.end();
      process.exit(0);
    }

    // Add the column
    await client.query(`
      ALTER TABLE student_records 
      ADD COLUMN education_type VARCHAR(100)
    `);

    console.log('✓ Migration completed successfully!');
    console.log('✓ education_type column added to student_records table\n');

    // Verify the column exists
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'student_records' AND column_name = 'education_type'
    `);

    if (result.rows.length > 0) {
      console.log('Column details:');
      console.log(result.rows[0]);
    }

    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    if (client) client.release();
    await pool.end();
    process.exit(1);
  }
}

addEducationTypeField();
