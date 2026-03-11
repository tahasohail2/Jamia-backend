const { z } = require('zod');

// CNIC format: XXXXX-XXXXXXX-X (5 digits, hyphen, 7 digits, hyphen, 1 digit)
const cnicRegex = /^\d{5}-\d{7}-\d$/;

// Phone format: digits and hyphens only
const phoneRegex = /^[\d-]+$/;

// Date format: YYYY-MM-DD
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Numeric string validation
const numericStringRegex = /^\d+(\.\d+)?$/;

// Zod schema for student record validation
const studentRecordSchema = z.object({
  admissionType: z.string().min(1, 'Admission type is required'),
  gender: z.string().min(1, 'Gender is required'),
  department: z.string().min(1, 'Department is required'),
  studentName: z.string().min(1, 'Student name is required'),
  fatherName: z.string(), // Optional
  dob: z.string()
    .min(1, 'Date of birth is required')
    .regex(dateRegex, 'Date of birth must be in YYYY-MM-DD format'),
  cnic: z.string()
    .min(1, 'CNIC is required')
    .regex(cnicRegex, 'CNIC must be in format XXXXX-XXXXXXX-X'),
  phone: z.string()
    .min(1, 'Phone is required')
    .regex(phoneRegex, 'Phone must contain only digits and hyphens'),
  whatsapp: z.string()
    .regex(phoneRegex, 'WhatsApp must contain only digits and hyphens')
    .or(z.literal('')), // Allow empty string
  fullAddress: z.string(), // Optional
  currentAddress: z.string().min(1, 'Current address is required'),
  // Conditional fields - allow empty strings
  requiredGrade: z.string(),
  previousEducation: z.string(),
  registrationNo: z.string(),
  lastYearGrade: z.string(),
  nextYearGrade: z.string(),
  examPart1Marks: z.string()
    .regex(numericStringRegex, 'Exam part 1 marks must be a valid number')
    .or(z.literal('')), // Allow empty string
  examPart2Marks: z.string()
    .regex(numericStringRegex, 'Exam part 2 marks must be a valid number')
    .or(z.literal('')), // Allow empty string
  totalMarks: z.string()
    .regex(numericStringRegex, 'Total marks must be a valid number')
    .or(z.literal('')), // Allow empty string
  remarks: z.string() // Optional
});

// Validation middleware
const validateRecord = (req, res, next) => {
  try {
    studentRecordSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    next(error);
  }
};

module.exports = {
  studentRecordSchema,
  validateRecord
};
