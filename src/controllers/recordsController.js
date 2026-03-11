const { pool } = require('../config/database');

// Helper function to convert camelCase to snake_case
const toSnakeCase = (str) => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

// Helper function to convert snake_case to camelCase
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Helper function to map database row to API response
const mapRowToRecord = (row) => {
  return {
    id: row.id,
    submittedAt: row.submitted_at,
    admissionType: row.admission_type,
    gender: row.gender,
    department: row.department,
    studentName: row.student_name,
    fatherName: row.father_name,
    dob: row.dob,
    cnic: row.cnic,
    phone: row.phone,
    whatsapp: row.whatsapp,
    fullAddress: row.full_address,
    currentAddress: row.current_address,
    requiredGrade: row.required_grade,
    previousEducation: row.previous_education,
    registrationNo: row.registration_no,
    lastYearGrade: row.last_year_grade,
    nextYearGrade: row.next_year_grade,
    examPart1Marks: row.exam_part1_marks,
    examPart2Marks: row.exam_part2_marks,
    totalMarks: row.total_marks,
    remarks: row.remarks
  };
};

// POST /api/records - Create a new student record
const createRecord = async (req, res, next) => {
  try {
    const {
      admissionType,
      gender,
      department,
      studentName,
      fatherName,
      dob,
      cnic,
      phone,
      whatsapp,
      fullAddress,
      currentAddress,
      requiredGrade,
      previousEducation,
      registrationNo,
      lastYearGrade,
      nextYearGrade,
      examPart1Marks,
      examPart2Marks,
      totalMarks,
      remarks
    } = req.body;

    const query = `
      INSERT INTO student_records (
        admission_type, gender, department, student_name, father_name,
        dob, cnic, phone, whatsapp, full_address, current_address,
        required_grade, previous_education, registration_no,
        last_year_grade, next_year_grade, exam_part1_marks,
        exam_part2_marks, total_marks, remarks
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      admissionType, gender, department, studentName, fatherName,
      dob, cnic, phone, whatsapp, fullAddress, currentAddress,
      requiredGrade, previousEducation, registrationNo,
      lastYearGrade, nextYearGrade, examPart1Marks,
      examPart2Marks, totalMarks, remarks
    ];

    const result = await pool.query(query, values);
    const record = mapRowToRecord(result.rows[0]);

    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
};

// GET /api/records - Retrieve all student records
const getAllRecords = async (req, res, next) => {
  try {
    const query = `
      SELECT * FROM student_records
      ORDER BY submitted_at DESC
    `;

    const result = await pool.query(query);
    const records = result.rows.map(mapRowToRecord);

    res.status(200).json(records);
  } catch (error) {
    next(error);
  }
};

// GET /api/records/:id - Retrieve a specific student record by ID
const getRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM student_records
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Record not found',
        details: { id }
      });
    }

    const record = mapRowToRecord(result.rows[0]);
    res.status(200).json(record);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/records/:id - Delete a specific student record by ID
const deleteRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      DELETE FROM student_records
      WHERE id = $1
      RETURNING id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Record not found',
        details: { id }
      });
    }

    res.status(200).json({
      message: 'Record deleted successfully',
      id: parseInt(id)
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/records - Delete all student records
const deleteAllRecords = async (req, res, next) => {
  try {
    const query = `
      DELETE FROM student_records
      RETURNING id
    `;

    const result = await pool.query(query);
    const count = result.rows.length;

    res.status(200).json({
      message: 'All records deleted successfully',
      count
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/records/check/:cnic - Check if a CNIC exists and return the record
const getRecordByCnic = async (req, res, next) => {
  try {
    const { cnic } = req.params;

    const query = `
      SELECT * FROM student_records
      WHERE cnic = $1
      ORDER BY submitted_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [cnic]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'not_found',
        message: 'No record found for this CNIC',
        exists: false
      });
    }

    const record = mapRowToRecord(result.rows[0]);
    res.status(200).json({
      status: 'found',
      exists: true,
      record
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRecord,
  getAllRecords,
  getRecordById,
  getRecordByCnic,
  deleteRecordById,
  deleteAllRecords
};
