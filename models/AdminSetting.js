// ============================================================
// MediConnect – models/AdminSetting.js
// Database queries for the admin_settings table
// ============================================================

const pool = require('../config/db');

const AdminSetting = {
  async findAll() {
    const [rows] = await pool.execute(`SELECT * FROM admin_settings ORDER BY setting_group, setting_key`);
    return rows;
  },

  async findByKey(key) {
    const [rows] = await pool.execute(`SELECT * FROM admin_settings WHERE setting_key = ?`, [key]);
    return rows[0] || null;
  },

  async findByGroup(group) {
    const [rows] = await pool.execute(`SELECT * FROM admin_settings WHERE setting_group = ? ORDER BY setting_key`, [group]);
    return rows;
  },

  async upsert({ setting_key, setting_value, setting_group, description, updated_by }) {
    const [result] = await pool.execute(
      `INSERT INTO admin_settings (setting_key, setting_value, setting_group, description, updated_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), description = VALUES(description), updated_by = VALUES(updated_by)`,
      [setting_key, setting_value, setting_group || 'general', description || null, updated_by]
    );
    return result;
  },
};

module.exports = AdminSetting;
