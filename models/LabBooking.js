// ============================================================
// MediConnect – models/LabBooking.js
// Database queries for the lab_bookings table
// ============================================================

const pool = require('../config/db');

const LabBooking = {
  async create({ patient_id, lab_test_id, doctor_id, booking_date, preferred_time, notes }) {
    const [result] = await pool.execute(
      `INSERT INTO lab_bookings (patient_id, lab_test_id, doctor_id, booking_date, preferred_time, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [patient_id, lab_test_id, doctor_id || null, booking_date, preferred_time || null, notes || null]
    );
    return result;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT lb.*, lt.test_name, lt.test_code, lt.category, lt.price,
              pu.full_name AS patient_name, du.full_name AS doctor_name
       FROM lab_bookings lb
       JOIN lab_tests lt ON lb.lab_test_id = lt.id
       JOIN patients p ON lb.patient_id = p.id JOIN users pu ON p.user_id = pu.id
       LEFT JOIN doctors d ON lb.doctor_id = d.id LEFT JOIN users du ON d.user_id = du.id
       WHERE lb.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async updateStatus(id, status) {
    const [result] = await pool.execute(`UPDATE lab_bookings SET status = ? WHERE id = ?`, [status, id]);
    return result;
  },

  async updateResult(id, { result_file_url, result_summary }) {
    const [result] = await pool.execute(
      `UPDATE lab_bookings SET result_file_url = ?, result_summary = ?, status = 'completed' WHERE id = ?`,
      [result_file_url, result_summary || null, id]
    );
    return result;
  },

  async update(id, fields) {
    const allowed = ['booking_date', 'preferred_time', 'status', 'notes', 'result_file_url', 'result_summary'];
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
    const [result] = await pool.execute(`UPDATE lab_bookings SET ${updates.join(', ')} WHERE id = ?`, values);
    return result;
  },

  async logStatusChange({ lab_booking_id, previous_status, new_status, changed_by, reason }) {
    const [result] = await pool.execute(
      `INSERT INTO lab_booking_status_logs (lab_booking_id, previous_status, new_status, changed_by, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [lab_booking_id, previous_status || null, new_status, changed_by, reason || null]
    );
    return result;
  },

  async findAll({ page = 1, limit = 20, patient_id, status }) {
    let query = `SELECT lb.*, lt.test_name, lt.test_code, lt.category,
                        pu.full_name AS patient_name
                 FROM lab_bookings lb
                 JOIN lab_tests lt ON lb.lab_test_id = lt.id
                 JOIN patients p ON lb.patient_id = p.id JOIN users pu ON p.user_id = pu.id WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM lab_bookings lb WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (patient_id) { query += ` AND lb.patient_id = ?`; countQuery += ` AND lb.patient_id = ?`; params.push(patient_id); countParams.push(patient_id); }
    if (status)     { query += ` AND lb.status = ?`;     countQuery += ` AND lb.status = ?`;     params.push(status);     countParams.push(status); }

    const offset = (page - 1) * limit;
    query += ` ORDER BY lb.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.execute(countQuery, countParams);
    return { data: rows, total: countRows[0].total, page, limit, totalPages: Math.ceil(countRows[0].total / limit) };
  },
};

module.exports = LabBooking;
