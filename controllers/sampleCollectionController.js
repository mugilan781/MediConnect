// ============================================================
// MediConnect – controllers/sampleCollectionController.js
// Sample collection request management with lifecycle transitions
// ============================================================

const SampleCollection = require('../models/SampleCollection');
const Patient = require('../models/Patient');
const LabBooking = require('../models/LabBooking');
const notificationService = require('../services/notificationService');
const pool = require('../config/db');
const historyGenerator = require('../services/historyGenerator');

const VALID_TRANSITIONS = {
  requested: ['assigned', 'cancelled'],
  assigned: ['scheduled', 'cancelled'],
  scheduled: ['in_transit', 'cancelled'],
  in_transit: ['collected', 'cancelled'],
  collected: ['testing'],
  testing: ['report_ready'],
  report_ready: ['delivered'],
  delivered: [],
  cancelled: [],
};

// Map sample collection request statuses to lab booking statuses
const LAB_BOOKING_STATUS_MAP = {
  scheduled: 'sample_scheduled',
  collected: 'sample_collected',
  testing: 'processing',
};

exports.create = async (req, res, next) => {
  try {
    const patient = await Patient.findByUserId(req.user.id);
    if (!patient) {
      return res.status(400).json({ success: false, message: 'Patient profile not found.' });
    }

    const { lab_booking_id, collection_address, preferred_date, preferred_time_slot, notes } = req.body;

    // 1. Verify lab booking exists and belongs to the patient
    const booking = await LabBooking.findById(lab_booking_id);
    if (!booking) {
      return res.status(400).json({ success: false, message: 'Referenced lab booking record does not exist.' });
    }
    if (booking.patient_id !== patient.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not own this lab booking.' });
    }

    // 2. Booking must be active (pending or confirmed)
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Home collection can only be requested for pending or confirmed bookings.' });
    }

    // 3. Prevent past dates
    let preferredDateStr = preferred_date;
    if (preferredDateStr instanceof Date) {
      preferredDateStr = preferredDateStr.toISOString().split('T')[0];
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (preferredDateStr < todayStr) {
      return res.status(400).json({ success: false, message: 'Preferred collection date cannot be in the past.' });
    }

    // 4. Prevent duplicate active requests for this booking
    const [duplicates] = await pool.execute(
      `SELECT id FROM sample_collection_requests 
       WHERE lab_booking_id = ? AND status != 'cancelled'`,
      [lab_booking_id]
    );
    if (duplicates.length > 0) {
      return res.status(409).json({ success: false, message: 'An active sample collection request already exists for this booking.' });
    }

    // Create request
    const result = await SampleCollection.create({
      lab_booking_id,
      patient_id: patient.id,
      collection_address,
      preferred_date,
      preferred_time_slot,
      notes,
    });

    const requestId = result.insertId;

    // Log status change
    await SampleCollection.logStatusChange({
      sample_collection_request_id: requestId,
      previous_status: null,
      new_status: 'requested',
      changed_by: req.user.role,
      reason: 'Request submitted',
    });

    // Log to patient history
    await historyGenerator.logSampleCollectionEvent(requestId, 'Collection Requested', req.user.id);

    const request = await SampleCollection.findById(requestId);
    res.status(201).json({ success: true, message: 'Sample collection request submitted.', data: request });
  } catch (error) { next(error); }
};

exports.getAll = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      filters.patient_id = patient?.id;
    }
    const result = await SampleCollection.findAll(filters);
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

