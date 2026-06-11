// ============================================================
// MediConnect – controllers/consultationController.js
// Consultation records & Online Consultation request management
// ============================================================

const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const PatientHistory = require('../models/PatientHistory');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const pool = require('../config/db');
const historyGenerator = require('../services/historyGenerator');
const {
  notifyConsultationRequested,
  notifyConsultationAccepted,
  notifyConsultationRejected,
  notifyConsultationScheduled,
  notifyConsultationCompleted,
  notifyConsultationCancelled
} = require('../services/notificationService');

/**
 * 1. Create a consultation request (Patient only)
 */
exports.create = async (req, res, next) => {
  try {
    const { doctor_id, preferred_date, symptoms, health_concerns, additional_notes } = req.body;

    const patient = await Patient.findByUserId(req.user.id);
    if (!patient) {
      return res.status(403).json({ success: false, message: 'Patient profile not found.' });
    }

    // Prevent past preferred dates
    const todayStr = new Date().toISOString().split('T')[0];
    if (preferred_date < todayStr) {
      return res.status(400).json({ success: false, message: 'Preferred consultation date cannot be in the past.' });
    }

    // Verify doctor selection
    const doctor = await Doctor.findById(doctor_id);
    if (!doctor) {
      return res.status(400).json({ success: false, message: 'Invalid doctor selection.' });
    }

    // Prevent duplicate active consultation requests
    const [duplicates] = await pool.execute(
      `SELECT id FROM consultations 
       WHERE patient_id = ? AND doctor_id = ? AND preferred_date = ? 
         AND status NOT IN ('completed', 'cancelled', 'rejected')`,
      [patient.id, doctor_id, preferred_date]
    );
    if (duplicates.length > 0) {
      return res.status(409).json({ success: false, message: 'You already have an active consultation request with this doctor for this date.' });
    }

    // Insert consultation request
    const result = await Consultation.create({
      doctor_id,
      patient_id: patient.id,
      preferred_date,
      symptoms,
      health_concerns,
      additional_notes,
      status: 'requested',
    });

    const consultationId = result.insertId;

    // Log the initial status in status logs
    await Consultation.logStatusChange({
      consultation_id: consultationId,
      previous_status: null,
      new_status: 'requested',
      changed_by: 'patient',
      reason: 'Patient submitted consultation request',
    });

    // Log to patient history
    await historyGenerator.logConsultationEvent(consultationId, 'Consultation Requested', req.user.id);

    // Notify doctor (doctor.user_id is the recipient user ID)
    await notifyConsultationRequested({
      doctorUserId: doctor.user_id,
      patientName: patient.full_name,
      date: preferred_date,
    });

    const created = await Consultation.findById(consultationId);
    res.status(201).json({ success: true, message: 'Consultation request submitted.', data: created });
  } catch (error) { next(error); }
};

/**
 * 2. Accept consultation request (Doctor only)
 */
exports.accept = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation request not found.' });

    // Guard: Only associated doctor can accept
    const doctor = await Doctor.findByUserId(req.user.id);
    if (!doctor || consultation.doctor_id !== doctor.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You are not authorized for this consultation.' });
    }

    // Validate status transition
    if (consultation.status !== 'requested') {
      return res.status(400).json({ success: false, message: `Invalid status transition from ${consultation.status} to accepted.` });
    }

    // Update status to accepted
    await Consultation.update(req.params.id, { status: 'accepted' });

    // Log transition
    await Consultation.logStatusChange({
      consultation_id: req.params.id,
      previous_status: 'requested',
      new_status: 'accepted',
      changed_by: 'doctor',
      reason: 'Doctor accepted the request',
    });

    // Log to patient history
    await historyGenerator.logConsultationEvent(req.params.id, 'Consultation Accepted', req.user.id);

    // Notify patient
    const [patientUser] = await pool.execute(`SELECT user_id FROM patients WHERE id = ?`, [consultation.patient_id]);
    if (patientUser[0]) {
      await notifyConsultationAccepted({
        patientUserId: patientUser[0].user_id,
        doctorName: doctor.full_name,
      });
    }

    const updated = await Consultation.findById(req.params.id);
    res.json({ success: true, message: 'Consultation request accepted.', data: updated });
  } catch (error) { next(error); }
};

/**
 * 3. Reject consultation request (Doctor only)
 */
