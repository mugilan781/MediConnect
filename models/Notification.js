// ============================================================
// MediConnect – models/Notification.js
// Database queries for the notifications table
// ============================================================

const pool = require('../config/db');

const Notification = {
  async create({ user_id, type, title, message, link, related_module = null, related_record_id = null }) {
    const [result] = await pool.execute(
      `INSERT INTO notifications (user_id, type, title, message, link, related_module, related_record_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, type, title, message, link || null, related_module || null, related_record_id || null]
    );
    return result;
  },

  async searchAndFilter(userId, { page = 1, limit = 20, type, search } = {}) {
    let query = `SELECT * FROM notifications WHERE user_id = ?`;
    let countQuery = `SELECT COUNT(*) as total FROM notifications WHERE user_id = ?`;
    const params = [userId];
    const countParams = [userId];

    if (type) {
      query += ` AND type = ?`;
      countQuery += ` AND type = ?`;
      params.push(type);
      countParams.push(type);
    }

    if (search) {
      const s = `%${search}%`;
      query += ` AND (title LIKE ? OR message LIKE ?)`;
      countQuery += ` AND (title LIKE ? OR message LIKE ?)`;
      params.push(s, s);
      countParams.push(s, s);
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
      totalPages: Math.ceil(countRows[0].total / limit)
    };
  },

  async findByUserId(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, parseInt(limit, 10), parseInt(offset, 10)]
    );
    const [countRows] = await pool.execute(`SELECT COUNT(*) as total FROM notifications WHERE user_id = ?`, [userId]);
    return { data: rows, total: countRows[0].total, page, limit, totalPages: Math.ceil(countRows[0].total / limit) };
  },

  async getUnreadCount(userId) {
    const [rows] = await pool.execute(`SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`, [userId]);
    return rows[0].count;
  },

  async markAsRead(id) {
    const [result] = await pool.execute(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]);
    return result;
  },

  async markAsReadForUser(id, userId) {
    const [result] = await pool.execute(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [id, userId]);
    return result;
  },

  async markAllAsRead(userId) {
    const [result] = await pool.execute(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`, [userId]);
    return result;
  },

  async delete(id) {
    const [result] = await pool.execute(`DELETE FROM notifications WHERE id = ?`, [id]);
    return result;
  },

  async deleteForUser(id, userId) {
    const [result] = await pool.execute(`DELETE FROM notifications WHERE id = ? AND user_id = ?`, [id, userId]);
    return result;
  },
};

module.exports = Notification;
