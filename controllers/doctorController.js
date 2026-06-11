// ============================================================
// MediConnect – controllers/doctorController.js
// Doctor CRUD, schedules, custom slots, leaves, and patient files
// ============================================================

const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Patient = require('../models/Patient');
const PatientHistory = require('../models/PatientHistory');
const MedicalReport = require('../models/MedicalReport');
const LabBooking = require('../models/LabBooking');
const Appointment = require('../models/Appointment');
const Consultation = require('../models/Consultation');
const appointmentService = require('../services/appointmentService');
const pool = require('../config/db');

// Helper to verify if a doctor is associated with a patient
async function checkAssociation(doctorId, patientId) {
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

exports.getAll = async (req, res, next) => {
  try {
    const result = await Doctor.findAll(req.query);
    res.json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    res.json({ success: true, data: doctor });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    await Doctor.update(req.params.id, req.body);
    if (req.body.full_name || req.body.phone) {
      const doctor = await Doctor.findById(req.params.id);
      await User.update(doctor.user_id, { full_name: req.body.full_name, phone: req.body.phone });
    }
    const updated = await Doctor.findById(req.params.id);
    res.json({ success: true, message: 'Doctor profile updated.', data: updated });
  } catch (error) { next(error); }
};

// Returns available and booked slots info (enhanced for compatibility)
exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date query parameter is required.' });
    const slots = await appointmentService.getAvailableSlotsInfo(req.params.id, date);
    res.json({ success: true, data: slots });
  } catch (error) { next(error); }
};

exports.updateAvailability = async (req, res, next) => {
  try {
    const { available_days, slot_duration_min, is_available } = req.body;
    await Doctor.update(req.params.id, { available_days, slot_duration_min, is_available });
    res.json({ success: true, message: 'Availability updated.' });
  } catch (error) { next(error); }
};

exports.deactivate = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    await User.deactivate(doctor.user_id);
    res.json({ success: true, message: 'Doctor account deactivated.' });
  } catch (error) { next(error); }
};

exports.getSummary = async (req, res, next) => {
  try {
    const summary = await Doctor.getSummary(req.params.id);
    res.json({ success: true, data: summary });
  } catch (error) { next(error); }
};

// --- Doctor-Scoped Weekly Schedules ---

exports.getMySchedule = async (req, res, next) => {
  try {
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

    const [schedules] = await pool.execute(
      `SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY FIELD(day_of_week, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')`,
      [doc.id]
    );

    res.json({
      success: true,
      data: {
        slot_duration_min: doc.slot_duration_min,
        schedules
      }
    });
  } catch (error) { next(error); }
};

exports.updateMySchedule = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    const { slot_duration_min, schedules } = req.body;

    if (slot_duration_min !== undefined) {
      await connection.execute(
        `UPDATE doctors SET slot_duration_min = ? WHERE id = ?`,
        [slot_duration_min, doc.id]
      );
    }

    // Clear and rebuild weekly schedule rows
    await connection.execute(`DELETE FROM doctor_schedules WHERE doctor_id = ?`, [doc.id]);

    if (schedules && Array.isArray(schedules)) {
      for (const s of schedules) {
        if (!s.day_of_week || !s.start_time || !s.end_time) continue;
        await connection.execute(
          `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, break_start_time, break_end_time, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            doc.id,
            s.day_of_week,
            s.start_time,
            s.end_time,
            s.break_start_time || null,
            s.break_end_time || null,
            s.is_active !== undefined ? s.is_active : 1
          ]
        );
      }
    }

    await connection.commit();
    connection.release();
    res.json({ success: true, message: 'Schedule updated successfully.' });
  } catch (error) {
    await connection.rollback();
    connection.release();
    next(error);
  }
};

// --- Doctor-Scoped Custom Availability Slots ---

exports.getMySlots = async (req, res, next) => {
  try {
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

    const [slots] = await pool.execute(
      `SELECT * FROM doctor_availability_slots WHERE doctor_id = ? ORDER BY slot_date DESC, start_time ASC`,
      [doc.id]
    );
    res.json({ success: true, data: slots });
  } catch (error) { next(error); }
};

exports.createMySlot = async (req, res, next) => {
  try {
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

    const { slot_date, start_time, end_time, is_available } = req.body;
    if (!slot_date || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'slot_date, start_time, and end_time are required.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO doctor_availability_slots (doctor_id, slot_date, start_time, end_time, is_available)
       VALUES (?, ?, ?, ?, ?)`,
      [doc.id, slot_date, start_time, end_time, is_available !== undefined ? is_available : 1]
    );

    res.status(201).json({ success: true, message: 'Custom availability slot created.', data: { id: result.insertId } });
  } catch (error) { next(error); }
};

