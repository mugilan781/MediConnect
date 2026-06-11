// ============================================================
// MediConnect – controllers/appointmentController.js
// Appointment booking, cancel, reschedule
// ============================================================

const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const notificationService = require('../services/notificationService');
const historyGenerator = require('../services/historyGenerator');
const pool = require('../config/db');

exports.create = async (req, res, next) => {
  try {
    const { doctor_id, appointment_date, appointment_time, type, reason } = req.body;

    // Get patient profile from authenticated user
    const patient = await Patient.findByUserId(req.user.id);
    if (!patient) return res.status(400).json({ success: false, message: 'Patient profile not found.' });

    // Check for conflicts
    const conflict = await Appointment.checkConflict(doctor_id, appointment_date, appointment_time);
    if (conflict) {
      return res.status(409).json({ success: false, message: 'This time slot is already booked.' });
    }

    const result = await Appointment.create({
      patient_id: patient.id, doctor_id, appointment_date, appointment_time, type, reason,
    });

    const appointmentId = result.insertId;

    // Log the initial status creation as 'pending'
    await Appointment.logStatusChange({
      appointment_id: appointmentId,
      previous_status: null,
      new_status: 'pending',
      changed_by: req.user.role || 'patient',
      reason: 'Appointment booked',
    });

    // Log to patient history
    await historyGenerator.logAppointmentEvent(appointmentId, 'Appointment Created', req.user.id);

    // Send notification to doctor & patient confirmation
    const doctor = await Doctor.findById(doctor_id);
    if (doctor) {
      const formattedDate = appointment_date instanceof Date ? appointment_date.toISOString().split('T')[0] : appointment_date;

      notificationService.notifyAppointmentBookingConfirmation({
        patientUserId: req.user.id,
        doctorName: doctor.full_name,
        date: formattedDate,
        time: appointment_time,
        appointmentId
      }).catch(err => console.error('Patient appointment notification failed:', err.message));

      notificationService.notifyAppointmentBooked({
        doctorUserId: doctor.user_id,
        patientName: patient.full_name,
        date: formattedDate,
        time: appointment_time,
        appointmentId
      }).catch(err => console.error('Doctor appointment notification failed:', err.message));
    }

    const appointment = await Appointment.findById(appointmentId);
    res.status(201).json({ success: true, message: 'Appointment booked successfully.', data: appointment });
  } catch (error) { next(error); }
};

exports.getAll = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    // Apply role-based filter
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      filters.patient_id = patient?.id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findByUserId(req.user.id);
      filters.doctor_id = doctor?.id;
    }
    const result = await Appointment.findAll(filters);
    res.json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    // Ownership guards
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient || appointment.patient_id !== patient.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not have access to this appointment.' });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor || appointment.doctor_id !== doctor.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not have access to this appointment.' });
      }
    }

    res.json({ success: true, data: appointment });
  } catch (error) { next(error); }
};

