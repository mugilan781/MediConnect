// ============================================================
// MediConnect – models/User.js
// Database queries for the users table
// ============================================================

const pool = require('../config/db');

const User = {
  /**
   * Create a new user
   */
  async create({ email, password_hash, role, full_name, phone }) {
    const [result] = await pool.execute(
      `INSERT INTO users (email, password_hash, role, full_name, phone)
       VALUES (?, ?, ?, ?, ?)`,
      [email, password_hash, role, full_name, phone || null]
    );
    return result;
  },

  /**
   * Find user by ID
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT id, email, role, full_name, phone, avatar_url, is_active, last_login, created_at
       FROM users WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Find user by email (includes password_hash for auth)
   */
  async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT * FROM users WHERE email = ?`,
      [email]
    );
    return rows[0] || null;
  },

  /**
   * Update user profile
   */
  async update(id, fields) {
    const allowed = ['full_name', 'phone', 'avatar_url', 'is_active'];
    const updates = [];
    const values = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }

    if (updates.length === 0) return null;
    values.push(id);

    const [result] = await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return result;
  },

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id) {
    const [result] = await pool.execute(
      `UPDATE users SET last_login = NOW() WHERE id = ?`,
      [id]
    );
    return result;
  },

  /**
   * Update password hash
   */
  async updatePassword(id, password_hash) {
    const [result] = await pool.execute(
      `UPDATE users SET password_hash = ? WHERE id = ?`,
      [password_hash, id]
    );
    return result;
  },

  /**
   * List all users with pagination
   */
  async findAll({ page = 1, limit = 20, role, search, is_active }) {
    let query = `SELECT id, email, role, full_name, phone, is_active, created_at FROM users WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (role) {
      query += ` AND role = ?`;
      countQuery += ` AND role = ?`;
      params.push(role);
      countParams.push(role);
    }

    if (is_active !== undefined) {
      query += ` AND is_active = ?`;
      countQuery += ` AND is_active = ?`;
      params.push(is_active);
      countParams.push(is_active);
    }

    if (search) {
      query += ` AND (full_name LIKE ? OR email LIKE ?)`;
      countQuery += ` AND (full_name LIKE ? OR email LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm);
    }

    const offset = (page - 1) * limit;
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.execute(countQuery, countParams);

    return {
      data: rows,
      total: countRows[0].total,
      page,
      limit,
      totalPages: Math.ceil(countRows[0].total / limit),
    };
  },

  /**
   * Delete (deactivate) user
   */
  async deactivate(id) {
    const [result] = await pool.execute(
      `UPDATE users SET is_active = 0 WHERE id = ?`,
      [id]
    );
    return result;
  },
};

module.exports = User;
