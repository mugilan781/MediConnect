// ============================================================
// MediConnect – models/Patient.js
// Database queries for the patients table
// ============================================================

const pool = require('../config/db');

const Patient = {
  /**
   * Create patient profile (after user creation)
   */
  async create({ user_id, date_of_birth, gender, blood_group, address, emergency_contact, insurance_id, allergies }) {
    const [result] = await pool.execute(
      `INSERT INTO patients (user_id, date_of_birth, gender, blood_group, address, emergency_contact, insurance_id, allergies)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, date_of_birth || null, gender || null, blood_group || null, address || null, emergency_contact || null, insurance_id || null, allergies || null]
    );
    return result;
  },

  /**
   * Find patient by user_id (joins with users table)
   */
  async findByUserId(userId) {
    const [rows] = await pool.execute(
      `SELECT p.*, u.email, u.full_name, u.phone, u.avatar_url
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = ?`,
      [userId]
    );
    return rows[0] || null;
  },

  /**
   * Find patient by patient ID
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT p.*, u.email, u.full_name, u.phone, u.avatar_url
       FROM patients p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Update patient profile
   */
  async update(id, fields) {
    const allowed = ['date_of_birth', 'gender', 'blood_group', 'address', 'emergency_contact', 'insurance_id', 'allergies'];
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
      `UPDATE patients SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return result;
  },

  /**
   * List all patients with pagination
   */
  async findAll({ page = 1, limit = 20, search, doctor_id }) {
    let query = `SELECT p.*, u.email, u.full_name, u.phone, u.is_active
                 FROM patients p JOIN users u ON p.user_id = u.id WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM patients p JOIN users u ON p.user_id = u.id WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (doctor_id) {
      query += ` AND p.id IN (SELECT DISTINCT patient_id FROM appointments WHERE doctor_id = ?)`;
      countQuery += ` AND p.id IN (SELECT DISTINCT patient_id FROM appointments WHERE doctor_id = ?)`;
      params.push(doctor_id);
      countParams.push(doctor_id);
    }

    if (search) {
      query += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      countQuery += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
      countParams.push(s, s, s);
    }

    const offset = (page - 1) * limit;
    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.execute(countQuery, countParams);

    return { data: rows, total: countRows[0].total, page, limit, totalPages: Math.ceil(countRows[0].total / limit) };
  },

  /**
   * Get dashboard summary for a patient
   */
  async getSummary(patientId) {
    const [appointments] = await pool.execute(
      `SELECT COUNT(*) as total, COALESCE(SUM(status IN ('pending', 'scheduled', 'confirmed', 'rescheduled')), 0) as upcoming
       FROM appointments WHERE patient_id = ?`, [patientId]
    );
    const [labBookings] = await pool.execute(
      `SELECT COUNT(*) as total, COALESCE(SUM(status NOT IN ('completed', 'cancelled')), 0) as pending
       FROM lab_bookings WHERE patient_id = ?`, [patientId]
    );
    const [reports] = await pool.execute(
      `SELECT COUNT(*) as total FROM medical_reports WHERE patient_id = ? AND is_shared_with_patient = 1`, [patientId]
    );
    const [consultations] = await pool.execute(
      `SELECT COUNT(*) as total FROM consultations WHERE patient_id = ?`, [patientId]
    );
    const [sampleCollections] = await pool.execute(
      `SELECT COUNT(*) as total, COALESCE(SUM(status NOT IN ('delivered', 'cancelled')), 0) as active
       FROM sample_collection_requests WHERE patient_id = ?`, [patientId]
    );

    return {
      appointments: appointments[0],
      labBookings: labBookings[0],
      reports: reports[0],
      consultations: consultations[0],
      sampleCollections: sampleCollections[0],
    };
  },

  /**
   * Get recent medical reports for dashboard
   */
  async getRecentReports(patientId, limit = 3) {
    const [rows] = await pool.query(
      `SELECT r.*, du.full_name AS doctor_name
       FROM medical_reports r
       LEFT JOIN doctors d ON r.doctor_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       WHERE r.patient_id = ? AND r.is_shared_with_patient = 1
       ORDER BY r.created_at DESC LIMIT ?`,
      [patientId, parseInt(limit, 10)]
    );
    return rows;
  },

  /**
   * Get recent lab bookings for dashboard
   */
  async getRecentLabBookings(patientId, limit = 3) {
    const [rows] = await pool.query(
      `SELECT lb.*, lt.test_name, lt.test_code, lt.category
       FROM lab_bookings lb
       JOIN lab_tests lt ON lb.lab_test_id = lt.id
       WHERE lb.patient_id = ?
       ORDER BY lb.created_at DESC LIMIT ?`,
      [patientId, parseInt(limit, 10)]
    );
    return rows;
  },
};

module.exports = Patient;

