// ============================================================
// MediConnect – controllers/historyController.js
// Patient medical history timeline
// ============================================================

const PatientHistory = require('../models/PatientHistory');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const pool = require('../config/db');

async function isDoctorAssociatedWithPatient(doctorId, patientId) {
  const [appts] = await pool.execute(
    `SELECT id FROM appointments WHERE doctor_id = ? AND patient_id = ? LIMIT 1`,
    [doctorId, patientId]
  );
  if (appts.length > 0) return true;

  const [consults] = await pool.execute(
    `SELECT id FROM consultations WHERE doctor_id = ? AND patient_id = ? LIMIT 1`,
    [doctorId, patientId]
  );
  return consults.length > 0;
}

async function getDoctorCaredPatientIds(doctorId) {
  const [rows] = await pool.execute(
    `SELECT DISTINCT patient_id FROM appointments WHERE doctor_id = ?
     UNION
     SELECT DISTINCT patient_id FROM consultations WHERE doctor_id = ?`,
    [doctorId, doctorId]
  );
  return rows.map(r => r.patient_id);
}

// 1. GET /api/history
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, source_module, search } = req.query;
    let result;

    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient) return res.status(403).json({ success: false, message: 'Patient profile not found.' });
      result = await PatientHistory.findByPatientId(patient.id, { page, limit, source_module, search });
    } else if (req.user.role === 'doctor') {
      const doc = await Doctor.findByUserId(req.user.id);
      if (!doc) return res.status(403).json({ success: false, message: 'Doctor profile not found.' });
      const patientIds = await getDoctorCaredPatientIds(doc.id);
      result = await PatientHistory.findAll({ page, limit, patient_ids: patientIds, source_module, search });
    } else if (req.user.role === 'admin') {
      result = await PatientHistory.findAll({ page, limit, source_module, search });
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized role.' });
    }

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) { next(error); }
};

// 2. GET /api/history/:id
exports.getById = async (req, res, next) => {
  try {
    const entry = await PatientHistory.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'History entry not found.' });

    // Access control
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient || entry.patient_id !== patient.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You cannot access this entry.' });
      }
    } else if (req.user.role === 'doctor') {
      const doc = await Doctor.findByUserId(req.user.id);
      if (!doc) return res.status(403).json({ success: false, message: 'Doctor profile not found.' });
      const associated = await isDoctorAssociatedWithPatient(doc.id, entry.patient_id);
      if (!associated) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not have care authorization for this patient.' });
      }
    }

    res.json({ success: true, data: entry });
  } catch (error) { next(error); }
};

// 3. GET /api/history/patient/:patientId
exports.getByPatient = async (req, res, next) => {
  try {
    const targetPatientId = parseInt(req.params.patientId);

    // Access control
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient || patient.id !== targetPatientId) {
        return res.status(403).json({ success: false, message: 'Forbidden. You cannot access another patient\'s history.' });
      }
    } else if (req.user.role === 'doctor') {
      const doc = await Doctor.findByUserId(req.user.id);
      if (!doc) return res.status(403).json({ success: false, message: 'Doctor profile not found.' });
      const associated = await isDoctorAssociatedWithPatient(doc.id, targetPatientId);
      if (!associated) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not have care authorization for this patient.' });
      }
    }

    const result = await PatientHistory.findByPatientId(targetPatientId, req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) { next(error); }
};

// 4. GET /api/history/search
exports.search = async (req, res, next) => {
  try {
    const { query, patientId, page = 1, limit = 20, source_module } = req.query;
    let result;

    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient) return res.status(403).json({ success: false, message: 'Patient profile not found.' });
      result = await PatientHistory.findByPatientId(patient.id, { page, limit, source_module, search: query });
    } else if (req.user.role === 'doctor') {
      const doc = await Doctor.findByUserId(req.user.id);
      if (!doc) return res.status(403).json({ success: false, message: 'Doctor profile not found.' });
      
      if (patientId) {
        const associated = await isDoctorAssociatedWithPatient(doc.id, patientId);
        if (!associated) return res.status(403).json({ success: false, message: 'Forbidden. Patient not associated.' });
        result = await PatientHistory.findByPatientId(patientId, { page, limit, source_module, search: query });
      } else {
        const patientIds = await getDoctorCaredPatientIds(doc.id);
        result = await PatientHistory.findAll({ page, limit, patient_ids: patientIds, source_module, search: query });
      }
    } else if (req.user.role === 'admin') {
      if (patientId) {
        result = await PatientHistory.findByPatientId(patientId, { page, limit, source_module, search: query });
      } else {
        result = await PatientHistory.findAll({ page, limit, source_module, search: query });
      }
    }

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) { next(error); }
};

// 5. GET /api/history/timeline
exports.getTimeline = async (req, res, next) => {
  try {
    const { patientId } = req.query;
    let targetPatientId;

    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient) return res.status(403).json({ success: false, message: 'Patient profile not found.' });
      targetPatientId = patient.id;
    } else if (req.user.role === 'doctor') {
      if (!patientId) return res.status(400).json({ success: false, message: 'patientId query parameter is required for doctors.' });
      const doc = await Doctor.findByUserId(req.user.id);
      if (!doc) return res.status(403).json({ success: false, message: 'Doctor profile not found.' });
      targetPatientId = parseInt(patientId);
      const associated = await isDoctorAssociatedWithPatient(doc.id, targetPatientId);
      if (!associated) {
        return res.status(403).json({ success: false, message: 'Forbidden. Patient not associated.' });
      }
    } else if (req.user.role === 'admin') {
      if (!patientId) return res.status(400).json({ success: false, message: 'patientId query parameter is required for admins.' });
      targetPatientId = parseInt(patientId);
    }

    const result = await PatientHistory.findByPatientId(targetPatientId, { ...req.query, limit: 100 });
    res.json({ success: true, data: result.data });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const { patient_id, event_type, source_module, source_record_id, title, description, event_date, metadata } = req.body;
    const result = await PatientHistory.create({
      patient_id,
      event_type,
      source_module,
      source_record_id,
      title,
      description,
      event_date,
      recorded_by: req.user.id,
      metadata
    });
    const entry = await PatientHistory.findById(result.insertId);
    res.status(201).json({ success: true, message: 'History entry added.', data: entry });
  } catch (error) { next(error); }
};