exports.reject = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation request not found.' });

    // Guard: Only doctor
    const doctor = await Doctor.findByUserId(req.user.id);
    if (!doctor || consultation.doctor_id !== doctor.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You are not authorized for this consultation.' });
    }

    // Validate status transition
    if (consultation.status !== 'requested') {
      return res.status(400).json({ success: false, message: `Invalid status transition from ${consultation.status} to rejected.` });
    }

    // Update status
    await Consultation.update(req.params.id, { status: 'rejected' });

    // Log transition
    await Consultation.logStatusChange({
      consultation_id: req.params.id,
      previous_status: 'requested',
      new_status: 'rejected',
      changed_by: 'doctor',
      reason: reason || 'Declined by doctor',
    });

    // Notify patient
    const [patientUser] = await pool.execute(`SELECT user_id FROM patients WHERE id = ?`, [consultation.patient_id]);
    if (patientUser[0]) {
      await notifyConsultationRejected({
        patientUserId: patientUser[0].user_id,
        doctorName: doctor.full_name,
        reason,
      });
    }

    const updated = await Consultation.findById(req.params.id);
    res.json({ success: true, message: 'Consultation request rejected.', data: updated });
  } catch (error) { next(error); }
};

/**
 * 4. Schedule consultation (Doctor only)
 */
exports.schedule = async (req, res, next) => {
  try {
    const { consultation_date, consultation_time, duration, notes } = req.body;
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation request not found.' });

    // Guard: Only doctor
    const doctor = await Doctor.findByUserId(req.user.id);
    if (!doctor || consultation.doctor_id !== doctor.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You are not authorized for this consultation.' });
    }

    // Validate status transition
    if (!['accepted', 'scheduled'].includes(consultation.status)) {
      return res.status(400).json({ success: false, message: `Cannot schedule a consultation in ${consultation.status} state.` });
    }

    // Prevent past scheduling dates
    const todayStr = new Date().toISOString().split('T')[0];
    if (consultation_date < todayStr) {
      return res.status(400).json({ success: false, message: 'Consultation scheduled date cannot be in the past.' });
    }

    // Create a corresponding entry in the appointments table (if not already created)
    let appointmentId = consultation.appointment_id;
    if (!appointmentId) {
      // Find a clean end time
      const [sh, sm] = consultation_time.split(':').map(Number);
      const endTotalMins = sh * 60 + sm + (duration || 30);
      const eh = Math.floor(endTotalMins / 60);
      const em = endTotalMins % 60;
      const endTimeStr = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

      const apptResult = await Appointment.create({
        patient_id: consultation.patient_id,
        doctor_id: consultation.doctor_id,
        appointment_date: consultation_date,
        appointment_time: consultation_time,
        end_time: endTimeStr,
        type: 'teleconsult',
        reason: consultation.symptoms || 'Online Consultation',
      });
      appointmentId = apptResult.insertId;
      
      // Update appointment status to confirmed
      await Appointment.updateStatus(appointmentId, { status: 'confirmed' });
      await Appointment.logStatusChange({
        appointment_id: appointmentId,
        previous_status: null,
        new_status: 'confirmed',
        changed_by: 'system',
        reason: 'Confirmed automatically upon consultation schedule',
      });
    } else {
      // Rescheduling existing linked appointment
      await Appointment.reschedule(appointmentId, {
        appointment_date: consultation_date,
        appointment_time: consultation_time,
        status: 'rescheduled',
      });
      await Appointment.logReschedule({
        appointment_id: appointmentId,
        previous_date: consultation.consultation_date,
        previous_time: consultation.consultation_time,
        new_date: consultation_date,
        new_time: consultation_time,
        rescheduled_by: 'doctor',
        reason: notes || 'Rescheduled consultation',
      });
    }

    // Update status to scheduled and populate fields
    await Consultation.update(req.params.id, {
      status: 'scheduled',
      consultation_date,
      consultation_time,
      duration: duration || 30,
      scheduled_notes: notes || null,
      appointment_id: appointmentId,
    });

    // Log transition
    await Consultation.logStatusChange({
      consultation_id: req.params.id,
      previous_status: consultation.status,
      new_status: 'scheduled',
      changed_by: 'doctor',
      reason: notes || 'Consultation scheduled',
    });

    // Log to patient history
    await historyGenerator.logConsultationEvent(req.params.id, 'Consultation Scheduled', req.user.id, notes);

    // Notify patient
    const [patientUser] = await pool.execute(`SELECT user_id FROM patients WHERE id = ?`, [consultation.patient_id]);
    if (patientUser[0]) {
      await notifyConsultationScheduled({
        patientUserId: patientUser[0].user_id,
        doctorName: doctor.full_name,
        date: consultation_date,
        time: consultation_time,
      });
    }

    const updated = await Consultation.findById(req.params.id);
    res.json({ success: true, message: 'Consultation scheduled successfully.', data: updated });
  } catch (error) { next(error); }
};

