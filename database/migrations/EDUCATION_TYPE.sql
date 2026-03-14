-- Quick migration to add education_type field
-- Run this directly in your Neon database console or using psql

-- Add the column
ALTER TABLE student_records 
ADD COLUMN IF NOT EXISTS education_type VARCHAR(100);

-- Verify it was added
SELECT column_name, data_type, character_maximum_length, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'student_records' 
  AND column_name = 'education_type';
