// ============================================================
// MediConnect – models/NotificationPreference.js
// Database queries for the notification_preferences table
// ============================================================

const pool = require('../config/db');

const NotificationPreference = {
  async findByUserId(userId) {
    const [rows] = await pool.execute(
      `SELECT * FROM notification_preferences WHERE user_id = ?`,
      [userId]
    );
    if (rows.length === 0) {
      // Return defaults if not found
      return {
        user_id: userId,
        enable_appointment_reminders: 1,
        enable_consultation_reminders: 1,
        enable_lab_reminders: 1,
        enable_collection_reminders: 1,
        enable_report_notifications: 1,
        enable_system_notifications: 1
      };
    }
    return rows[0];
  },

  async createDefault(userId) {
    const [result] = await pool.execute(
      `INSERT IGNORE INTO notification_preferences (user_id) VALUES (?)`,
      [userId]
    );
    return result;
  },

  async update(userId, {
    enable_appointment_reminders,
    enable_consultation_reminders,
    enable_lab_reminders,
    enable_collection_reminders,
    enable_report_notifications,
    enable_system_notifications
  }) {
    // Make sure preferences exist
    await this.createDefault(userId);
    
    const [result] = await pool.execute(
      `UPDATE notification_preferences 
       SET enable_appointment_reminders = ?,
           enable_consultation_reminders = ?,
           enable_lab_reminders = ?,
           enable_collection_reminders = ?,
           enable_report_notifications = ?,
           enable_system_notifications = ?
       WHERE user_id = ?`,
      [
        enable_appointment_reminders === undefined ? 1 : (enable_appointment_reminders ? 1 : 0),
        enable_consultation_reminders === undefined ? 1 : (enable_consultation_reminders ? 1 : 0),
        enable_lab_reminders === undefined ? 1 : (enable_lab_reminders ? 1 : 0),
        enable_collection_reminders === undefined ? 1 : (enable_collection_reminders ? 1 : 0),
        enable_report_notifications === undefined ? 1 : (enable_report_notifications ? 1 : 0),
        enable_system_notifications === undefined ? 1 : (enable_system_notifications ? 1 : 0),
        userId
      ]
    );
    return result;
  }
};

module.exports = NotificationPreference;
