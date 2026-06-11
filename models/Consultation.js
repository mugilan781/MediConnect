// ============================================================
// MediConnect – models/Consultation.js
// Database queries for the consultations table
// ============================================================

const pool = require('../config/db');

const Consultation = {
  /**
   * Create a new consultation request
   */
  async create({ appointment_id, doctor_id, patient_id, preferred_date, symptoms, health_concerns, additional_notes, status }) {
    const [result] = await pool.execute(
      `INSERT INTO consultations (appointment_id, doctor_id, patient_id, preferred_date, symptoms, health_concerns, additional_notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        appointment_id || null,
        doctor_id,
        patient_id,
        preferred_date,
        symptoms,
        health_concerns || null,
        additional_notes || null,
        status || 'requested'
      ]
    );
    return result;
  },

  /**
   * Find consultation by ID with doctor, patient details and clinical notes
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT c.*, 
              du.full_name AS doctor_name, d.specialization, d.consultation_fee,
              pu.full_name AS patient_name, pu.phone AS patient_phone, pu.email AS patient_email,
              cn.diagnosis AS notes_diagnosis, cn.recommendations, cn.follow_up_advice, cn.prescription_notes
       FROM consultations c
       JOIN doctors d ON c.doctor_id = d.id JOIN users du ON d.user_id = du.id
       JOIN patients p ON c.patient_id = p.id JOIN users pu ON p.user_id = pu.id
       LEFT JOIN consultation_notes cn ON c.id = cn.consultation_id
       WHERE c.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByAppointmentId(appointmentId) {
    const [rows] = await pool.execute(
      `SELECT c.*, du.full_name AS doctor_name, d.specialization
       FROM consultations c
       JOIN doctors d ON c.doctor_id = d.id JOIN users du ON d.user_id = du.id
       WHERE c.appointment_id = ?`,
      [appointmentId]
    );
    return rows[0] || null;
  },

  async update(id, fields) {
    const allowed = [
      'appointment_id', 'diagnosis', 'symptoms', 'prescription', 'prescription_file_url', 
      'follow_up_date', 'notes', 'status', 'consultation_date', 'consultation_time', 
      'duration', 'scheduled_notes'
    ];
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
    const [result] = await pool.execute(`UPDATE consultations SET ${updates.join(', ')} WHERE id = ?`, values);
    return result;
  },

  async findAll({ page = 1, limit = 20, patient_id, doctor_id, status }) {
    let query = `SELECT c.*, du.full_name AS doctor_name, d.specialization, pu.full_name AS patient_name
                 FROM consultations c
                 JOIN doctors d ON c.doctor_id = d.id JOIN users du ON d.user_id = du.id
                 JOIN patients p ON c.patient_id = p.id JOIN users pu ON p.user_id = pu.id WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM consultations c WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (patient_id) { 
      query += ` AND c.patient_id = ?`; 
      countQuery += ` AND c.patient_id = ?`; 
      params.push(patient_id); 
      countParams.push(patient_id); 
    }
    if (doctor_id)  { 
      query += ` AND c.doctor_id = ?`;  
      countQuery += ` AND c.doctor_id = ?`;  
      params.push(doctor_id);  
      countParams.push(doctor_id); 
    }
    
    if (status) {
      if (status === 'active') {
        query += ` AND c.status IN ('requested', 'accepted', 'in_progress')`;
        countQuery += ` AND c.status IN ('requested', 'accepted', 'in_progress')`;
      } else {
        query += ` AND c.status = ?`;
        countQuery += ` AND c.status = ?`;
        params.push(status);
        countParams.push(status);
      }
    }

    const offset = (page - 1) * limit;
    query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.execute(countQuery, countParams);
    return { data: rows, total: countRows[0].total, page, limit, totalPages: Math.ceil(countRows[0].total / limit) };
  },

  /**
   * Log status transition in consultation_status_logs
   */
  async logStatusChange({ consultation_id, previous_status, new_status, changed_by, reason }) {
    await pool.execute(
      `INSERT INTO consultation_status_logs (consultation_id, previous_status, new_status, changed_by, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [consultation_id, previous_status || null, new_status, changed_by, reason || null]
    );
  },

  /**
   * Create or update consultation notes (clinical notes)
   */
  async addNotes(consultation_id, { diagnosis, recommendations, follow_up_advice, prescription_notes }) {
    const [exists] = await pool.execute(`SELECT id FROM consultation_notes WHERE consultation_id = ?`, [consultation_id]);
    if (exists.length > 0) {
      await pool.execute(
        `UPDATE consultation_notes 
         SET diagnosis = ?, recommendations = ?, follow_up_advice = ?, prescription_notes = ? 
         WHERE consultation_id = ?`,
        [diagnosis || null, recommendations || null, follow_up_advice || null, prescription_notes || null, consultation_id]
      );
    } else {
      await pool.execute(
        `INSERT INTO consultation_notes (consultation_id, diagnosis, recommendations, follow_up_advice, prescription_notes)
         VALUES (?, ?, ?, ?, ?)`,
        [consultation_id, diagnosis || null, recommendations || null, follow_up_advice || null, prescription_notes || null]
      );
    }
  },

  /**
   * Retrieve notes for a consultation
   */
  async getNotes(consultation_id) {
    const [rows] = await pool.execute(`SELECT * FROM consultation_notes WHERE consultation_id = ?`, [consultation_id]);
    return rows[0] || null;
  }
};

module.exports = Consultation;