/**
 * 5. Start consultation (Doctor only)
 */
exports.start = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation request not found.' });

    // Guard: Only doctor
    const doctor = await Doctor.findByUserId(req.user.id);
    if (!doctor || consultation.doctor_id !== doctor.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You are not authorized for this consultation.' });
    }

    // Validate status transition: only scheduled
    if (consultation.status !== 'scheduled') {
      return res.status(400).json({ success: false, message: `Cannot start consultation in ${consultation.status} state.` });
    }

    await Consultation.update(req.params.id, { status: 'in_progress' });

    // Log transition
    await Consultation.logStatusChange({
      consultation_id: req.params.id,
      previous_status: 'scheduled',
      new_status: 'in_progress',
      changed_by: 'doctor',
      reason: 'Doctor started the video consultation',
    });

    const updated = await Consultation.findById(req.params.id);
    res.json({ success: true, message: 'Consultation started (in progress).', data: updated });
  } catch (error) { next(error); }
};

/**
 * 6. Complete consultation and add notes (Doctor only)
 */
exports.complete = async (req, res, next) => {
  try {
    const { diagnosis, recommendations, follow_up_advice, prescription_notes, prescription_file_url } = req.body;
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation request not found.' });

    // Guard: Only doctor
    const doctor = await Doctor.findByUserId(req.user.id);
    if (!doctor || consultation.doctor_id !== doctor.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You are not authorized for this consultation.' });
    }

    // Validate status transition: only in_progress
    if (consultation.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: `Cannot complete consultation in ${consultation.status} state.` });
    }

    // Update status to completed
    await Consultation.update(req.params.id, { 
      status: 'completed',
      diagnosis: diagnosis || null,
      prescription: prescription_notes || null,
      prescription_file_url: prescription_file_url || null,
      follow_up_date: req.body.follow_up_date || null,
    });

    // Insert notes into consultation_notes
    await Consultation.addNotes(req.params.id, {
      diagnosis,
      recommendations,
      follow_up_advice,
      prescription_notes,
    });

    // Update linked appointment to completed
    if (consultation.appointment_id) {
      await Appointment.updateStatus(consultation.appointment_id, { status: 'completed' });
      await Appointment.logStatusChange({
        appointment_id: consultation.appointment_id,
        previous_status: 'confirmed',
        new_status: 'completed',
        changed_by: 'system',
        reason: 'Completed automatically upon consultation complete',
      });
    }

    // Log transition
    await Consultation.logStatusChange({
      consultation_id: req.params.id,
      previous_status: 'in_progress',
      new_status: 'completed',
      changed_by: 'doctor',
      reason: 'Doctor finished the consultation and added clinical notes',
    });

    // Add to patient history
    await historyGenerator.logConsultationEvent(consultation.id, 'Consultation Completed', req.user.id, diagnosis);

    // Notify patient
    const [patientUser] = await pool.execute(`SELECT user_id FROM patients WHERE id = ?`, [consultation.patient_id]);
    if (patientUser[0]) {
      await notifyConsultationCompleted({
        patientUserId: patientUser[0].user_id,
        doctorName: doctor.full_name,
      });
    }

    const updated = await Consultation.findById(req.params.id);
    res.json({ success: true, message: 'Consultation completed successfully.', data: updated });
  } catch (error) { next(error); }
};

/**
 * 7. Cancel consultation (Patient, Doctor, or Admin)
 */
