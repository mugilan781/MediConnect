// ============================================================
// MediConnect – models/Appointment.js
// Database queries for the appointments table
// ============================================================

const pool = require('../config/db');

const Appointment = {
  /**
   * Create a new appointment
   */
  async create({ patient_id, doctor_id, appointment_date, appointment_time, end_time, type, reason }) {
    const [result] = await pool.execute(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, end_time, type, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, doctor_id, appointment_date, appointment_time, end_time || null, type || 'in_person', reason || null]
    );
    return result;
  },

  /**
   * Find appointment by ID with doctor and patient details
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT a.*,
              pu.full_name AS patient_name, pu.email AS patient_email, pu.phone AS patient_phone,
              du.full_name AS doctor_name, d.specialization, d.department
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users du ON d.user_id = du.id
       WHERE a.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Update appointment status
   */
  async updateStatus(id, { status, cancelled_by, cancel_reason, notes }) {
    const updates = ['status = ?'];
    const values = [status];

    if (cancelled_by) { updates.push('cancelled_by = ?'); values.push(cancelled_by); }
    if (cancel_reason) { updates.push('cancel_reason = ?'); values.push(cancel_reason); }
    if (notes) { updates.push('notes = ?'); values.push(notes); }

    values.push(id);
    const [result] = await pool.execute(
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return result;
  },

  /**
   * Reschedule appointment
   */
  async reschedule(id, { appointment_date, appointment_time, end_time, status = 'rescheduled' }) {
    const [result] = await pool.execute(
      `UPDATE appointments SET appointment_date = ?, appointment_time = ?, end_time = ?, status = ? WHERE id = ?`,
      [appointment_date, appointment_time, end_time || null, status, id]
    );
    return result;
  },

  /**
   * List appointments with role-based filtering and pagination
   */
  async findAll({ page = 1, limit = 20, patient_id, doctor_id, status, date_from, date_to, search }) {
    let query = `SELECT a.*,
                        pu.full_name AS patient_name,
                        du.full_name AS doctor_name, d.specialization
                 FROM appointments a
                 JOIN patients p ON a.patient_id = p.id
                 JOIN users pu ON p.user_id = pu.id
                 JOIN doctors d ON a.doctor_id = d.id
                 JOIN users du ON d.user_id = du.id
                 WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM appointments a WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (patient_id) { query += ` AND a.patient_id = ?`; countQuery += ` AND a.patient_id = ?`; params.push(patient_id); countParams.push(patient_id); }
    if (doctor_id)  { query += ` AND a.doctor_id = ?`;  countQuery += ` AND a.doctor_id = ?`;  params.push(doctor_id);  countParams.push(doctor_id); }
    if (status)     { query += ` AND a.status = ?`;      countQuery += ` AND a.status = ?`;      params.push(status);     countParams.push(status); }
    if (date_from)  { query += ` AND a.appointment_date >= ?`; countQuery += ` AND a.appointment_date >= ?`; params.push(date_from); countParams.push(date_from); }
    if (date_to)    { query += ` AND a.appointment_date <= ?`; countQuery += ` AND a.appointment_date <= ?`; params.push(date_to);   countParams.push(date_to); }
    if (search)     { query += ` AND (du.full_name LIKE ? OR a.reason LIKE ?)`; countQuery += ` AND (a.patient_id IN (SELECT a2.patient_id FROM appointments a2 JOIN doctors d2 ON a2.doctor_id=d2.id JOIN users du2 ON d2.user_id=du2.id WHERE du2.full_name LIKE ?) OR a.reason LIKE ?)`; const s = `%${search}%`; params.push(s, s); countParams.push(s, s); }

    const offset = (page - 1) * limit;
    query += ` ORDER BY a.appointment_date DESC, a.appointment_time DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.execute(countQuery, countParams);

    return { data: rows, total: countRows[0].total, page, limit, totalPages: Math.ceil(countRows[0].total / limit) };
  },

  /**
   * Get upcoming appointments for a user
   */
  async getUpcoming({ patient_id, doctor_id, limit = 5 }) {
    let query = `SELECT a.*,
                        pu.full_name AS patient_name,
                        du.full_name AS doctor_name, d.specialization
                 FROM appointments a
                 JOIN patients p ON a.patient_id = p.id
                 JOIN users pu ON p.user_id = pu.id
                 JOIN doctors d ON a.doctor_id = d.id
                 JOIN users du ON d.user_id = du.id
                 WHERE a.status IN ('scheduled', 'confirmed')
                   AND (a.appointment_date > CURDATE() OR (a.appointment_date = CURDATE() AND a.appointment_time >= CURTIME()))`;
    const params = [];

    if (patient_id) { query += ` AND a.patient_id = ?`; params.push(patient_id); }
    if (doctor_id)  { query += ` AND a.doctor_id = ?`;  params.push(doctor_id); }

    query += ` ORDER BY a.appointment_date ASC, a.appointment_time ASC LIMIT ?`;
    params.push(parseInt(limit, 10));

    const [rows] = await pool.query(query, params);
    return rows;
  },

  /**
   * Check for scheduling conflicts (optionally exclude an appointment by ID)
   */
  async checkConflict(doctor_id, appointment_date, appointment_time, excludeId = null) {
    let query = `SELECT id FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status NOT IN ('cancelled')`;
    const params = [doctor_id, appointment_date, appointment_time];

    if (excludeId) {
      query += ` AND id != ?`;
      params.push(excludeId);
    }

    const [rows] = await pool.execute(query, params);
    return rows.length > 0;
  },

  /**
   * Log status change in appointment_status_logs
   */
  async logStatusChange({ appointment_id, previous_status, new_status, changed_by, reason }) {
    await pool.execute(
      `INSERT INTO appointment_status_logs (appointment_id, previous_status, new_status, changed_by, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [appointment_id, previous_status || null, new_status, changed_by, reason || null]
    );
  },

  /**
   * Log rescheduling in appointment_reschedules
   */
  async logReschedule({ appointment_id, previous_date, previous_time, new_date, new_time, rescheduled_by, reason }) {
    await pool.execute(
      `INSERT INTO appointment_reschedules (appointment_id, previous_date, previous_time, new_date, new_time, rescheduled_by, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [appointment_id, previous_date, previous_time, new_date, new_time, rescheduled_by, reason || null]
    );
  },
};

module.exports = Appointment;
