// ============================================================
// MediConnect – controllers/labBookingController.js
// Patient lab booking flow with status lifecycle controls
// ============================================================

const LabBooking = require('../models/LabBooking');
const LabTest = require('../models/LabTest');
const Patient = require('../models/Patient');
const notificationService = require('../services/notificationService');
const pool = require('../config/db');
const historyGenerator = require('../services/historyGenerator');

const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['sample_scheduled', 'cancelled'],
  sample_scheduled: ['sample_collected', 'cancelled'],
  sample_collected: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: [], // terminal
  cancelled: [], // terminal
};

/**
 * Create a new lab booking
 */
exports.create = async (req, res, next) => {
  try {
    let patient_id;

    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient) return res.status(400).json({ success: false, message: 'Patient profile not found.' });
      patient_id = patient.id;
    } else if (req.user.role === 'doctor') {
      if (!req.body.patient_id) {
        return res.status(400).json({ success: false, message: 'patient_id is required when a doctor creates a booking.' });
      }
      patient_id = req.body.patient_id;
    } else if (req.user.role === 'admin') {
      if (!req.body.patient_id) {
        return res.status(400).json({ success: false, message: 'patient_id is required when an admin creates a booking.' });
      }
      patient_id = req.body.patient_id;
    }

    // 1. Verify test selection and availability
    const test = await LabTest.findById(req.body.lab_test_id);
    if (!test) {
      return res.status(400).json({ success: false, message: 'Selected lab test does not exist.' });
    }
    if (!test.is_active) {
      return res.status(400).json({ success: false, message: 'This lab test is currently unavailable.' });
    }

    // 2. Prevent past dates
    let bookingDateStr = req.body.booking_date;
    if (bookingDateStr instanceof Date) {
      bookingDateStr = bookingDateStr.toISOString().split('T')[0];
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (bookingDateStr < todayStr) {
      return res.status(400).json({ success: false, message: 'Booking date cannot be in the past.' });
    }

    // 3. Prevent duplicate active bookings for same test and date
    const [duplicates] = await pool.execute(
      `SELECT id FROM lab_bookings 
       WHERE patient_id = ? AND lab_test_id = ? AND booking_date = ? 
         AND status NOT IN ('completed', 'cancelled')`,
      [patient_id, req.body.lab_test_id, req.body.booking_date]
    );
    if (duplicates.length > 0) {
      return res.status(409).json({ success: false, message: 'You already have an active booking for this test on this date.' });
    }

    // Create booking
    const result = await LabBooking.create({ ...req.body, patient_id });
    const bookingId = result.insertId;

    // Log initial status
    await LabBooking.logStatusChange({
      lab_booking_id: bookingId,
      previous_status: null,
      new_status: 'pending',
      changed_by: req.user.role,
      reason: 'Booking requested by user',
    });

    // Log to patient history
    await historyGenerator.logLabBookingEvent(bookingId, 'Test Booked', req.user.id);

    const booking = await LabBooking.findById(bookingId);

    // Notify Patient
    const patientUser = await Patient.findById(patient_id);
    if (patientUser) {
      const formattedDate = booking.booking_date instanceof Date ? booking.booking_date.toISOString().split('T')[0] : booking.booking_date;
      await notificationService.notifyLabBookingConfirmed({
        patientUserId: patientUser.user_id,
        testName: booking.test_name,
        date: formattedDate,
        bookingId: bookingId
      });
    }

    res.status(201).json({ success: true, message: 'Lab test booked successfully.', data: booking });
  } catch (error) { next(error); }
};

/**
 * Get all lab bookings (patient-scoped or all for admin/doctor)
 */
exports.getAll = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      filters.patient_id = patient?.id;
    }
    const result = await LabBooking.findAll(filters);
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

/**
 * Get booking by ID
 */
exports.getById = async (req, res, next) => {
  try {
    const booking = await LabBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Lab booking not found.' });

    // Scope check for patients
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient || booking.patient_id !== patient.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not have access to this booking.' });
      }
    }

    res.json({ success: true, data: booking });
  } catch (error) { next(error); }
};

/**
 * Update general booking details (admin / doctor)
 */
exports.update = async (req, res, next) => {
  try {
    const booking = await LabBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Lab booking not found.' });

    await LabBooking.update(req.params.id, req.body);
    const updated = await LabBooking.findById(req.params.id);
    res.json({ success: true, message: 'Lab booking updated successfully.', data: updated });
  } catch (error) { next(error); }
};