exports.getById = async (req, res, next) => {
  try {
    const request = await SampleCollection.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    // Patient access check
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient || request.patient_id !== patient.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. Access denied.' });
      }
    }

    res.json({ success: true, data: request });
  } catch (error) { next(error); }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const current = await SampleCollection.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Request not found.' });

    const currentStatus = current.status;
    const nextStatus = status;

    if (currentStatus !== nextStatus) {
      const allowed = VALID_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(nextStatus)) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status from '${currentStatus}' to '${nextStatus}'. Allowed transitions: ${allowed.join(', ') || 'none'}.`,
        });
      }

      await SampleCollection.updateStatus(req.params.id, nextStatus);
      await SampleCollection.logStatusChange({
        sample_collection_request_id: req.params.id,
        previous_status: currentStatus,
        new_status: nextStatus,
        changed_by: req.user.role,
        reason: reason || `Status updated to ${nextStatus}`,
      });

      // Log to patient history
      if (nextStatus === 'collected') {
        await historyGenerator.logSampleCollectionEvent(req.params.id, 'Sample Collected', req.user.id);
      } else if (nextStatus === 'report_ready') {
        await historyGenerator.logSampleCollectionEvent(req.params.id, 'Report Ready', req.user.id);
      } else if (nextStatus === 'delivered') {
        await historyGenerator.logSampleCollectionEvent(req.params.id, 'Delivered', req.user.id);
      }

      // Synchronize with parent lab booking status if mapped
      const mappedLabStatus = LAB_BOOKING_STATUS_MAP[nextStatus];
      if (mappedLabStatus) {
        const booking = await LabBooking.findById(current.lab_booking_id);
        if (booking && booking.status !== mappedLabStatus) {
          await LabBooking.updateStatus(current.lab_booking_id, mappedLabStatus);
          await LabBooking.logStatusChange({
            lab_booking_id: current.lab_booking_id,
            previous_status: booking.status,
            new_status: mappedLabStatus,
            changed_by: 'system',
            reason: `Synced with sample collection status '${nextStatus}'`,
          });
        }
      }

      // Notify patient
      const patientUser = await Patient.findById(current.patient_id);
      if (patientUser) {
        const [bookingRows] = await pool.execute(
          `SELECT lt.test_name FROM lab_bookings lb JOIN lab_tests lt ON lb.lab_test_id = lt.id WHERE lb.id = ?`,
          [current.lab_booking_id]
        );
        const testName = bookingRows[0]?.test_name || 'Lab Test';

        if (nextStatus === 'collected') {
          await notificationService.notifySampleCollected({
            patientUserId: patientUser.user_id,
            testName,
            requestId: req.params.id
          });
        } else if (nextStatus === 'scheduled') {
          const formattedDate = current.collection_date instanceof Date ? current.collection_date.toISOString().split('T')[0] : current.collection_date;
          await notificationService.notifyCollectionScheduled({
            patientUserId: patientUser.user_id,
            testName,
            date: formattedDate,
            timeSlot: current.collection_time,
            requestId: req.params.id
          });
        } else {
          await notificationService.notify({
            userId: patientUser.user_id,
            type: 'lab',
            title: `Collection Request ${nextStatus.toUpperCase()}`,
            message: `Your sample collection status has been updated to ${nextStatus.replace(/_/g, ' ')}.`,
            link: '/sample-collection.html',
            related_module: 'sample_collections',
            related_record_id: req.params.id,
            prefField: 'enable_collection_reminders'
          });
        }
      }
    }

    const updated = await SampleCollection.findById(req.params.id);
    res.json({ success: true, message: `Status updated to ${nextStatus}.`, data: updated });
  } catch (error) { next(error); }
};

exports.assignCollector = async (req, res, next) => {
  try {
    const { collector_name, collector_phone, collection_date, collection_time, notes } = req.body;
    const current = await SampleCollection.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Request not found.' });

    // Transition checks (from current status to assigned)
    if (current.status !== 'assigned') {
      const allowed = VALID_TRANSITIONS[current.status] || [];
      if (!allowed.includes('assigned')) {
        return res.status(400).json({
          success: false,
          message: `Cannot assign collector when status is '${current.status}'.`,
        });
      }
    }

    await SampleCollection.assignCollector(req.params.id, {
      collector_name,
      collector_phone,
      collection_date,
      collection_time,
      notes,
    });

    await SampleCollection.logStatusChange({
      sample_collection_request_id: req.params.id,
      previous_status: current.status,
      new_status: 'assigned',
      changed_by: req.user.role,
      reason: `Assigned to ${collector_name}`,
    });

    // Automatically transition to scheduled on assign
    await SampleCollection.updateStatus(req.params.id, 'scheduled');
    await SampleCollection.logStatusChange({
      sample_collection_request_id: req.params.id,
      previous_status: 'assigned',
      new_status: 'scheduled',
      changed_by: req.user.role,
      reason: `Scheduled collection for ${collection_date} at ${collection_time}`,
    });

    // Log to patient history
    await historyGenerator.logSampleCollectionEvent(req.params.id, 'Collection Assigned', req.user.id);

    // Synchronize parent booking status: assigned/scheduled maps to sample_scheduled
    const booking = await LabBooking.findById(current.lab_booking_id);
    if (booking && booking.status !== 'sample_scheduled') {
      // Transition lab booking to confirmed first if it is still pending
      if (booking.status === 'pending') {
        await LabBooking.updateStatus(current.lab_booking_id, 'confirmed');
        await LabBooking.logStatusChange({
          lab_booking_id: current.lab_booking_id,
          previous_status: 'pending',
          new_status: 'confirmed',
          changed_by: 'system',
          reason: 'Booking confirmed on sample collection assignment',
        });
      }
      await LabBooking.updateStatus(current.lab_booking_id, 'sample_scheduled');
      await LabBooking.logStatusChange({
        lab_booking_id: current.lab_booking_id,
        previous_status: booking.status === 'pending' ? 'confirmed' : booking.status,
        new_status: 'sample_scheduled',
        changed_by: 'system',
        reason: 'Sample scheduled on collector assignment',
      });
    }

    const updated = await SampleCollection.findById(req.params.id);

    // Notify patient
    const patientUser = await Patient.findById(updated.patient_id);
    if (patientUser) {
      const [bookingRows] = await pool.execute(
        `SELECT lt.test_name FROM lab_bookings lb JOIN lab_tests lt ON lb.lab_test_id = lt.id WHERE lb.id = ?`,
        [updated.lab_booking_id]
      );
      const testName = bookingRows[0]?.test_name || 'Lab Test';
      const formattedDate = collection_date instanceof Date ? collection_date.toISOString().split('T')[0] : collection_date;

      await notificationService.notifyCollectorAssigned({
        patientUserId: patientUser.user_id,
        collectorName: collector_name,
        date: formattedDate,
        requestId: updated.id
      });

      await notificationService.notifyCollectionScheduled({
        patientUserId: patientUser.user_id,
        testName,
        date: formattedDate,
        timeSlot: collection_time,
        requestId: updated.id
      });
    }

    res.json({ success: true, message: 'Collector assigned and collection scheduled.', data: updated });
  } catch (error) { next(error); }
};

exports.cancel = async (req, res, next) => {
  try {
    const current = await SampleCollection.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Request not found.' });

    // Cancel checks
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient || current.patient_id !== patient.id) {
        return res.status(403).json({ success: false, message: 'Forbidden. You do not own this collection request.' });
      }
      // Patients can only cancel in 'requested' status (before assignment)
      if (current.status !== 'requested') {
        return res.status(400).json({ success: false, message: 'Cannot cancel collection request once collector is assigned.' });
      }
    }

    if (current.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Request is already cancelled.' });
    }

    const previousStatus = current.status;

    await SampleCollection.updateStatus(req.params.id, 'cancelled');
    await SampleCollection.logStatusChange({
      sample_collection_request_id: req.params.id,
      previous_status: previousStatus,
      new_status: 'cancelled',
      changed_by: req.user.role,
      reason: req.body.reason || 'Cancelled by user',
    });

    const updated = await SampleCollection.findById(req.params.id);

    // Notify patient if cancelled by doctor or admin
    if (req.user.role !== 'patient') {
      const patientUser = await Patient.findById(updated.patient_id);
      if (patientUser) {
        const [bookingRows] = await pool.execute(
          `SELECT lt.test_name FROM lab_bookings lb JOIN lab_tests lt ON lb.lab_test_id = lt.id WHERE lb.id = ?`,
          [updated.lab_booking_id]
        );
        const testName = bookingRows[0]?.test_name || 'Lab Test';
        await notificationService.notify({
          userId: patientUser.user_id,
          type: 'lab',
          title: 'Collection Request Cancelled',
          message: `Your home collection request for "${testName}" has been cancelled.`,
          link: '/sample-collection.html',
          related_module: 'sample_collections',
          related_record_id: req.params.id,
          prefField: 'enable_collection_reminders'
        });
      }
    }
    res.json({ success: true, message: 'Sample collection request cancelled successfully.', data: updated });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const current = await SampleCollection.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Request not found.' });

    // Authorization checks
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      if (!patient || current.patient_id !== patient.id) {
        return res.status(403).json({ success: false, message: 'Forbidden.' });
      }
      // Patients can only update requests if still pending
      if (current.status !== 'requested') {
        return res.status(400).json({ success: false, message: 'Cannot update request details once collector is assigned.' });
      }
    }

    await SampleCollection.update(req.params.id, req.body);
    const updated = await SampleCollection.findById(req.params.id);
    res.json({ success: true, message: 'Sample collection request updated successfully.', data: updated });
  } catch (error) { next(error); }
};


