// ============================================================
// MediConnect – models/ScheduledNotification.js
// Database queries for the scheduled_notifications table
// ============================================================

const pool = require('../config/db');

const ScheduledNotification = {
  async create({ sender_id, target_group, target_user_id, title, message, type, link, scheduled_for }) {
    // Format scheduled_for to MySQL datetime string (YYYY-MM-DD HH:mm:ss)
    let formattedScheduledFor = scheduled_for;
    if (scheduled_for) {
      const d = new Date(scheduled_for);
      if (!isNaN(d.getTime())) {
        formattedScheduledFor = d.toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO scheduled_notifications (sender_id, target_group, target_user_id, title, message, type, link, scheduled_for, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        sender_id,
        target_group,
        target_user_id || null,
        title,
        message,
        type || 'system',
        link || null,
        formattedScheduledFor
      ]
    );
    return result;
  },

  async findPending() {
    const [rows] = await pool.execute(
      `SELECT sn.*, u.full_name AS sender_name
       FROM scheduled_notifications sn
       LEFT JOIN users u ON sn.sender_id = u.id
       WHERE sn.status = 'pending' AND sn.scheduled_for <= NOW()`
    );
    return rows;
  },

  async updateStatus(id, status) {
    const [result] = await pool.execute(
      `UPDATE scheduled_notifications SET status = ? WHERE id = ?`,
      [status, id]
    );
    return result;
  },

  async findAll({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT sn.*, 
              su.full_name AS sender_name,
              tu.full_name AS target_user_name,
              tu.email AS target_user_email
       FROM scheduled_notifications sn
       LEFT JOIN users su ON sn.sender_id = su.id
       LEFT JOIN users tu ON sn.target_user_id = tu.id
       ORDER BY sn.scheduled_for DESC LIMIT ? OFFSET ?`,
      [parseInt(limit, 10), parseInt(offset, 10)]
    );
    const [[countRows]] = await pool.execute(`SELECT COUNT(*) as total FROM scheduled_notifications`);
    return {
      data: rows,
      total: countRows.total,
      page,
      limit,
      totalPages: Math.ceil(countRows.total / limit)
    };
  }
};

module.exports = ScheduledNotification;
