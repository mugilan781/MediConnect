// ============================================================
// MediConnect – models/PatientHistory.js
// Database queries for the patient_history table
// ============================================================

const pool = require('../config/db');

function parseMetadata(row) {
  if (row && row.metadata) {
    try {
      row.metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
    } catch (err) {
      // Keep as string if parsing fails
    }
  }
  return row;
}

const PatientHistory = {
  async create({ patient_id, event_type, source_module, source_record_id, title, description, event_date, recorded_by, metadata }) {
    const [result] = await pool.execute(
      `INSERT INTO patient_history (patient_id, event_type, source_module, source_record_id, title, description, event_date, recorded_by, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient_id,
        event_type,
        source_module || null,
        source_record_id || null,
        title,
        description || null,
        event_date || new Date(),
        recorded_by || null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );
    return result;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT ph.*, u.full_name AS recorded_by_name
       FROM patient_history ph
       LEFT JOIN users u ON ph.recorded_by = u.id
       WHERE ph.id = ?`,
      [id]
    );
    return parseMetadata(rows[0]) || null;
  },

  async findByPatientId(patientId, { page = 1, limit = 20, event_type, source_module, search } = {}) {
    let query = `SELECT ph.*, u.full_name AS recorded_by_name
                 FROM patient_history ph
                 LEFT JOIN users u ON ph.recorded_by = u.id
                 WHERE ph.patient_id = ?`;
    let countQuery = `SELECT COUNT(*) as total FROM patient_history ph WHERE ph.patient_id = ?`;
    const params = [patientId];
    const countParams = [patientId];

    if (event_type) {
      query += ` AND ph.event_type = ?`;
      countQuery += ` AND ph.event_type = ?`;
      params.push(event_type);
      countParams.push(event_type);
    }

    if (source_module) {
      query += ` AND ph.source_module = ?`;
      countQuery += ` AND ph.source_module = ?`;
      params.push(source_module);
      countParams.push(source_module);
    }

    if (search) {
      const s = `%${search}%`;
      query += ` AND (ph.title LIKE ? OR ph.description LIKE ? OR ph.event_type LIKE ? OR ph.metadata LIKE ?)`;
      countQuery += ` AND (ph.title LIKE ? OR ph.description LIKE ? OR ph.event_type LIKE ? OR ph.metadata LIKE ?)`;
      params.push(s, s, s, s);
      countParams.push(s, s, s, s);
    }

    const offset = (page - 1) * limit;
    query += ` ORDER BY ph.event_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.execute(countQuery, countParams);
    
    rows.forEach(parseMetadata);
    
    return {
      data: rows,
      total: countRows[0].total,
      page,
      limit,
      totalPages: Math.ceil(countRows[0].total / limit)
    };
  },

  async findAll({ page = 1, limit = 20, patient_ids, event_type, source_module, search } = {}) {
    let query = `SELECT ph.*, u.full_name AS recorded_by_name, pu.full_name AS patient_name
                 FROM patient_history ph
                 LEFT JOIN users u ON ph.recorded_by = u.id
                 LEFT JOIN patients p ON ph.patient_id = p.id
                 LEFT JOIN users pu ON p.user_id = pu.id
                 WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM patient_history ph WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (patient_ids) {
      const ids = Array.isArray(patient_ids) ? patient_ids : [patient_ids];
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        query += ` AND ph.patient_id IN (${placeholders})`;
        countQuery += ` AND ph.patient_id IN (${placeholders})`;
        params.push(...ids);
        countParams.push(...ids);
      } else {
        query += ` AND 1=0`;
        countQuery += ` AND 1=0`;
      }
    }

    if (event_type) {
      query += ` AND ph.event_type = ?`;
      countQuery += ` AND ph.event_type = ?`;
      params.push(event_type);
      countParams.push(event_type);
    }

    if (source_module) {
      query += ` AND ph.source_module = ?`;
      countQuery += ` AND ph.source_module = ?`;
      params.push(source_module);
      countParams.push(source_module);
    }

    if (search) {
      const s = `%${search}%`;
      query += ` AND (ph.title LIKE ? OR ph.description LIKE ? OR ph.event_type LIKE ? OR ph.metadata LIKE ?)`;
      countQuery += ` AND (ph.title LIKE ? OR ph.description LIKE ? OR ph.event_type LIKE ? OR ph.metadata LIKE ?)`;
      params.push(s, s, s, s);
      countParams.push(s, s, s, s);
    }

    const offset = (page - 1) * limit;
    query += ` ORDER BY ph.event_date DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.execute(countQuery, countParams);
    
    rows.forEach(parseMetadata);

    return {
      data: rows,
      total: countRows[0].total,
      page,
      limit,
      totalPages: Math.ceil(countRows[0].total / limit)
    };
  }
};

module.exports = PatientHistory;
