const { pool } = require('../config/database');

/**
 * Middleware to check if the authenticated user is a super admin
 * Must be used after authMiddleware
 */
const superAdminMiddleware = async (req, res, next) => {
  try {
    // Check if user is authenticated (should be set by authMiddleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user from database to check super admin status
    const result = await pool.query(
      'SELECT is_super_admin, is_active FROM admin_users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Check if user is super admin
    if (!user.is_super_admin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.'
      });
    }

    // User is super admin, proceed
    req.user.isSuperAdmin = true;
    next();

  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify admin privileges'
    });
  }
};

module.exports = superAdminMiddleware;
