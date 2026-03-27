-- Add approval_status column to student_records table
-- This migration adds support for approval/disapproval workflow

-- Create enum type for approval status (skip if already exists)
DO $$ BEGIN
    CREATE TYPE approval_status_enum AS ENUM ('approved', 'disapproved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add approval_status column (nullable to support existing records)
ALTER TABLE student_records 
ADD COLUMN IF NOT EXISTS approval_status approval_status_enum DEFAULT NULL;

-- Add columns to track who approved and when (optional but recommended)
ALTER TABLE student_records 
ADD COLUMN IF NOT EXISTS approved_by INTEGER;

ALTER TABLE student_records 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Add foreign key constraint if admin_users table exists
-- Uncomment the line below if you have an admin_users table
-- ALTER TABLE student_records ADD CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES admin_users(id);

-- Create index for filtering by approval status
CREATE INDEX IF NOT EXISTS idx_student_records_approval_status ON student_records(approval_status);
