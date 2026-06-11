// ============================================================
// MediConnect – services/historyGenerator.js
// Automated Patient History logging pipeline
// ============================================================

const pool = require('../config/db');
const PatientHistory = require('../models/PatientHistory');

// Core function to log history event with duplicate prevention (last 5s)
async function logEvent({ patient_id, event_type, source_module, source_record_id, title, description, event_date, recorded_by, metadata }) {
  try {
    if (!patient_id) return;
    
    // Prevent duplicates within the last 5 seconds for same source/event
    const [existing] = await pool.execute(
      `SELECT id FROM patient_history 
       WHERE patient_id = ? AND event_type = ? AND source_module = ? AND source_record_id = ?
         AND created_at >= NOW() - INTERVAL 5 SECOND`,
      [patient_id, event_type, source_module, source_record_id]
    );
    if (existing.length > 0) {
      console.log(`Duplicate history event skipped: ${event_type} for ${source_module} ID ${source_record_id}`);
      return;
    }

    await PatientHistory.create({
      patient_id,
      event_type,
      source_module,
      source_record_id,
      title,
      description,
      event_date: event_date || new Date(),
      recorded_by,
      metadata,
    });
  } catch (err) {
    console.error(`Error logging history event '${event_type}':`, err);
  }
}

const historyGenerator = {
  async logAppointmentEvent(appointmentId, eventType, userId, reason = '') {
    try {
      const [rows] = await pool.execute(
        `SELECT a.*, du.full_name AS doctor_name
         FROM appointments a
         LEFT JOIN doctors d ON a.doctor_id = d.id
         LEFT JOIN users du ON d.user_id = du.id
         WHERE a.id = ?`,
        [appointmentId]
      );
      const appt = rows[0];
      if (!appt) return;

      const title = `Appointment ${eventType.split(' ').slice(1).join(' ')} with Dr. ${appt.doctor_name || 'Doctor'}`;
      const desc = `Scheduled for ${appt.appointment_date.toISOString().split('T')[0]} at ${appt.appointment_time}. Status: ${appt.status}.${reason ? ` Reason: ${reason}` : ''}`;
      
      await logEvent({
        patient_id: appt.patient_id,
        event_type: eventType,
        source_module: 'appointments',
        source_record_id: appointmentId,
        title,
        description: desc,
        event_date: new Date(),
        recorded_by: userId,
        metadata: {
          doctor_name: appt.doctor_name,
          appointment_date: appt.appointment_date,
          appointment_time: appt.appointment_time,
          type: appt.type,
          status: appt.status,
          reason: appt.reason,
          notes: appt.notes
        }
      });
    } catch (err) {
      console.error('Error logging appointment history:', err);
    }
  },

  async logConsultationEvent(consultationId, eventType, userId, reason = '') {
    try {
      const [rows] = await pool.execute(
        `SELECT c.*, du.full_name AS doctor_name
         FROM consultations c
         LEFT JOIN doctors d ON c.doctor_id = d.id
         LEFT JOIN users du ON d.user_id = du.id
         WHERE c.id = ?`,
        [consultationId]
      );
      const consult = rows[0];
      if (!consult) return;

      const title = `${eventType} with Dr. ${consult.doctor_name || 'Doctor'}`;
      let desc = `Consultation record status is ${consult.status}.`;
      if (consult.diagnosis) desc += ` Diagnosis: ${consult.diagnosis}.`;
      if (reason) desc += ` Details: ${reason}.`;

      await logEvent({
        patient_id: consult.patient_id,
        event_type: eventType,
        source_module: 'consultations',
        source_record_id: consultationId,
        title,
        description: desc,
        event_date: new Date(),
        recorded_by: userId,
        metadata: {
          doctor_name: consult.doctor_name,
          preferred_date: consult.preferred_date,
          consultation_date: consult.consultation_date,
          consultation_time: consult.consultation_time,
          diagnosis: consult.diagnosis,
          prescription: consult.prescription,
          follow_up_date: consult.follow_up_date
        }
      });
    } catch (err) {
      console.error('Error logging consultation history:', err);
    }
  },

  async logLabBookingEvent(bookingId, eventType, userId) {
    try {
      const [rows] = await pool.execute(
        `SELECT lb.*, lt.test_name, lt.test_code, lt.category, du.full_name AS doctor_name
         FROM lab_bookings lb
         JOIN lab_tests lt ON lb.lab_test_id = lt.id
         LEFT JOIN doctors d ON lb.doctor_id = d.id
         LEFT JOIN users du ON d.user_id = du.id
         WHERE lb.id = ?`,
        [bookingId]
      );
      const booking = rows[0];
      if (!booking) return;

      const title = `Lab Test: ${booking.test_name}`;
      const desc = `Event: ${eventType}. Scheduled: ${booking.booking_date.toISOString().split('T')[0]}. Status: ${booking.status}.`;

      await logEvent({
        patient_id: booking.patient_id,
        event_type: eventType,
        source_module: 'lab_bookings',
        source_record_id: bookingId,
        title,
        description: desc,
        event_date: new Date(),
        recorded_by: userId,
        metadata: {
          test_name: booking.test_name,
          test_code: booking.test_code,
          category: booking.category,
          booking_date: booking.booking_date,
          preferred_time: booking.preferred_time,
          status: booking.status,
          doctor_name: booking.doctor_name
        }
      });
    } catch (err) {
      console.error('Error logging lab booking history:', err);
    }
  },

  async logSampleCollectionEvent(requestId, eventType, userId) {
    try {
      const [rows] = await pool.execute(
        `SELECT scr.*, lt.test_name
         FROM sample_collection_requests scr
         JOIN lab_bookings lb ON scr.lab_booking_id = lb.id
         JOIN lab_tests lt ON lb.lab_test_id = lt.id
         WHERE scr.id = ?`,
        [requestId]
      );
      const req = rows[0];
      if (!req) return;

      const title = `Home Sample Collection (${eventType})`;
      const desc = `For ${req.test_name}. Status: ${req.status}. Collector: ${req.collector_name || 'Not assigned'}. Address: ${req.collection_address}.`;

      await logEvent({
        patient_id: req.patient_id,
        event_type: eventType,
        source_module: 'sample_collections',
        source_record_id: requestId,
        title,
        description: desc,
        event_date: new Date(),
        recorded_by: userId,
        metadata: {
          test_name: req.test_name,
          collection_address: req.collection_address,
          preferred_date: req.preferred_date,
          preferred_time_slot: req.preferred_time_slot,
          status: req.status,
          collector_name: req.collector_name,
          collector_phone: req.collector_phone,
          collected_at: req.collected_at
        }
      });
    } catch (err) {
      console.error('Error logging sample collection history:', err);
    }
  },

  async logReportEvent(reportId, eventType, userId) {
    try {
      const [rows] = await pool.execute(
        `SELECT mr.*, du.full_name AS doctor_name
         FROM medical_reports mr
         LEFT JOIN doctors d ON mr.doctor_id = d.id
         LEFT JOIN users du ON d.user_id = du.id
         WHERE mr.id = ?`,
        [reportId]
      );
      const rep = rows[0];
      if (!rep) return;

      const title = `${eventType}: ${rep.title}`;
      const desc = `Category: ${rep.category || 'General'}. Type: ${rep.report_type}. File: ${rep.original_filename || 'medical-report'}.`;

      await logEvent({
        patient_id: rep.patient_id,
        event_type: eventType,
        source_module: 'reports',
        source_record_id: reportId,
        title,
        description: desc,
        event_date: new Date(),
        recorded_by: userId,
        metadata: {
          title: rep.title,
          category: rep.category,
          report_type: rep.report_type,
          original_filename: rep.original_filename,
          doctor_name: rep.doctor_name
        }
      });
    } catch (err) {
      console.error('Error logging report history:', err);
    }
  }
};

module.exports = historyGenerator;
