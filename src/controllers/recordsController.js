const { pool } = require('../config/database');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');

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
    educationType: row.education_type,
    registrationNo: row.registration_no,
    lastYearGrade: row.last_year_grade,
    nextYearGrade: row.next_year_grade,
    examPart1Marks: row.exam_part1_marks,
    examPart2Marks: row.exam_part2_marks,
    totalMarks: row.total_marks,
    remarks: row.remarks,
    certificateUrls: row.certificate_urls || [],
    cnicUrls: row.cnic_urls || [],
    additionalUrls: row.additional_urls || []
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
      educationType,
      registrationNo,
      lastYearGrade,
      nextYearGrade,
      examPart1Marks,
      examPart2Marks,
      totalMarks,
      remarks
    } = req.body;

    // Basic validation
    if (!studentName || !dob || !cnic || !phone || !currentAddress) {
      return res.status(400).json({
        status: 'error',
        message: 'Required fields missing',
        details: 'studentName, dob, cnic, phone, and currentAddress are required'
      });
    }

    let certificateUrls = [];
    let cnicUrls = [];
    let additionalUrls = [];

    // Handle multiple file uploads
    if (req.files) {
      try {
        // Upload certificates
        if (req.files.certificates) {
          for (const file of req.files.certificates) {
            const isPDF = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
            const resourceType = isPDF ? 'raw' : 'image';
            const result = await uploadToCloudinary(file.buffer, 'student-documents/certificates', resourceType);
            
            // For PDFs uploaded as 'image', add fl_attachment flag
            let url = result.secure_url;
            if (isPDF && url.includes('/image/upload/')) {
              url = url.replace('/upload/', '/upload/fl_attachment/');
            }
            
            certificateUrls.push(url);
          }
        }

        // Upload CNIC documents
        if (req.files.cnicDocuments) {
          for (const file of req.files.cnicDocuments) {
            const isPDF = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
            const resourceType = isPDF ? 'raw' : 'image';
            const result = await uploadToCloudinary(file.buffer, 'student-documents/cnic', resourceType);
            
            // For PDFs uploaded as 'image', add fl_attachment flag
            let url = result.secure_url;
            if (isPDF && url.includes('/image/upload/')) {
              url = url.replace('/upload/', '/upload/fl_attachment/');
            }
            
            cnicUrls.push(url);
          }
        }

        // Upload additional documents
        if (req.files.additionalDocuments) {
          for (const file of req.files.additionalDocuments) {
            const isPDF = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
            const resourceType = isPDF ? 'raw' : 'image';
            const result = await uploadToCloudinary(file.buffer, 'student-documents/additional', resourceType);
            
            // For PDFs uploaded as 'image', add fl_attachment flag
            let url = result.secure_url;
            if (isPDF && url.includes('/image/upload/')) {
              url = url.replace('/upload/', '/upload/fl_attachment/');
            }
            
            additionalUrls.push(url);
          }
        }
      } catch (uploadError) {
        console.error('Cloudinary upload error: Failed to upload document');
        return res.status(500).json({
          status: 'error',
          message: 'Failed to upload documents',
          details: uploadError.message
        });
      }
    }

    const query = `
      INSERT INTO student_records (
        admission_type, gender, department, student_name, father_name,
        dob, cnic, phone, whatsapp, full_address, current_address,
        required_grade, previous_education, education_type, registration_no,
        last_year_grade, next_year_grade, exam_part1_marks,
        exam_part2_marks, total_marks, remarks,
        certificate_urls, cnic_urls, additional_urls
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *
    `;

    const values = [
      admissionType || '',
      gender || '',
      department || '',
      studentName,
      fatherName || '',
      dob,
      cnic,
      phone,
      whatsapp || '',
      fullAddress || '',
      currentAddress,
      requiredGrade || '',
      previousEducation || '',
      educationType || '',
      registrationNo || '',
      lastYearGrade || '',
      nextYearGrade || '',
      examPart1Marks || '',
      examPart2Marks || '',
      totalMarks || '',
      remarks || '',
      certificateUrls,
      cnicUrls,
      additionalUrls
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

    // First, get the record to find document URLs
    const selectQuery = `
      SELECT certificate_urls, cnic_urls, additional_urls FROM student_records
      WHERE id = $1
    `;
    const selectResult = await pool.query(selectQuery, [id]);

    if (selectResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Record not found',
        details: { id }
      });
    }

    // Delete all documents from Cloudinary
    const row = selectResult.rows[0];
    const allUrls = [
      ...(row.certificate_urls || []),
      ...(row.cnic_urls || []),
      ...(row.additional_urls || [])
    ];

    for (const url of allUrls) {
      try {
        // Extract public_id from URL
        const publicId = url.split('/').slice(-2).join('/').split('.')[0];
        await deleteFromCloudinary(publicId);
      } catch (cloudinaryError) {
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    const deleteQuery = `
      DELETE FROM student_records
      WHERE id = $1
      RETURNING id
    `;
    await pool.query(deleteQuery, [id]);

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
      return res.status(200).json({
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

// PATCH /api/records/:id/picture - Update only the picture for a record
const updateRecordPicture = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the existing record
    const selectQuery = `
      SELECT id, student_name, additional_urls 
      FROM student_records 
      WHERE id = $1
    `;
    const selectResult = await pool.query(selectQuery, [id]);

    if (selectResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'ریکارڈ نہیں ملا',
        details: { id }
      });
    }

    const record = selectResult.rows[0];
    let additionalUrls = [];

    // Handle file uploads
    if (req.files && req.files.additionalDocuments) {
      try {
        // Delete old pictures from Cloudinary
        if (record.additional_urls && record.additional_urls.length > 0) {
          for (const url of record.additional_urls) {
            try {
              // Extract public_id from URL more reliably
              // URL format: https://res.cloudinary.com/cloud-name/image/upload/v123456/folder/file.jpg
              const urlParts = url.split('/upload/');
              if (urlParts.length > 1) {
                // Get everything after /upload/ and remove file extension
                const pathWithVersion = urlParts[1];
                // Remove version number (v123456/)
                const pathWithoutVersion = pathWithVersion.replace(/^v\d+\//, '');
                // Remove file extension
                const publicId = pathWithoutVersion.replace(/\.[^/.]+$/, '');
                
                // Determine resource type from URL
                let resourceType = 'image';
                if (url.includes('/raw/upload/')) {
                  resourceType = 'raw';
                } else if (url.includes('/image/upload/')) {
                  resourceType = 'image';
                }
                
                await deleteFromCloudinary(publicId, resourceType);
              }
            } catch (deleteError) {
              // Log but continue - deletion failure shouldn't block upload
              console.error('Failed to delete old picture from Cloudinary');
            }
          }
        }

        // Upload new pictures
        for (const file of req.files.additionalDocuments) {
          const isPDF = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
          const resourceType = isPDF ? 'raw' : 'image';
          const result = await uploadToCloudinary(file.buffer, 'student-documents/additional', resourceType);
          
          // For PDFs uploaded as 'image', add fl_attachment flag
          let url = result.secure_url;
          if (isPDF && url.includes('/image/upload/')) {
            url = url.replace('/upload/', '/upload/fl_attachment/');
          }
          
          additionalUrls.push(url);
        }
      } catch (uploadError) {
        console.error('Cloudinary upload error: Failed to upload document');
        return res.status(500).json({
          status: 'error',
          message: 'تصویر اپ ڈیٹ کرنے میں خرابی',
          details: uploadError.message
        });
      }
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'کوئی تصویر فراہم نہیں کی گئی',
        details: 'No picture files provided'
      });
    }

    // Update only the additional_urls field
    const updateQuery = `
      UPDATE student_records 
      SET additional_urls = $1 
      WHERE id = $2 
      RETURNING *
    `;
    const updateResult = await pool.query(updateQuery, [additionalUrls, id]);

    // Map the result to API response format
    const updatedRecord = mapRowToRecord(updateResult.rows[0]);

    res.status(200).json({
      status: 'success',
      message: 'تصویر کامیابی سے اپ ڈیٹ ہو گئی',
      data: updatedRecord
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
  deleteAllRecords,
  updateRecordPicture
};
