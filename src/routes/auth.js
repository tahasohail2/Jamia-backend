const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const AdminUser = require('../models/AdminUser');
const { loginLimiter } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    // Find user
    const user = await AdminUser.findByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await AdminUser.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await AdminUser.updateLastLogin(user.id);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Set HTTP-only cookie
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite:"none",
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        isSuperAdmin: user.is_super_admin
      },
      adminToken:token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/verify
router.get('/verify', authMiddleware, async (req, res) => {
  try {
    // Get full user details including super admin status
    const user = await AdminUser.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        isSuperAdmin: user.is_super_admin
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ message: 'Failed to verify user' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, loginLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get admin user from database
    const admin = await AdminUser.findById(userId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Verify current password
    const isPasswordValid = await AdminUser.verifyPassword(
      currentPassword,
      admin.password_hash
    );

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is same as current
    const isSamePassword = await AdminUser.verifyPassword(
      newPassword,
      admin.password_hash
    );

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Update password
    await AdminUser.changePassword(userId, newPassword);

    // Log the password change in audit log (if table exists)
    try {
      await pool.query(
        `INSERT INTO admin_audit_log 
         (admin_user_id, action, resource_type, details, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          'PASSWORD_CHANGED',
          'admin_user',
          JSON.stringify({ username: admin.username }),
          req.ip
        ]
      );
    } catch (auditError) {
      // Ignore audit log errors if table doesn't exist
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

module.exports = router;