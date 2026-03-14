-- Migration: Add education_type column to student_records table
-- Date: 2026-03-13
-- Description: Adds education_type field for دینی / عصری تعلیم

-- Add the column (will be NULL for existing records)
ALTER TABLE student_records 
ADD COLUMN IF NOT EXISTS education_type VARCHAR(100);

-- Optional: Set a default value for existing records if needed
-- UPDATE student_records SET education_type = '' WHERE education_type IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'student_records' AND column_name = 'education_type';
