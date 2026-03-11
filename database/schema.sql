-- Database setup script for student admission system

-- Create database (run as postgres superuser)
-- CREATE DATABASE admission_system;
-- CREATE USER admission_admin WITH PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE admission_system TO admission_admin;

-- Connect to admission_system database before running below

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO admission_admin;

-- Create student_records table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_records_cnic ON student_records(cnic);
CREATE INDEX IF NOT EXISTS idx_student_records_submitted_at ON student_records(submitted_at DESC);