exports.reschedule = async (req, res, next) => {
  try {
    const { appointment_date, appointment_time, end_time, reason } = req.body;

    // Fetch existing appointment to get doctor_id and exclude self from conflict
    const existing = await Appointment.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    // Ownership guards
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient || existing.patient_id !== patient.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to reschedule this appointment.' });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor || existing.doctor_id !== doctor.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to reschedule this appointment.' });
      }
    }

    const doctorId = req.body.doctor_id || existing.doctor_id;
    const conflict = await Appointment.checkConflict(doctorId, appointment_date, appointment_time, req.params.id);
    if (conflict) return res.status(409).json({ success: false, message: 'The new time slot is already booked.' });

    // Perform reschedule
    await Appointment.reschedule(req.params.id, { appointment_date, appointment_time, end_time, status: 'rescheduled' });

    // Log the reschedule event
    await Appointment.logReschedule({
      appointment_id: req.params.id,
      previous_date: existing.appointment_date,
      previous_time: existing.appointment_time,
      new_date: appointment_date,
      new_time: appointment_time,
      rescheduled_by: req.user.role,
      reason,
    });

    // Log the status transition
    await Appointment.logStatusChange({
      appointment_id: req.params.id,
      previous_status: existing.status,
      new_status: 'rescheduled',
      changed_by: req.user.role,
      reason: reason || 'Appointment rescheduled',
    });

    // Log to patient history
    await historyGenerator.logAppointmentEvent(req.params.id, 'Appointment Rescheduled', req.user.id, reason);

    // Trigger reschedule notifications
    try {
      const [patRows] = await pool.execute(`SELECT p.user_id, u.full_name FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?`, [existing.patient_id]);
      const [docRows] = await pool.execute(`SELECT d.user_id, u.full_name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?`, [existing.doctor_id]);
      if (patRows[0] && docRows[0]) {
        const patientUserId = patRows[0].user_id;
        const patientName = patRows[0].full_name;
        const doctorUserId = docRows[0].user_id;
        const doctorName = docRows[0].full_name;
        const formattedDate = appointment_date instanceof Date ? appointment_date.toISOString().split('T')[0] : appointment_date;

        if (req.user.role === 'patient') {
          notificationService.notifyDoctorRescheduleRequest({
            doctorUserId,
            patientName,
            date: formattedDate,
            time: appointment_time,
            appointmentId: req.params.id
          }).catch(err => console.error(err));
        } else {
          notificationService.notifyAppointmentRescheduled({
            patientUserId,
            doctorName,
            date: formattedDate,
            time: appointment_time,
            appointmentId: req.params.id
          }).catch(err => console.error(err));
        }
      }
    } catch (err) {
      console.error('Failed to notify on reschedule:', err.message);
    }

    const updated = await Appointment.findById(req.params.id);
    res.json({ success: true, message: 'Appointment rescheduled.', data: updated });
  } catch (error) { next(error); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, cancel_reason } = req.body;
    
    const existing = await Appointment.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    // Ownership guard for Doctor
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor || existing.doctor_id !== doctor.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to update this appointment.' });
      }
    }

    const cancelled_by = status === 'cancelled' ? req.user.role : null;
    await Appointment.updateStatus(req.params.id, { status, cancelled_by, cancel_reason });

    // Log the status transition
    await Appointment.logStatusChange({
      appointment_id: req.params.id,
      previous_status: existing.status,
      new_status: status,
      changed_by: req.user.role,
      reason: cancel_reason || `Status updated to ${status}`,
    });

    // Log to patient history
    let historyEvent = null;
    if (status === 'confirmed') historyEvent = 'Appointment Confirmed';
    else if (status === 'completed') historyEvent = 'Appointment Completed';
    else if (status === 'cancelled') historyEvent = 'Appointment Cancelled';
    if (historyEvent) {
      await historyGenerator.logAppointmentEvent(req.params.id, historyEvent, req.user.id, cancel_reason);
    }

    // Trigger status update notifications
    try {
      const [patRows] = await pool.execute(`SELECT p.user_id FROM patients p WHERE p.id = ?`, [existing.patient_id]);
      const [docRows] = await pool.execute(`SELECT d.user_id, u.full_name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?`, [existing.doctor_id]);
      if (patRows[0] && docRows[0]) {
        const patientUserId = patRows[0].user_id;
        const doctorUserId = docRows[0].user_id;
        const doctorName = docRows[0].full_name;
        const formattedDate = existing.appointment_date instanceof Date ? existing.appointment_date.toISOString().split('T')[0] : existing.appointment_date;

        if (status === 'confirmed' || status === 'scheduled') {
          notificationService.notifyAppointmentApproved({
            patientUserId,
            doctorName,
            date: formattedDate,
            time: existing.appointment_time,
            appointmentId: req.params.id
          }).catch(err => console.error(err));
        } else if (status === 'completed') {
          notificationService.notifyAppointmentCompleted({
            patientUserId,
            doctorName,
            appointmentId: req.params.id
          }).catch(err => console.error(err));
        } else if (status === 'cancelled') {
          const cancelledByStr = req.user.role === 'patient' ? 'Patient' : (req.user.role === 'doctor' ? 'Doctor' : 'Admin');
          notificationService.notifyAppointmentCancelled({
            userId: patientUserId,
            cancelledBy: cancelledByStr,
            date: formattedDate,
            time: existing.appointment_time,
            appointmentId: req.params.id
          }).catch(err => console.error(err));

          notificationService.notifyAppointmentCancelled({
            userId: doctorUserId,
            cancelledBy: cancelledByStr,
            date: formattedDate,
            time: existing.appointment_time,
            appointmentId: req.params.id
          }).catch(err => console.error(err));
        }
      }
    } catch (err) {
      console.error('Failed to notify status update:', err.message);
    }

    const updated = await Appointment.findById(req.params.id);
    res.json({ success: true, message: `Appointment ${status}.`, data: updated });
  } catch (error) { next(error); }
};

