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
}

module.exports = AdminUser;
