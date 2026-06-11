// ============================================================
// MediConnect – models/SampleCollection.js
// Database queries for the sample_collection_requests table
// ============================================================

const pool = require('../config/db');

const SampleCollection = {
  async create({ lab_booking_id, patient_id, collection_address, preferred_date, preferred_time_slot, notes }) {
    const [result] = await pool.execute(
      `INSERT INTO sample_collection_requests (lab_booking_id, patient_id, collection_address, preferred_date, preferred_time_slot, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [lab_booking_id, patient_id, collection_address, preferred_date, preferred_time_slot || null, notes || null]
    );
    return result;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT scr.*, pu.full_name AS patient_name, pu.phone AS patient_phone,
              lt.test_name, lb.booking_date, lb.status as booking_status
       FROM sample_collection_requests scr
       JOIN patients p ON scr.patient_id = p.id JOIN users pu ON p.user_id = pu.id
       JOIN lab_bookings lb ON scr.lab_booking_id = lb.id
       JOIN lab_tests lt ON lb.lab_test_id = lt.id
       WHERE scr.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async updateStatus(id, status) {
    const updates = ['status = ?'];
    const values = [status];
    if (status === 'collected') { 
      updates.push('collected_at = NOW()'); 
    }
    values.push(id);
    const [result] = await pool.execute(`UPDATE sample_collection_requests SET ${updates.join(', ')} WHERE id = ?`, values);
    return result;
  },

  async assignCollector(id, { collector_name, collector_phone, collection_date, collection_time, notes }) {
    const [result] = await pool.execute(
      `UPDATE sample_collection_requests 
       SET collector_name = ?, collector_phone = ?, collection_date = ?, collection_time = ?, notes = COALESCE(?, notes), status = 'assigned' 
       WHERE id = ?`,
      [collector_name, collector_phone, collection_date, collection_time, notes || null, id]
    );
    return result;
  },

  async logStatusChange({ sample_collection_request_id, previous_status, new_status, changed_by, reason }) {
    const [result] = await pool.execute(
      `INSERT INTO sample_collection_status_logs (sample_collection_request_id, previous_status, new_status, changed_by, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [sample_collection_request_id, previous_status || null, new_status, changed_by, reason || null]
    );
    return result;
  },

  async update(id, fields) {
    const allowed = ['collection_address', 'preferred_date', 'preferred_time_slot', 'notes', 'collection_date', 'collection_time', 'collector_name', 'collector_phone'];
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
    const [result] = await pool.execute(`UPDATE sample_collection_requests SET ${updates.join(', ')} WHERE id = ?`, values);
    return result;
  },

  async findAll({ page = 1, limit = 20, patient_id, status }) {
    let query = `SELECT scr.*, pu.full_name AS patient_name, pu.phone AS patient_phone,
                        lt.test_name, lb.booking_date, lb.status as booking_status
                 FROM sample_collection_requests scr
                 JOIN patients p ON scr.patient_id = p.id JOIN users pu ON p.user_id = pu.id
                 JOIN lab_bookings lb ON scr.lab_booking_id = lb.id
                 JOIN lab_tests lt ON lb.lab_test_id = lt.id WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM sample_collection_requests scr WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (patient_id) { 
      query += ` AND scr.patient_id = ?`; 
      countQuery += ` AND scr.patient_id = ?`; 
      params.push(patient_id); 
      countParams.push(patient_id); 
    }
    if (status) { 
      query += ` AND scr.status = ?`; 
      countQuery += ` AND scr.status = ?`; 
      params.push(status); 
      countParams.push(status); 
    }

    const offset = (page - 1) * limit;
    query += ` ORDER BY scr.preferred_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.execute(countQuery, countParams);
    return { data: rows, total: countRows[0].total, page, limit, totalPages: Math.ceil(countRows[0].total / limit) };
  },
};

module.exports = SampleCollection;

