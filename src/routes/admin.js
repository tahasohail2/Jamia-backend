const express = require('express');
const { pool } = require('../config/database');
const AdminUser = require('../models/AdminUser');
const authMiddleware = require('../middleware/authMiddleware');
const superAdminMiddleware = require('../middleware/superAdminMiddleware');
const { apiLimiter, loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);
router.use(apiLimiter);

// POST /api/admin/change-password - Change admin password (SUPER ADMIN ONLY)
router.post('/change-password', loginLimiter, superAdminMiddleware, async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // Validation
    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'User ID and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get target user from database
    const targetUser = await AdminUser.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    await AdminUser.changePassword(userId, newPassword);

    // Log the password change in audit log
    try {
      await pool.query(
        `INSERT INTO admin_audit_log 
         (admin_user_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          'PASSWORD_CHANGED_BY_SUPER_ADMIN',
          'admin_user',
          userId,
          JSON.stringify({ 
            targetUsername: targetUser.username,
            changedBy: req.user.username 
          }),
          req.ip
        ]
      );
    } catch (auditError) {
      // Audit log table doesn't exist - skip logging
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error: Failed to change admin password');
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// POST /api/admin/users - Create new admin user (SUPER ADMIN ONLY)
router.post('/users', superAdminMiddleware, async (req, res) => {
  try {
    const { username, password, isSuperAdmin } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if username already exists
    const existingUser = await AdminUser.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Create new user
    const newUser = await AdminUser.createAdminUser(username, password, isSuperAdmin || false);

    // Log the action
    try {
      await pool.query(
        `INSERT INTO admin_audit_log 
         (admin_user_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          'USER_CREATED',
          'admin_user',
          newUser.id,
          JSON.stringify({ 
            username: newUser.username,
            isSuperAdmin: newUser.is_super_admin,
            createdBy: req.user.username 
          }),
          req.ip
        ]
      );
    } catch (auditError) {
      // Audit log table doesn't exist - skip logging
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        isSuperAdmin: newUser.is_super_admin,
        isActive: newUser.is_active,
        createdAt: newUser.created_at
      }
    });

  } catch (error) {
    console.error('Create user error: Failed to create admin user');
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// GET /api/admin/users - Get all admin users (SUPER ADMIN ONLY)
router.get('/users', superAdminMiddleware, async (req, res) => {
  try {
    const users = await AdminUser.getAllUsers();

    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        isSuperAdmin: user.is_super_admin,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }))
    });

  } catch (error) {
    console.error('Get users error: Failed to fetch admin users');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// PATCH /api/admin/users/:id/status - Update user active status (SUPER ADMIN ONLY)
router.patch('/users/:id/status', superAdminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    // Prevent super admin from deactivating themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own active status'
      });
    }

    // Check if user exists
    const user = await AdminUser.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update status
    await AdminUser.updateUserStatus(id, isActive);

    // Log the action
    try {
      await pool.query(
        `INSERT INTO admin_audit_log 
         (admin_user_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          'USER_STATUS_CHANGED',
          'admin_user',
          id,
          JSON.stringify({ 
            username: user.username,
            newStatus: isActive,
            changedBy: req.user.username 
          }),
          req.ip
        ]
      );
    } catch (auditError) {
      // Audit log table doesn't exist - skip logging
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Update user status error: Failed to update admin user status');
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

// DELETE /api/admin/users/:id - Delete admin user (SUPER ADMIN ONLY)
router.delete('/users/:id', superAdminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent super admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Check if user exists
    const user = await AdminUser.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user
    await AdminUser.deleteUser(id);

    // Log the action
    try {
      await pool.query(
        `INSERT INTO admin_audit_log 
         (admin_user_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          'USER_DELETED',
          'admin_user',
          id,
          JSON.stringify({ 
            username: user.username,
            deletedBy: req.user.username 
          }),
          req.ip
        ]
      );
    } catch (auditError) {
      // Audit log table doesn't exist - skip logging
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error: Failed to delete admin user');
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

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
    console.error('PDF proxy error: Failed to load PDF document');
    res.status(500).json({ message: 'Failed to load PDF' });
  }
});

