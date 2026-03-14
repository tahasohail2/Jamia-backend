-- Add document upload fields to student_records table
-- Run this in your Neon database console

-- Remove old columns if they exist
ALTER TABLE student_records 
DROP COLUMN IF EXISTS document_url,
DROP COLUMN IF EXISTS document_public_id;

-- Add new array columns for multiple documents
ALTER TABLE student_records 
ADD COLUMN IF NOT EXISTS certificate_urls TEXT[],
ADD COLUMN IF NOT EXISTS cnic_urls TEXT[],
ADD COLUMN IF NOT EXISTS additional_urls TEXT[];

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'student_records' 
  AND column_name IN ('certificate_urls', 'cnic_urls', 'additional_urls');