exports.delete = async (req, res, next) => {
  try {
    const existing = await Appointment.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    // Ownership guards
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient || existing.patient_id !== patient.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to cancel this appointment.' });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findByUserId(req.user.id);
      if (!doctor || existing.doctor_id !== doctor.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not have permission to cancel this appointment.' });
      }
    }

    const cancelReason = req.body.reason || req.query.reason || 'Cancelled by user';
    await Appointment.updateStatus(req.params.id, {
      status: 'cancelled',
      cancelled_by: req.user.role,
      cancel_reason: cancelReason,
    });

    // Log the status transition to cancelled
    await Appointment.logStatusChange({
      appointment_id: req.params.id,
      previous_status: existing.status,
      new_status: 'cancelled',
      changed_by: req.user.role,
      reason: cancelReason,
    });

    // Log to patient history
    await historyGenerator.logAppointmentEvent(req.params.id, 'Appointment Cancelled', req.user.id, cancelReason);

    // Send cancel notifications
    try {
      const [patRows] = await pool.execute(`SELECT p.user_id FROM patients p WHERE p.id = ?`, [existing.patient_id]);
      const [docRows] = await pool.execute(`SELECT d.user_id FROM doctors d WHERE d.id = ?`, [existing.doctor_id]);
      if (patRows[0] && docRows[0]) {
        const patientUserId = patRows[0].user_id;
        const doctorUserId = docRows[0].user_id;
        const cancelledByStr = req.user.role === 'patient' ? 'Patient' : (req.user.role === 'doctor' ? 'Doctor' : 'Admin');
        const formattedDate = existing.appointment_date instanceof Date ? existing.appointment_date.toISOString().split('T')[0] : existing.appointment_date;

        notificationService.notifyAppointmentCancelled({
          userId: patientUserId,
          cancelledBy: cancelledByStr,
          date: formattedDate,
          time: existing.appointment_time,
          appointmentId: req.params.id
        }).catch(err => console.error(err));

        notificationService.notifyAppointmentCancelled({
          userId: doctorUserId,
          cancelledBy: cancelledByStr,
          date: formattedDate,
          time: existing.appointment_time,
          appointmentId: req.params.id
        }).catch(err => console.error(err));
      }
    } catch (err) {
      console.error('Failed to send cancellation notification:', err.message);
    }

    res.json({ success: true, message: 'Appointment cancelled.' });
  } catch (error) { next(error); }
};

exports.getUpcoming = async (req, res, next) => {
  try {
    const filters = {};
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      filters.patient_id = patient?.id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findByUserId(req.user.id);
      filters.doctor_id = doctor?.id;
    }
    const appointments = await Appointment.getUpcoming(filters);
    res.json({ success: true, data: appointments });
  } catch (error) { next(error); }
};