// Helper function to format date/time
function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} (${hours}:${minutes})`;
}

// Helper function to generate CSV with Urdu headers
function generateCSVWithUrduHeaders(records) {
  if (records.length === 0) {
    return '';
  }

  // Define Urdu headers
  const headers = [
    'داخلہ نمبر',           // Registration Number
    'طالب علم کا نام',      // Student Name
    'والد کا نام',         // Father Name
    'داخلہ کی قسم',        // Admission Type
    'جنس',                 // Gender
    'شعبہ',                // Department
    'تعلیم کی قسم',        // Education Type
    'تاریخ پیدائش',        // Date of Birth
    'شناختی کارڈ',         // CNIC
    'فون',                 // Phone
    'واٹس ایپ',            // WhatsApp
    'مستقل پتہ',           // Full Address
    'موجودہ پتہ',          // Current Address
    'مطلوبہ جماعت',        // Required Grade
    'سابقہ تعلیم',         // Previous Education
    'گزشتہ سال کی جماعت',  // Last Year Grade
    'اگلے سال کی جماعت',   // Next Year Grade
    'ملاحظات',             // Remarks
    'جمع کرانے کا وقت'     // Submitted At
  ];

  // Helper function to escape CSV values
  function escapeCSV(value) {
    if (value === null || value === undefined) {
      return 'غیر متعین';  // "Not Specified" in Urdu
    }
    const stringValue = String(value);
    // Escape double quotes and wrap in quotes if contains comma, newline, or quote
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  // Create CSV rows
  const rows = records.map(record => [
    escapeCSV(record.registration_no || 'غیر متعین'),
    escapeCSV(record.student_name),
    escapeCSV(record.father_name),
    escapeCSV(record.admission_type),
    escapeCSV(record.gender),
    escapeCSV(record.department),
    escapeCSV(record.education_type),
    escapeCSV(record.dob),
    escapeCSV(record.cnic),
    escapeCSV(record.phone),
    escapeCSV(record.whatsapp),
    escapeCSV(record.full_address),
    escapeCSV(record.current_address),
    escapeCSV(record.required_grade),
    escapeCSV(record.previous_education),
    escapeCSV(record.last_year_grade),
    escapeCSV(record.next_year_grade),
    escapeCSV(record.remarks),
    escapeCSV(formatDateTime(record.submitted_at))
  ]);

  // Combine headers and rows
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ];

  return csvLines.join('\n');
}

// GET /api/admin/records/export - Export records as CSV
router.get('/records/export', async (req, res) => {
  try {
    const { search, admissionType, gender, department, approvalStatus, migrationBatchId } = req.query;

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

    // Approval Status Filter
    if (approvalStatus) {
      if (approvalStatus === 'pending') {
        // For pending, match ONLY NULL values (records with no status set)
        whereConditions.push('approval_status IS NULL');
      } else {
        whereConditions.push('approval_status = $' + paramIndex);
        queryParams.push(approvalStatus);
        paramIndex++;
      }
    }

    // Migration Batch Filter
    if (migrationBatchId) {
      if (migrationBatchId === 'not_migrated') {
        whereConditions.push('migration_batch_id IS NULL');
      } else {
        whereConditions.push('migration_batch_id = $' + paramIndex);
        queryParams.push(migrationBatchId);
        paramIndex++;
      }
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const query = `
      SELECT 
        registration_no,
        student_name,
        father_name,
        admission_type,
        gender,
        department,
        education_type,
        dob,
        cnic,
        phone,
        whatsapp,
        full_address,
        current_address,
        required_grade,
        previous_education,
        last_year_grade,
        next_year_grade,
        remarks,
        submitted_at
      FROM student_records
      ${whereClause}
      ORDER BY submitted_at DESC
    `;

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No records found to export' });
    }

    // Generate CSV with Urdu headers
    const csv = generateCSVWithUrduHeaders(result.rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=student-records.csv');
    
    // Add BOM for proper UTF-8 encoding in Excel
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Export error: Failed to export student records');
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
      department,
      approvalStatus,
      migrationBatchId
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

    // Approval Status Filter
    if (approvalStatus) {
      if (approvalStatus === 'pending') {
        // For pending, match ONLY NULL values (records with no status set)
        whereConditions.push('approval_status IS NULL');
      } else {
        whereConditions.push('approval_status = $' + paramIndex);
        queryParams.push(approvalStatus);
        paramIndex++;
      }
    }

    // Migration Batch Filter
    if (migrationBatchId) {
      if (migrationBatchId === 'not_migrated') {
        whereConditions.push('migration_batch_id IS NULL');
      } else {
        whereConditions.push('migration_batch_id = $' + paramIndex);
        queryParams.push(migrationBatchId);
        paramIndex++;
      }
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
        submitted_at AS "submittedAt",
        approval_status AS "approvalStatus",
        approved_at AS "approvedAt",
        additional_urls AS "additionalUrls",
        migration_batch_id AS "migrationBatchId",
        migrated_at AS "migratedAt",
        migration_comment AS "migrationComment"
      FROM student_records
      ${whereClause}
      ORDER BY submitted_at DESC
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const dataResult = await pool.query(dataQuery, queryParams);

    // Format the response to include pictureUrl for easier frontend access
    const formattedData = dataResult.rows.map(record => ({
      ...record,
      pictureUrl: record.additionalUrls && record.additionalUrls.length > 0 
        ? record.additionalUrls[0] 
        : null,
      additionalUrls: record.additionalUrls || []
    }));

    res.json({
      data: formattedData,
      pagination: {
        currentPage: parseInt(page),
        pageSize: parseInt(pageSize),
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize)
      }
    });
  } catch (error) {
    console.error('Get records error: Failed to fetch student records');
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
        submitted_at AS "submittedAt",
        approval_status AS "approvalStatus",
        approved_at AS "approvedAt",
        approval_comments AS "approvalComments",
        migration_batch_id AS "migrationBatchId",
        migrated_at AS "migratedAt",
        migration_comment AS "migrationComment"
      FROM student_records 
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get record error: Failed to fetch student record');
    res.status(500).json({ message: 'Failed to fetch record' });
  }
});

// PATCH /api/admin/records/:id/approval - Update approval status
router.patch('/records/:id/approval', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    // Validate approval status - accept 'approved', 'disapproved', 'pending', or null
    const validStatuses = ['approved', 'disapproved', 'pending', 'admitted', 'denied', null];
    
    if (!validStatuses.includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid approval status. Must be "approved", "disapproved", "pending", or null'
      });
    }
    
    // Convert 'pending' to null for database storage
    const statusValue = approvalStatus === 'pending' ? null : approvalStatus;

    // Check if record exists
    const checkResult = await pool.query(
      'SELECT id FROM student_records WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    // Update the approval status
    // If resetting to pending (null), clear approved_by and approved_at
    const updateResult = statusValue === null
      ? await pool.query(
          `UPDATE student_records 
           SET approval_status = NULL, approved_by = NULL, approved_at = NULL
           WHERE id = $1
           RETURNING id, approval_status AS "approvalStatus"`,
          [id]
        )
      : await pool.query(
          `UPDATE student_records 
           SET approval_status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP
           WHERE id = $3
           RETURNING id, approval_status AS "approvalStatus"`,
          [statusValue, req.user.id, id]
        );

    // Log the action in audit log (if table exists)
    try {
      await pool.query(
        `INSERT INTO admin_audit_log 
         (admin_user_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          'UPDATE_APPROVAL',
          'student_record',
          id,
          JSON.stringify({ approvalStatus }),
          req.ip
        ]
      );
    } catch (auditError) {
      // Audit log table doesn't exist - skip logging
    }

    res.json({
      success: true,
      message: 'Approval status updated successfully',
      data: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Update approval status error: Failed to update approval status');
    res.status(500).json({
      success: false,
      message: 'Failed to update approval status'
    });
  }
});

