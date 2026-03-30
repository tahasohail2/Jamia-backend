const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

class AdminUser {
  static async findByUsername(username) {
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE username = $1 AND is_active = true',
      [username]
    );
    return result.rows[0];
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastLogin(userId) {
    await pool.query(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  static async createUser(username, password) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at',
      [username, hashedPassword]
    );
    return result.rows[0];
  }

  static async findById(userId) {
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }

  static async changePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );
  }

  static async createAdminUser(username, password, isSuperAdmin = false) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO admin_users (username, password_hash, is_super_admin, is_active) 
       VALUES ($1, $2, $3, TRUE) 
       RETURNING id, username, is_super_admin, is_active, created_at`,
      [username, hashedPassword, isSuperAdmin]
    );
    return result.rows[0];
  }

  static async getAllUsers() {
    const result = await pool.query(
      `SELECT id, username, is_super_admin, is_active, last_login, created_at, updated_at 
       FROM admin_users 
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  static async updateUserStatus(userId, isActive) {
    await pool.query(
      'UPDATE admin_users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [isActive, userId]
    );
  }

  static async deleteUser(userId) {
    await pool.query('DELETE FROM admin_users WHERE id = $1', [userId]);
  }

  static async checkIsSuperAdmin(userId) {
    const result = await pool.query(
      'SELECT is_super_admin FROM admin_users WHERE id = $1',
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0].is_super_admin : false;
  }
}

module.exports = AdminUser;
