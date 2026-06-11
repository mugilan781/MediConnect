// ============================================================
// MediConnect – models/MedicalReport.js
// Database queries for the medical_reports and category/logs tables
// ============================================================

const pool = require('../config/db');

const MedicalReport = {
  async create({ patient_id, doctor_id, appointment_id, consultation_id, lab_booking_id, report_type, category, title, file_url, original_filename, file_size, file_type, notes, is_shared_with_patient }) {
    const [result] = await pool.execute(
      `INSERT INTO medical_reports 
        (patient_id, doctor_id, appointment_id, consultation_id, lab_booking_id, report_type, category, title, file_url, original_filename, file_size, file_type, notes, is_shared_with_patient)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient_id, 
        doctor_id || null, 
        appointment_id || null,
        consultation_id || null,
        lab_booking_id || null, 
        report_type, 
        category || null,
        title, 
        file_url, 
        original_filename || null,
        file_size || null,
        file_type || null, 
        notes || null, 
        is_shared_with_patient ?? 1
      ]
    );
    return result;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT mr.*, pu.full_name AS patient_name, du.full_name AS doctor_name,
              a.appointment_date, c.created_at AS consultation_date, lb.booking_date
       FROM medical_reports mr
       JOIN patients p ON mr.patient_id = p.id JOIN users pu ON p.user_id = pu.id
       LEFT JOIN doctors d ON mr.doctor_id = d.id LEFT JOIN users du ON d.user_id = du.id
       LEFT JOIN appointments a ON mr.appointment_id = a.id
       LEFT JOIN consultations c ON mr.consultation_id = c.id
       LEFT JOIN lab_bookings lb ON mr.lab_booking_id = lb.id
       WHERE mr.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async delete(id) {
    const [result] = await pool.execute(`DELETE FROM medical_reports WHERE id = ?`, [id]);
    return result;
  },

  async toggleShare(id, isShared) {
    const [result] = await pool.execute(`UPDATE medical_reports SET is_shared_with_patient = ? WHERE id = ?`, [isShared, id]);
    return result;
  },

  async findAll({ page = 1, limit = 20, patient_id, doctor_id, doctor_id_or_cared_patients_for, report_type, category, appointment_id, consultation_id, lab_booking_id, is_shared_with_patient, search }) {
    let query = `SELECT mr.*, pu.full_name AS patient_name, du.full_name AS doctor_name
                 FROM medical_reports mr
                 JOIN patients p ON mr.patient_id = p.id JOIN users pu ON p.user_id = pu.id
                 LEFT JOIN doctors d ON mr.doctor_id = d.id LEFT JOIN users du ON d.user_id = du.id WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM medical_reports mr WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (patient_id) { 
      query += ` AND mr.patient_id = ?`; 
      countQuery += ` AND mr.patient_id = ?`; 
      params.push(patient_id); 
      countParams.push(patient_id); 
    }
    if (doctor_id) { 
      query += ` AND mr.doctor_id = ?`; 
      countQuery += ` AND mr.doctor_id = ?`; 
      params.push(doctor_id); 
      countParams.push(doctor_id); 
    }
    if (doctor_id_or_cared_patients_for) {
      query += ` AND (mr.doctor_id = ? OR mr.patient_id IN (
        SELECT patient_id FROM appointments WHERE doctor_id = ? AND status IN ('scheduled', 'confirmed', 'completed', 'rescheduled')
        UNION
        SELECT patient_id FROM consultations WHERE doctor_id = ?
      ))`;
      countQuery += ` AND (mr.doctor_id = ? OR mr.patient_id IN (
        SELECT patient_id FROM appointments WHERE doctor_id = ? AND status IN ('scheduled', 'confirmed', 'completed', 'rescheduled')
        UNION
        SELECT patient_id FROM consultations WHERE doctor_id = ?
      ))`;
      params.push(doctor_id_or_cared_patients_for, doctor_id_or_cared_patients_for, doctor_id_or_cared_patients_for);
      countParams.push(doctor_id_or_cared_patients_for, doctor_id_or_cared_patients_for, doctor_id_or_cared_patients_for);
    }
    if (report_type) { 
      query += ` AND mr.report_type = ?`; 
      countQuery += ` AND mr.report_type = ?`; 
      params.push(report_type); 
      countParams.push(report_type); 
    }
    if (category) { 
      query += ` AND mr.category = ?`; 
      countQuery += ` AND mr.category = ?`; 
      params.push(category); 
      countParams.push(category); 
    }
    if (appointment_id) { 
      query += ` AND mr.appointment_id = ?`; 
      countQuery += ` AND mr.appointment_id = ?`; 
      params.push(appointment_id); 
      countParams.push(appointment_id); 
    }
    if (consultation_id) { 
      query += ` AND mr.consultation_id = ?`; 
      countQuery += ` AND mr.consultation_id = ?`; 
      params.push(consultation_id); 
      countParams.push(consultation_id); 
    }
    if (lab_booking_id) { 
      query += ` AND mr.lab_booking_id = ?`; 
      countQuery += ` AND mr.lab_booking_id = ?`; 
      params.push(lab_booking_id); 
      countParams.push(lab_booking_id); 
    }
    if (is_shared_with_patient !== undefined) {
      query += ` AND mr.is_shared_with_patient = ?`;
      countQuery += ` AND mr.is_shared_with_patient = ?`;
      params.push(is_shared_with_patient);
      countParams.push(is_shared_with_patient);
    }
    if (search) {
      const s = `%${search}%`;
      query += ` AND (mr.title LIKE ? OR mr.notes LIKE ? OR mr.category LIKE ?)`;
      countQuery += ` AND (mr.title LIKE ? OR mr.notes LIKE ? OR mr.category LIKE ?)`;
      params.push(s, s, s);
      countParams.push(s, s, s);
    }

    const offset = (page - 1) * limit;
    query += ` ORDER BY mr.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.execute(countQuery, countParams);
    return { data: rows, total: countRows[0].total, page, limit, totalPages: Math.ceil(countRows[0].total / limit) };
  },

  async update(id, fields) {
    const allowed = ['title', 'report_type', 'category', 'notes', 'is_shared_with_patient', 'appointment_id', 'consultation_id', 'lab_booking_id'];
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
    const [result] = await pool.execute(`UPDATE medical_reports SET ${updates.join(', ')} WHERE id = ?`, values);
    return result;
  },

  // Audit activity logs
  async logActivity({ report_id, user_id, activity_type, ip_address }) {
    const [result] = await pool.execute(
      `INSERT INTO report_activity_logs (report_id, user_id, activity_type, ip_address)
       VALUES (?, ?, ?, ?)`,
      [report_id, user_id, activity_type, ip_address || null]
    );
    return result;
  },

  // Dynamic Categories Management
  Category: {
    async create(category_name) {
      const [result] = await pool.execute(
        `INSERT INTO report_categories (category_name) VALUES (?)`,
        [category_name]
      );
      return result;
    },

    async findAll() {
      const [rows] = await pool.execute(
        `SELECT * FROM report_categories ORDER BY category_name ASC`
      );
      return rows;
    },

    async update(id, { category_name, is_active }) {
      const updates = [];
      const values = [];
      if (category_name !== undefined) { updates.push('category_name = ?'); values.push(category_name); }
      if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }
      if (updates.length === 0) return null;
      values.push(id);
      const [result] = await pool.execute(`UPDATE report_categories SET ${updates.join(', ')} WHERE id = ?`, values);
      return result;
    },

    async delete(id) {
      const [result] = await pool.execute(`DELETE FROM report_categories WHERE id = ?`, [id]);
      return result;
    }
  }
};

module.exports = MedicalReport;