/**
 * Update booking status with lifecycle guard validation
 */
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const booking = await LabBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Lab booking not found.' });

    const currentStatus = booking.status;
    const nextStatus = status;

    if (currentStatus !== nextStatus) {
      const allowed = VALID_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(nextStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from '${currentStatus}' to '${nextStatus}'.`
        });
      }

      await LabBooking.updateStatus(req.params.id, nextStatus);
      await LabBooking.logStatusChange({
        lab_booking_id: req.params.id,
        previous_status: booking.status,
        new_status: nextStatus,
        changed_by: req.user.role,
        reason: reason || `Status updated to ${nextStatus}`,
      });

      // Log to patient history
      if (nextStatus === 'processing') {
        await historyGenerator.logLabBookingEvent(req.params.id, 'Test Processing', req.user.id);
      } else if (nextStatus === 'completed') {
        await historyGenerator.logLabBookingEvent(req.params.id, 'Test Completed', req.user.id);
      }

      // Notify patient
      const patientUser = await Patient.findById(booking.patient_id);
      if (patientUser) {
        if (nextStatus === 'confirmed') {
          const formattedDate = booking.booking_date instanceof Date ? booking.booking_date.toISOString().split('T')[0] : booking.booking_date;
          await notificationService.notifyLabBookingConfirmed({
            patientUserId: patientUser.user_id,
            testName: booking.test_name,
            date: formattedDate,
            bookingId: req.params.id
          });
        } else {
          await notificationService.notifyLabBookingStatus({
            patientUserId: patientUser.user_id,
            testName: booking.test_name,
            status: nextStatus,
            bookingId: req.params.id
          });
        }
      }
    }

    const updated = await LabBooking.findById(req.params.id);
    res.json({ success: true, message: `Booking status updated to ${nextStatus}.`, data: updated });
  } catch (error) { next(error); }
};

/**
 * Cancel lab booking (patient or admin/doctor)
 */
exports.cancel = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const booking = await LabBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Lab booking not found.' });

    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Booking is already ${booking.status}.` });
    }

    // Role restriction check for patients
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient || booking.patient_id !== patient.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not own this booking.' });
      }
      // Patients can only cancel in pending or confirmed state
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel booking. Sample processing has already begun.'
        });
      }
    }

    const previousStatus = booking.status;

    await LabBooking.updateStatus(req.params.id, 'cancelled');
    await LabBooking.logStatusChange({
      lab_booking_id: req.params.id,
      previous_status: previousStatus,
      new_status: 'cancelled',
      changed_by: req.user.role,
      reason: reason || 'Cancelled by user',
    });

    // Notify patient if cancelled by doctor or admin
    if (req.user.role !== 'patient') {
      const patientUser = await Patient.findById(booking.patient_id);
      if (patientUser) {
        await notificationService.notifyLabBookingStatus({
          patientUserId: patientUser.user_id,
          testName: booking.test_name,
          status: 'cancelled',
          bookingId: req.params.id
        });
      }
    }

    const updated = await LabBooking.findById(req.params.id);
    res.json({ success: true, message: 'Booking cancelled successfully.', data: updated });
  } catch (error) { next(error); }
};

/**
 * Upload result report
 */
exports.updateResult = async (req, res, next) => {
  try {
    const result_file_url = req.file ? `/uploads/reports/${req.file.filename}` : req.body.result_file_url;
    
    const booking = await LabBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Lab booking not found.' });

    // Transition to completed status
    await LabBooking.updateResult(req.params.id, { result_file_url, result_summary: req.body.result_summary });
    await LabBooking.logStatusChange({
      lab_booking_id: req.params.id,
      previous_status: booking.status,
      new_status: 'completed',
      changed_by: req.user.role,
      reason: 'Lab report uploaded and completed',
    });

    // Log to patient history
    await historyGenerator.logLabBookingEvent(req.params.id, 'Test Completed', req.user.id);

    const updatedBooking = await LabBooking.findById(req.params.id);

    // Notify patient
    const patientUser = await Patient.findById(booking.patient_id);
    if (patientUser) {
      await notificationService.notifyLabResult({
        patientUserId: patientUser.user_id,
        testName: booking.test_name,
        bookingId: req.params.id
      });
    }

    res.json({ success: true, message: 'Lab report uploaded successfully.', data: updatedBooking });
  } catch (error) { next(error); }
};
