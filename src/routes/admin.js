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
      console.log('Audit log not available:', auditError.message);
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
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
      console.log('Audit log not available:', auditError.message);
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
    console.error('Create user error:', error);
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
    console.error('Get users error:', error);
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
      console.log('Audit log not available:', auditError.message);
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Update user status error:', error);
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
      console.log('Audit log not available:', auditError.message);
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
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
    console.error('PDF proxy error:', error);
    res.status(500).json({ message: 'Failed to load PDF' });
  }
});

// GET /api/admin/records/export - Export records as CSV
router.get('/records/export', async (req, res) => {
  try {
    const { search, admissionType, gender, department, approvalStatus } = req.query;

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
        submitted_at AS "submittedAt",
        approval_status AS "approvalStatus"
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
      department,
      approvalStatus
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
        approval_status AS "approvalStatus"
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
        submitted_at AS "submittedAt",
        approval_status AS "approvalStatus"
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

// PATCH /api/admin/records/:id/approval - Update approval status
router.patch('/records/:id/approval', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    // Validate approval status - accept 'approved', 'disapproved', 'pending', or null
    const validStatuses = ['approved', 'disapproved', 'pending', null];
    
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
      // Ignore audit log errors if table doesn't exist
      console.log('Audit log not available:', auditError.message);
    }

    res.json({
      success: true,
      message: 'Approval status updated successfully',
      data: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Update approval status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update approval status'
    });
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