exports.cancel = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation request not found.' });

    // Validate status transition: completed, rejected, cancelled are final
    if (['completed', 'rejected', 'cancelled'].includes(consultation.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel a consultation that is already ${consultation.status}.` });
    }

    // Role-specific ownership checks
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient || consultation.patient_id !== patient.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not own this consultation.' });
      }
      // Patients can only cancel before acceptance
      if (consultation.status !== 'requested') {
        return res.status(400).json({ success: false, message: 'Patients can only cancel consultations before they are accepted.' });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor || consultation.doctor_id !== doctor.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not own this consultation.' });
      }
    }

    const previousStatus = consultation.status;

    // Update status to cancelled
    await Consultation.update(req.params.id, { status: 'cancelled' });

    // Cancel linked appointment if exists
    if (consultation.appointment_id) {
      await Appointment.updateStatus(consultation.appointment_id, {
        status: 'cancelled',
        cancelled_by: req.user.role,
        cancel_reason: req.body.reason || 'Consultation request cancelled',
      });
      await Appointment.logStatusChange({
        appointment_id: consultation.appointment_id,
        previous_status: 'confirmed',
        new_status: 'cancelled',
        changed_by: req.user.role,
        reason: 'Cancelled because linked consultation was cancelled',
      });
    }

    // Log status transition
    await Consultation.logStatusChange({
      consultation_id: req.params.id,
      previous_status: previousStatus,
      new_status: 'cancelled',
      changed_by: req.user.role,
      reason: req.body.reason || 'Cancelled by user',
    });

    // Notify the other party
    let recipientUserId = null;
    if (req.user.role === 'patient') {
      const [docUser] = await pool.execute(`SELECT user_id FROM doctors WHERE id = ?`, [consultation.doctor_id]);
      if (docUser[0]) recipientUserId = docUser[0].user_id;
    } else {
      const [patUser] = await pool.execute(`SELECT user_id FROM patients WHERE id = ?`, [consultation.patient_id]);
      if (patUser[0]) recipientUserId = patUser[0].user_id;
    }

    if (recipientUserId) {
      await notifyConsultationCancelled({
        userId: recipientUserId,
        cancelledBy: req.user.role === 'patient' ? 'the patient' : 'the doctor',
      });
    }

    const updated = await Consultation.findById(req.params.id);
    res.json({ success: true, message: 'Consultation request cancelled successfully.', data: updated });
  } catch (error) { next(error); }
};

/**
 * 8. Add notes separately (Doctor only)
 */
exports.addNotes = async (req, res, next) => {
  try {
    const { diagnosis, recommendations, follow_up_advice, prescription_notes } = req.body;
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation request not found.' });

    // Guard: Only doctor
    const doctor = await Doctor.findByUserId(req.user.id);
    if (!doctor || consultation.doctor_id !== doctor.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You are not authorized for this consultation.' });
    }

    // Update DB
    await Consultation.addNotes(req.params.id, {
      diagnosis,
      recommendations,
      follow_up_advice,
      prescription_notes,
    });

    // Mirror to core consultations record fields if applicable
    await Consultation.update(req.params.id, {
      diagnosis: diagnosis || null,
      prescription: prescription_notes || null,
    });

    const notes = await Consultation.getNotes(req.params.id);
    res.json({ success: true, message: 'Consultation notes added/updated.', data: notes });
  } catch (error) { next(error); }
};

/**
 * 9. Get all consultations (role-aware list)
 */
exports.getAll = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      filters.patient_id = patient?.id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findByUserId(req.user.id);
      filters.doctor_id = doctor?.id;
    }
    const result = await Consultation.findAll(filters);
    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) { next(error); }
};

/**
 * 10. Get consultation by ID (role-aware ownership checked)
 */
exports.getById = async (req, res, next) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) return res.status(404).json({ success: false, message: 'Consultation not found.' });

    // Guards
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient || consultation.patient_id !== patient.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not have access to this consultation.' });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor || consultation.doctor_id !== doctor.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not have access to this consultation.' });
      }
    }

    res.json({ success: true, data: consultation });
  } catch (error) { next(error); }
};

/**
 * 11. Legacy appointment getter
 */
exports.getByAppointment = async (req, res, next) => {
  try {
    const consultation = await Consultation.findByAppointmentId(req.params.appointmentId);
    if (!consultation) return res.status(404).json({ success: false, message: 'No consultation found for this appointment.' });
    res.json({ success: true, data: consultation });
  } catch (error) { next(error); }
};
