// ============================================================
// MediConnect – models/Doctor.js
// Database queries for the doctors table
// ============================================================

const pool = require('../config/db');

const Doctor = {
  /**
   * Create doctor profile (after user creation)
   */
  async create({ user_id, specialization, qualification, experience_years, license_number, consultation_fee, available_days, slot_duration_min, bio, department }) {
    const [result] = await pool.execute(
      `INSERT INTO doctors (user_id, specialization, qualification, experience_years, license_number, consultation_fee, available_days, slot_duration_min, bio, department)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, specialization, qualification, experience_years || 0, license_number || null, consultation_fee || 0, available_days || null, slot_duration_min || 30, bio || null, department || null]
    );
    return result;
  },

  /**
   * Find doctor by user_id
   */
  async findByUserId(userId) {
    const [rows] = await pool.execute(
      `SELECT d.*, u.email, u.full_name, u.phone, u.avatar_url
       FROM doctors d JOIN users u ON d.user_id = u.id
       WHERE d.user_id = ?`,
      [userId]
    );
    return rows[0] || null;
  },

  /**
   * Find doctor by doctor ID
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT d.*, u.email, u.full_name, u.phone, u.avatar_url
       FROM doctors d JOIN users u ON d.user_id = u.id
       WHERE d.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Update doctor profile
   */
  async update(id, fields) {
    const allowed = ['specialization', 'qualification', 'experience_years', 'license_number', 'consultation_fee', 'available_days', 'slot_duration_min', 'bio', 'department', 'is_available'];
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
      `UPDATE doctors SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return result;
  },

  /**
   * List all doctors with filters
   */
  async findAll({ page = 1, limit = 20, search, specialization, department, is_available }) {
    let query = `SELECT d.*, u.email, u.full_name, u.phone, u.avatar_url
                 FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.is_active = 1`;
    let countQuery = `SELECT COUNT(*) as total FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.is_active = 1`;
    const params = [];
    const countParams = [];

    if (specialization) {
      query += ` AND d.specialization = ?`;
      countQuery += ` AND d.specialization = ?`;
      params.push(specialization);
      countParams.push(specialization);
    }

    if (department) {
      query += ` AND d.department = ?`;
      countQuery += ` AND d.department = ?`;
      params.push(department);
      countParams.push(department);
    }

    if (is_available !== undefined) {
      query += ` AND d.is_available = ?`;
      countQuery += ` AND d.is_available = ?`;
      params.push(is_available);
      countParams.push(is_available);
    }

    if (search) {
      query += ` AND (u.full_name LIKE ? OR d.specialization LIKE ?)`;
      countQuery += ` AND (u.full_name LIKE ? OR d.specialization LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s);
      countParams.push(s, s);
    }

    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 20;
    const offset = (parsedPage - 1) * parsedLimit;
    query += ` ORDER BY d.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parsedLimit, offset);

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.execute(countQuery, countParams);

    return { data: rows, total: countRows[0].total, page: parsedPage, limit: parsedLimit, totalPages: Math.ceil(countRows[0].total / parsedLimit) };
  },

  /**
   * Get available time slots for a doctor on a given date
   */
  async getAvailableSlots(doctorId, date) {
    // Get doctor's slot duration
    const [doctorRows] = await pool.execute(
      `SELECT slot_duration_min, available_days FROM doctors WHERE id = ?`, [doctorId]
    );
    if (!doctorRows[0]) return [];

    // Get booked slots for the date
    const [bookedRows] = await pool.execute(
      `SELECT appointment_time FROM appointments
       WHERE doctor_id = ? AND appointment_date = ? AND status NOT IN ('cancelled')`,
      [doctorId, date]
    );

    return {
      doctor: doctorRows[0],
      bookedSlots: bookedRows.map(r => {
        const t = r.appointment_time || '';
        return typeof t === 'string' ? t.substring(0, 5) : t;
      }),
    };
  },

  /**
   * Dashboard summary for a doctor
   */
  async getSummary(doctorId) {
    const [todayAppts] = await pool.execute(
      `SELECT COUNT(*) as total FROM appointments WHERE doctor_id = ? AND appointment_date = CURDATE() AND status IN ('pending', 'scheduled', 'confirmed', 'rescheduled')`,
      [doctorId]
    );
    const [totalPatients] = await pool.execute(
      `SELECT COUNT(DISTINCT patient_id) as total FROM appointments WHERE doctor_id = ?`,
      [doctorId]
    );
    const [pendingConsultations] = await pool.execute(
      `SELECT COUNT(*) as total FROM appointments a
       LEFT JOIN consultations c ON a.id = c.appointment_id
       WHERE a.doctor_id = ? AND a.status = 'completed' AND c.id IS NULL`,
      [doctorId]
    );

    const [uploadedReports] = await pool.execute(
      `SELECT COUNT(*) as total FROM medical_reports WHERE doctor_id = ?`,
      [doctorId]
    );

    return {
      todayAppointments: todayAppts[0].total,
      totalPatients: totalPatients[0].total,
      pendingConsultations: pendingConsultations[0].total,
      uploadedReports: uploadedReports[0].total,
    };
  },
};

module.exports = Doctor;
