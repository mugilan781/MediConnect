// ============================================================
// MediConnect – models/LabTest.js
// Database queries for the lab_tests catalog table
// ============================================================

const pool = require('../config/db');

const LabTest = {
  async create({ test_name, test_code, category, description, price, preparation_instructions, turnaround_hours }) {
    const [result] = await pool.execute(
      `INSERT INTO lab_tests (test_name, test_code, category, description, price, preparation_instructions, turnaround_hours)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [test_name, test_code, category || null, description || null, price, preparation_instructions || null, turnaround_hours || 24]
    );
    return result;
  },

  async findById(id) {
    const [rows] = await pool.execute(`SELECT * FROM lab_tests WHERE id = ?`, [id]);
    return rows[0] || null;
  },

  async update(id, fields) {
    const allowed = ['test_name', 'test_code', 'category', 'description', 'price', 'preparation_instructions', 'turnaround_hours', 'is_active'];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) { updates.push(`${key} = ?`); values.push(fields[key]); }
    }
    if (updates.length === 0) return null;
    values.push(id);
    const [result] = await pool.execute(`UPDATE lab_tests SET ${updates.join(', ')} WHERE id = ?`, values);
    return result;
  },

  async findAll({ page = 1, limit = 20, search, category, is_active }) {
    let query = `SELECT * FROM lab_tests WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM lab_tests WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (is_active !== undefined && is_active !== 'all') {
      const activeVal = (is_active === 'true' || is_active === 1 || is_active === '1') ? 1 : 0;
      query += ` AND is_active = ?`;
      countQuery += ` AND is_active = ?`;
      params.push(activeVal);
      countParams.push(activeVal);
    } else if (is_active === undefined) {
      query += ` AND is_active = 1`;
      countQuery += ` AND is_active = 1`;
    }

    if (category) { query += ` AND category = ?`; countQuery += ` AND category = ?`; params.push(category); countParams.push(category); }
    if (search) {
      query += ` AND (test_name LIKE ? OR test_code LIKE ?)`;
      countQuery += ` AND (test_name LIKE ? OR test_code LIKE ?)`;
      const s = `%${search}%`; params.push(s, s); countParams.push(s, s);
    }

    const offset = (page - 1) * limit;
    query += ` ORDER BY test_name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.execute(countQuery, countParams);
    return { data: rows, total: countRows[0].total, page, limit, totalPages: Math.ceil(countRows[0].total / limit) };
  },

  async deactivate(id) {
    const [result] = await pool.execute(`UPDATE lab_tests SET is_active = 0 WHERE id = ?`, [id]);
    return result;
  },

  async getCategories() {
    const [rows] = await pool.execute(`SELECT DISTINCT category FROM lab_tests WHERE category IS NOT NULL AND is_active = 1 ORDER BY category`);
    return rows.map(r => r.category);
  },
};

module.exports = LabTest;