// PUT /api/admin/records/:id - Update record fields (no file uploads)
router.put('/records/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Allowed editable fields (camelCase -> snake_case mapping)
    const fieldMap = {
      studentName: 'student_name',
      fatherName: 'father_name',
      dob: 'dob',
      cnic: 'cnic',
      phone: 'phone',
      whatsapp: 'whatsapp',
      fullAddress: 'full_address',
      currentAddress: 'current_address',
      gender: 'gender',
      department: 'department',
      admissionType: 'admission_type',
      educationType: 'education_type',
      requiredGrade: 'required_grade',
      previousEducation: 'previous_education',
      registrationNo: 'registration_no',
      lastYearGrade: 'last_year_grade',
      nextYearGrade: 'next_year_grade',
      remarks: 'remarks',
      approvalComments: 'approval_comments'
    };

    // Build SET clause from only the fields present in the request body
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
      if (req.body[camelKey] !== undefined) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        values.push(req.body[camelKey]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    // Check record exists
    const checkResult = await pool.query(
      'SELECT id FROM student_records WHERE id = $1',
      [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }

    // If CNIC is being updated, check uniqueness against other records
    if (req.body.cnic !== undefined) {
      const cnicCheck = await pool.query(
        'SELECT id FROM student_records WHERE cnic = $1 AND id != $2',
        [req.body.cnic, id]
      );
      if (cnicCheck.rows.length > 0) {
        return res.status(400).json({ message: 'CNIC already exists for another record' });
      }
    }

    // Execute update and return full record
    values.push(id);
    const updateQuery = `
      UPDATE student_records
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
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
        remarks,
        certificate_urls AS "certificateUrls",
        cnic_urls AS "cnicUrls",
        additional_urls AS "additionalUrls",
        submitted_at AS "submittedAt",
        approval_status AS "approvalStatus",
        approval_comments AS "approvalComments",
        migration_batch_id AS "migrationBatchId",
        migrated_at AS "migratedAt",
        migration_comment AS "migrationComment"
    `;

    const result = await pool.query(updateQuery, values);

    // Audit log
    try {
      await pool.query(
        `INSERT INTO admin_audit_log
         (admin_user_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          'UPDATE_RECORD',
          'student_record',
          id,
          JSON.stringify({ updatedFields: Object.keys(req.body).filter(k => fieldMap[k]) }),
          req.ip
        ]
      );
    } catch (auditError) {
      // Audit log table doesn't exist - skip
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update record error: Failed to update student record');
    res.status(500).json({ message: 'Failed to update record' });
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
    console.error('Delete record error: Failed to delete student record');
    res.status(500).json({ message: 'Failed to delete record' });
  }
});

// POST /api/admin/records/mark-migrated - Mark records as migrated with batch ID
router.post('/records/mark-migrated', async (req, res) => {
  try {
    const { recordIds, batchId, migratedAt } = req.body;

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0 || !batchId) {
      return res.status(400).json({
        success: false,
        message: 'recordIds and batchId are required'
      });
    }

    if (!migratedAt || isNaN(Date.parse(migratedAt))) {
      return res.status(400).json({
        success: false,
        message: 'migratedAt must be a valid ISO 8601 date string'
      });
    }

    // Build parameterized IN clause
    const placeholders = recordIds.map((_, i) => '$' + (i + 3)).join(', ');
    const query = `
      UPDATE student_records
      SET migration_batch_id = $1, migrated_at = $2
      WHERE id IN (${placeholders})
    `;

    const result = await pool.query(query, [batchId, migratedAt, ...recordIds]);

    // Audit log
    try {
      await pool.query(
        `INSERT INTO admin_audit_log
         (admin_user_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          'MARK_MIGRATED',
          'student_record',
          null,
          JSON.stringify({ batchId, recordIds, migratedAt }),
          req.ip
        ]
      );
    } catch (auditError) {
      // Audit log table doesn't exist - skip
    }

    res.json({
      success: true,
      updatedCount: result.rowCount
    });
  } catch (error) {
    console.error('Mark migrated error: Failed to mark records as migrated');
    res.status(500).json({
      success: false,
      message: 'Failed to mark records as migrated'
    });
  }
});