exports.updateMySlot = async (req, res, next) => {
  try {
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

    const { is_available, start_time, end_time } = req.body;
    const updates = [];
    const values = [];

    if (is_available !== undefined) { updates.push('is_available = ?'); values.push(is_available); }
    if (start_time !== undefined) { updates.push('start_time = ?'); values.push(start_time); }
    if (end_time !== undefined) { updates.push('end_time = ?'); values.push(end_time); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    values.push(req.params.id, doc.id);
    await pool.execute(
      `UPDATE doctor_availability_slots SET ${updates.join(', ')} WHERE id = ? AND doctor_id = ?`,
      values
    );

    res.json({ success: true, message: 'Custom slot updated successfully.' });
  } catch (error) { next(error); }
};

exports.deleteMySlot = async (req, res, next) => {
  try {
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

    const [result] = await pool.execute(
      `DELETE FROM doctor_availability_slots WHERE id = ? AND doctor_id = ?`,
      [req.params.id, doc.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Custom slot not found.' });
    }

    res.json({ success: true, message: 'Custom slot deleted successfully.' });
  } catch (error) { next(error); }
};

// --- Doctor-Scoped Leaves ---

exports.getMyLeaves = async (req, res, next) => {
  try {
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

    const [leaves] = await pool.execute(
      `SELECT * FROM doctor_leaves WHERE doctor_id = ? ORDER BY start_date DESC`,
      [doc.id]
    );
    res.json({ success: true, data: leaves });
  } catch (error) { next(error); }
};

exports.createMyLeave = async (req, res, next) => {
  try {
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

    const { start_date, end_date, reason } = req.body;
    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'start_date and end_date are required.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO doctor_leaves (doctor_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)`,
      [doc.id, start_date, end_date, reason || null]
    );

    res.status(201).json({ success: true, message: 'Leave request recorded.', data: { id: result.insertId } });
  } catch (error) { next(error); }
};

exports.deleteMyLeave = async (req, res, next) => {
  try {
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

    const [result] = await pool.execute(
      `DELETE FROM doctor_leaves WHERE id = ? AND doctor_id = ?`,
      [req.params.id, doc.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Leave entry not found.' });
    }

    res.json({ success: true, message: 'Leave request deleted/cancelled.' });
  } catch (error) { next(error); }
};

// --- Associated Patient Record Access (Read-Only) ---

exports.getPatientProfile = async (req, res, next) => {
  try {
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) return res.status(403).json({ success: false, message: 'Access denied.' });

    const associated = await checkAssociation(doc.id, req.params.id);
    if (!associated) {
      return res.status(403).json({ success: false, message: 'Access denied. Patient not associated with you.' });
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

    res.json({ success: true, data: patient });
  } catch (error) { next(error); }
};

exports.getPatientHistory = async (req, res, next) => {
  try {
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) return res.status(403).json({ success: false, message: 'Access denied.' });

    const associated = await checkAssociation(doc.id, req.params.id);
    if (!associated) {
      return res.status(403).json({ success: false, message: 'Access denied. Patient not associated with you.' });
    }

    const result = await PatientHistory.findByPatientId(req.params.id, req.query);
    res.json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

exports.getPatientReports = async (req, res, next) => {
  try {
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) return res.status(403).json({ success: false, message: 'Access denied.' });

    const associated = await checkAssociation(doc.id, req.params.id);
    if (!associated) {
      return res.status(403).json({ success: false, message: 'Access denied. Patient not associated with you.' });
    }

    const filters = { ...req.query, patient_id: req.params.id };
    const result = await MedicalReport.findAll(filters);
    res.json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

exports.getPatientLabTests = async (req, res, next) => {
  try {
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) return res.status(403).json({ success: false, message: 'Access denied.' });

    const associated = await checkAssociation(doc.id, req.params.id);
    if (!associated) {
      return res.status(403).json({ success: false, message: 'Access denied. Patient not associated with you.' });
    }

    const filters = { ...req.query, patient_id: req.params.id };
    const result = await LabBooking.findAll(filters);
    res.json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

exports.getPatientAppointments = async (req, res, next) => {
  try {
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) return res.status(403).json({ success: false, message: 'Access denied.' });

    const associated = await checkAssociation(doc.id, req.params.id);
    if (!associated) {
      return res.status(403).json({ success: false, message: 'Access denied. Patient not associated with you.' });
    }

    const filters = { ...req.query, patient_id: req.params.id };
    const result = await Appointment.findAll(filters);
    res.json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

exports.getPatientConsultations = async (req, res, next) => {
  try {
    const doc = await Doctor.findByUserId(req.user.id);
    if (!doc) return res.status(403).json({ success: false, message: 'Access denied.' });

    const associated = await checkAssociation(doc.id, req.params.id);
    if (!associated) {
      return res.status(403).json({ success: false, message: 'Access denied. Patient not associated with you.' });
    }

    const filters = { ...req.query, patient_id: req.params.id };
    const result = await Consultation.findAll(filters);
    res.json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};
