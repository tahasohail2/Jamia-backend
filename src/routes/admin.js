const express = require('express');
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);
router.use(apiLimiter);

// GET /api/admin/proxy-pdf - Proxy PDF files from Cloudinary to avoid CORS/iframe issues
router.get('/proxy-pdf', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ message: 'URL parameter required' });
    }

    // Only allow Cloudinary URLs
    if (!url.includes('res.cloudinary.com')) {
      return res.status(403).json({ message: 'Only Cloudinary URLs are allowed' });
    }

    const https = require('https');
    const http = require('http');

    const fetchUrl = (targetUrl) => {
      return new Promise((resolve, reject) => {
        const client = targetUrl.startsWith('https') ? https : http;
        client.get(targetUrl, (response) => {
          if (response.statusCode === 404 && targetUrl.includes('/raw/upload/')) {
            const imageUrl = targetUrl.replace('/raw/upload/', '/image/upload/');
            fetchUrl(imageUrl).then(resolve).catch(reject);
          } else {
            resolve(response);
          }
        }).on('error', reject);
      });
    };

    const response = await fetchUrl(url);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    response.pipe(res);

  } catch (error) {
    console.error('PDF proxy error:', error);
    res.status(500).json({ message: 'Failed to load PDF' });
  }
});

// GET /api/admin/records/export - Export records as CSV
router.get('/records/export', async (req, res) => {
  try {
    const { search, admissionType, gender, department } = req.query;

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(
        '(student_name ILIKE $' + paramIndex +
        ' OR father_name ILIKE $' + paramIndex +
        ' OR cnic ILIKE $' + paramIndex +
        ' OR phone ILIKE $' + paramIndex +
        ' OR registration_no ILIKE $' + paramIndex + ')'
      );
      queryParams.push('%' + search + '%');
      paramIndex++;
    }

    if (admissionType) {
      whereConditions.push('admission_type = $' + paramIndex);
      queryParams.push(admissionType);
      paramIndex++;
    }

    if (gender) {
      whereConditions.push('gender = $' + paramIndex);
      queryParams.push(gender);
      paramIndex++;
    }

    if (department) {
      whereConditions.push('department = $' + paramIndex);
      queryParams.push(department);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const query = `
      SELECT 
        id,
        student_name AS "studentName",
        father_name AS "fatherName",
        admission_type AS "admissionType",
        gender,
        department,
        education_type AS "educationType",
        dob,
        cnic,
        phone,
        whatsapp,
        full_address AS "fullAddress",
        current_address AS "currentAddress",
        required_grade AS "requiredGrade",
        previous_education AS "previousEducation",
        registration_no AS "registrationNo",
        last_year_grade AS "lastYearGrade",
        next_year_grade AS "nextYearGrade",
        exam_part1_marks AS "examPart1Marks",
        exam_part2_marks AS "examPart2Marks",
        total_marks AS "totalMarks",
        remarks,
        additional_urls AS "additionalUrls",
        submitted_at AS "submittedAt"
      FROM student_records
      ${whereClause}
      ORDER BY submitted_at DESC
    `;

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No records found to export' });
    }

    // Generate CSV
    const headers = Object.keys(result.rows[0]);
    const csvRows = [headers.join(',')];

    for (const row of result.rows) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined || value === '') return '';
        return '"' + String(value).replace(/"/g, '""') + '"';
      });
      csvRows.push(values.join(','));
    }

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=student-records.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Failed to export records' });
  }
});

// GET /api/admin/records - Get paginated records with filters
router.get('/records', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 50,
      search,
      admissionType,
      gender,
      department
    } = req.query;

    const offset = (page - 1) * pageSize;
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(
        '(student_name ILIKE $' + paramIndex +
        ' OR father_name ILIKE $' + paramIndex +
        ' OR cnic ILIKE $' + paramIndex +
        ' OR phone ILIKE $' + paramIndex +
        ' OR registration_no ILIKE $' + paramIndex + ')'
      );
      queryParams.push('%' + search + '%');
      paramIndex++;
    }

    if (admissionType) {
      whereConditions.push('admission_type = $' + paramIndex);
      queryParams.push(admissionType);
      paramIndex++;
    }

    if (gender) {
      whereConditions.push('gender = $' + paramIndex);
      queryParams.push(gender);
      paramIndex++;
    }

    if (department) {
      whereConditions.push('department = $' + paramIndex);
      queryParams.push(department);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM student_records ' + whereClause;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0].count);

    // Get paginated data
    const limitPlaceholder = '$' + paramIndex;
    const offsetPlaceholder = '$' + (paramIndex + 1);
    queryParams.push(pageSize, offset);

    const dataQuery = `
      SELECT 
        id,
        student_name AS "studentName",
        father_name AS "fatherName",
        admission_type AS "admissionType",
        gender,
        department,
        education_type AS "educationType",
        dob,
        cnic,
        phone,
        registration_no AS "registrationNo",
        submitted_at AS "submittedAt"
      FROM student_records
      ${whereClause}
      ORDER BY submitted_at DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const dataResult = await pool.query(dataQuery, queryParams);

    res.json({
      data: dataResult.rows,
      pagination: {
        currentPage: parseInt(page),
        pageSize: parseInt(pageSize),
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize)
      }
    });
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({ message: 'Failed to fetch records' });
  }
});

// GET /api/admin/records/:id - Get single record by ID
router.get('/records/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        id,
        student_name AS "studentName",
        father_name AS "fatherName",
        admission_type AS "admissionType",
        gender,
        department,
        education_type AS "educationType",
        dob,
        cnic,
        phone,
        whatsapp,
        full_address AS "fullAddress",
        current_address AS "currentAddress",
        required_grade AS "requiredGrade",
        previous_education AS "previousEducation",
        registration_no AS "registrationNo",
        last_year_grade AS "lastYearGrade",
        next_year_grade AS "nextYearGrade",
        exam_part1_marks AS "examPart1Marks",
        exam_part2_marks AS "examPart2Marks",
        total_marks AS "totalMarks",
        remarks,
        certificate_urls AS "certificateUrls",
        cnic_urls AS "cnicUrls",
        additional_urls AS "additionalUrls",
        submitted_at AS "submittedAt"
      FROM student_records 
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get record error:', error);
    res.status(500).json({ message: 'Failed to fetch record' });
  }
});

// DELETE /api/admin/records/:id - Delete record
router.delete('/records/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const record = await pool.query(
      'SELECT student_name FROM student_records WHERE id = $1',
      [id]
    );

    if (record.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }

    await pool.query('DELETE FROM student_records WHERE id = $1', [id]);

    await pool.query(
      `INSERT INTO admin_audit_log 
       (admin_user_id, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        'DELETE',
        'student_record',
        id,
        JSON.stringify({ studentName: record.rows[0].student_name }),
        req.ip
      ]
    );

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Delete record error:', error);
    res.status(500).json({ message: 'Failed to delete record' });
  }
});

module.exports = router;