// GET /api/admin/migration-batches - Get all distinct migration batches
router.get('/migration-batches', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        migration_batch_id AS "batchId",
        MIN(migrated_at) AS "migratedAt",
        COUNT(*) AS "totalRecords"
      FROM student_records
      WHERE migration_batch_id IS NOT NULL
      GROUP BY migration_batch_id
      ORDER BY MIN(migrated_at) DESC
    `);

    res.json({
      batches: result.rows.map(row => ({
        ...row,
        totalRecords: parseInt(row.totalRecords)
      }))
    });
  } catch (error) {
    console.error('Migration batches error: Failed to fetch migration batches');
    res.status(500).json({ message: 'Failed to fetch migration batches' });
  }
});

// POST /api/admin/records/bulk-update-status - Persist Jamia API response statuses
router.post('/records/bulk-update-status', async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'updates must be a non-empty array'
      });
    }

    const validStatuses = ['admitted', 'denied', 'validation_failed'];
    let updatedCount = 0;

    for (const item of updates) {
      if (!item.id || !item.status || typeof item.comment !== 'string') {
        continue;
      }
      if (!validStatuses.includes(item.status)) {
        continue;
      }

      const statusValue = item.status === 'validation_failed' ? 'approved' : item.status;

      const result = await pool.query(
        `UPDATE student_records
         SET approval_status = $1, migration_comment = $2
         WHERE id = $3`,
        [statusValue, item.comment, item.id]
      );
      updatedCount += result.rowCount;
    }

    // Audit log
    try {
      await pool.query(
        `INSERT INTO admin_audit_log
         (admin_user_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          'BULK_UPDATE_STATUS',
          'student_record',
          null,
          JSON.stringify({ count: updates.length }),
          req.ip
        ]
      );
    } catch (auditError) {
      // Audit log table doesn't exist - skip
    }

    res.json({
      success: true,
      updatedCount
    });
  } catch (error) {
    console.error('Bulk update status error: Failed to update record statuses');
    res.status(500).json({
      success: false,
      message: 'Failed to update record statuses'
    });
  }
});

// POST /api/admin/records/clear-migration-batch - Clear batch ID for re-migration
router.post('/records/clear-migration-batch', async (req, res) => {
  try {
    const { recordIds } = req.body;

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'recordIds must be a non-empty array'
      });
    }

    const placeholders = recordIds.map((_, i) => '$' + (i + 1)).join(', ');
    const result = await pool.query(
      `UPDATE student_records
       SET migration_batch_id = NULL, migrated_at = NULL
       WHERE id IN (${placeholders})`,
      recordIds
    );

    // Audit log
    try {
      await pool.query(
        `INSERT INTO admin_audit_log
         (admin_user_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          'CLEAR_MIGRATION_BATCH',
          'student_record',
          null,
          JSON.stringify({ recordIds }),
          req.ip
        ]
      );
    } catch (auditError) {
      // Audit log table doesn't exist - skip
    }

    res.json({
      success: true,
      updatedCount: result.rowCount
    });
  } catch (error) {
    console.error('Clear migration batch error: Failed to clear migration batch');
    res.status(500).json({
      success: false,
      message: 'Failed to clear migration batch'
    });
  }
});

module.exports = router;
