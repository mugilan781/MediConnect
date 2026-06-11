// ============================================================
// MediConnect – services/notificationService.js
// Centralized Event-Driven Notification Engine
// ============================================================

const pool = require('../config/db');
const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');

/**
 * Helper to check user preferences before notifying
 */
async function shouldNotify(userId, prefField) {
  if (!prefField) return true;
  try {
    const prefs = await NotificationPreference.findByUserId(userId);
    return prefs[prefField] === 1 || prefs[prefField] === true;
  } catch (err) {
    return true; // Default to true if fetch fails
  }
}

/**
 * Create and send an in-app notification.
 */
async function notify({ userId, type, title, message, link, related_module = null, related_record_id = null, prefField = null }) {
  try {
    if (!userId) return;
    const allowed = await shouldNotify(userId, prefField);
    if (!allowed) return; // Skip if muted by user preferences

    await Notification.create({
      user_id: userId,
      type,
      title,
      message,
      link,
      related_module,
      related_record_id
    });
  } catch (error) {
    console.error('❌ Notification failed:', error.message);
  }
}

// ============================================================
// 1. APPOINTMENT NOTIFICATIONS
// ============================================================

// Patient Booking Confirmation
async function notifyAppointmentBookingConfirmation({ patientUserId, doctorName, date, time, appointmentId }) {
  await notify({
    userId: patientUserId,
    type: 'appointment',
    title: 'Appointment Booking Confirmed',
    message: `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been booked.`,
    link: '/appointments.html',
    related_module: 'appointments',
    related_record_id: appointmentId,
    prefField: 'enable_appointment_reminders'
  });
}

// Doctor: New Appointment Request
async function notifyAppointmentBooked({ doctorUserId, patientName, date, time, appointmentId }) {
  await notify({
    userId: doctorUserId,
    type: 'appointment',
    title: 'New Appointment Request',
    message: `${patientName} has booked an appointment on ${date} at ${time}.`,
    link: '/appointments.html',
    related_module: 'appointments',
    related_record_id: appointmentId,
    prefField: 'enable_appointment_reminders'
  });
}

// Patient: Appointment Approved
async function notifyAppointmentApproved({ patientUserId, doctorName, date, time, appointmentId }) {
  await notify({
    userId: patientUserId,
    type: 'appointment',
    title: 'Appointment Confirmed',
    message: `Your appointment with Dr. ${doctorName} on ${date} at ${time} has been approved and confirmed.`,
    link: '/appointments.html',
    related_module: 'appointments',
    related_record_id: appointmentId,
    prefField: 'enable_appointment_reminders'
  });
}

// Patient: Appointment Rescheduled
async function notifyAppointmentRescheduled({ patientUserId, doctorName, date, time, appointmentId }) {
  await notify({
    userId: patientUserId,
    type: 'appointment',
    title: 'Appointment Rescheduled',
    message: `Your appointment with Dr. ${doctorName} has been rescheduled to ${date} at ${time}.`,
    link: '/appointments.html',
    related_module: 'appointments',
    related_record_id: appointmentId,
    prefField: 'enable_appointment_reminders'
  });
}

// Doctor: Appointment Rescheduled Request
async function notifyDoctorRescheduleRequest({ doctorUserId, patientName, date, time, appointmentId }) {
  await notify({
    userId: doctorUserId,
    type: 'appointment',
    title: 'Reschedule Request Received',
    message: `${patientName} has requested to reschedule appointment to ${date} at ${time}.`,
    link: '/appointments.html',
    related_module: 'appointments',
    related_record_id: appointmentId,
    prefField: 'enable_appointment_reminders'
  });
}

// Participant: Appointment Cancelled
async function notifyAppointmentCancelled({ userId, cancelledBy, date, time, appointmentId }) {
  await notify({
    userId,
    type: 'appointment',
    title: 'Appointment Cancelled',
    message: `Your appointment on ${date} at ${time} has been cancelled by ${cancelledBy}.`,
    link: '/appointments.html',
    related_module: 'appointments',
    related_record_id: appointmentId,
    prefField: 'enable_appointment_reminders'
  });
}

// Patient: Appointment Completed
async function notifyAppointmentCompleted({ patientUserId, doctorName, appointmentId }) {
  await notify({
    userId: patientUserId,
    type: 'appointment',
    title: 'Appointment Completed',
    message: `Your appointment with Dr. ${doctorName} is complete. Your summary and history log are updated.`,
    link: '/appointments.html',
    related_module: 'appointments',
    related_record_id: appointmentId,
    prefField: 'enable_appointment_reminders'
  });
}


// ============================================================
// 2. CONSULTATION NOTIFICATIONS
// ============================================================

// Doctor: New Consultation Request
async function notifyConsultationRequested({ doctorUserId, patientName, date, consultationId }) {
  await notify({
    userId: doctorUserId,
    type: 'appointment',
    title: 'New Consultation Request',
    message: `${patientName} has requested a digital consultation for preferred date ${date}.`,
    link: '/consultations.html',
    related_module: 'consultations',
    related_record_id: consultationId,
    prefField: 'enable_consultation_reminders'
  });
}

// Patient: Request Accepted
async function notifyConsultationAccepted({ patientUserId, doctorName, consultationId }) {
  await notify({
    userId: patientUserId,
    type: 'appointment',
    title: 'Consultation Request Accepted',
    message: `Dr. ${doctorName} has accepted your consultation request. Scheduling details will follow.`,
    link: '/consultations.html',
    related_module: 'consultations',
    related_record_id: consultationId,
    prefField: 'enable_consultation_reminders'
  });
}

// Patient: Request Rejected
async function notifyConsultationRejected({ patientUserId, doctorName, reason, consultationId }) {
  await notify({
    userId: patientUserId,
    type: 'appointment',
    title: 'Consultation Request Declined',
    message: `Dr. ${doctorName} has declined your consultation request.${reason ? ' Reason: ' + reason : ''}`,
    link: '/consultations.html',
    related_module: 'consultations',
    related_record_id: consultationId,
    prefField: 'enable_consultation_reminders'
  });
}

// Patient: Consultation Scheduled
async function notifyConsultationScheduled({ patientUserId, doctorName, date, time, consultationId }) {
  await notify({
    userId: patientUserId,
    type: 'appointment',
    title: 'Consultation Scheduled',
    message: `Your consultation with Dr. ${doctorName} has been scheduled for ${date} at ${time}.`,
    link: '/consultations.html',
    related_module: 'consultations',
    related_record_id: consultationId,
    prefField: 'enable_consultation_reminders'
  });
}

// Patient: Consultation Completed
async function notifyConsultationCompleted({ patientUserId, doctorName, consultationId }) {
  await notify({
    userId: patientUserId,
    type: 'report',
    title: 'Consultation Completed',
    message: `Your consultation with Dr. ${doctorName} is complete. Your diagnosis and prescriptions are ready.`,
    link: '/consultations.html',
    related_module: 'consultations',
    related_record_id: consultationId,
    prefField: 'enable_consultation_reminders'
  });
}

// Participant: Consultation Cancelled
async function notifyConsultationCancelled({ userId, cancelledBy, consultationId }) {
  await notify({
    userId,
    type: 'appointment',
    title: 'Consultation Cancelled',
    message: `The consultation has been cancelled by ${cancelledBy}.`,
    link: '/consultations.html',
    related_module: 'consultations',
    related_record_id: consultationId,
    prefField: 'enable_consultation_reminders'
  });
}


// ============================================================
// 3. LAB TEST NOTIFICATIONS
// ============================================================

// Patient: Lab Booking Confirmed
async function notifyLabBookingConfirmed({ patientUserId, testName, date, bookingId }) {
  await notify({
    userId: patientUserId,
    type: 'lab',
    title: 'Lab Booking Confirmed',
    message: `Your lab booking for "${testName}" on ${date} is confirmed.`,
    link: '/lab-tests.html',
    related_module: 'lab_bookings',
    related_record_id: bookingId,
    prefField: 'enable_lab_reminders'
  });
}

// Patient: Lab Booking status update
async function notifyLabBookingStatus({ patientUserId, testName, status, bookingId }) {
  await notify({
    userId: patientUserId,
    type: 'lab',
    title: 'Lab Test Status Updated',
    message: `Your lab test for "${testName}" is now in status: ${status}.`,
    link: '/lab-tests.html',
    related_module: 'lab_bookings',
    related_record_id: bookingId,
    prefField: 'enable_lab_reminders'
  });
}

// Patient: Lab Results Available
async function notifyLabResult({ patientUserId, testName, bookingId }) {
  await notify({
    userId: patientUserId,
    type: 'report',
    title: 'Lab Results Available',
    message: `Your ${testName} results are now available. View them in your reports.`,
    link: '/reports.html',
    related_module: 'lab_bookings',
    related_record_id: bookingId,
    prefField: 'enable_lab_reminders'
  });
}


// ============================================================
// 4. SAMPLE COLLECTION NOTIFICATIONS
// ============================================================

// Patient: Collector Assigned
async function notifyCollectorAssigned({ patientUserId, collectorName, date, requestId }) {
  await notify({
    userId: patientUserId,
    type: 'lab',
    title: 'Sample Collector Assigned',
    message: `${collectorName} will collect your sample on ${date}.`,
    link: '/sample-collection.html',
    related_module: 'sample_collections',
    related_record_id: requestId,
    prefField: 'enable_collection_reminders'
  });
}

// Patient: Collection Scheduled
async function notifyCollectionScheduled({ patientUserId, testName, date, timeSlot, requestId }) {
  await notify({
    userId: patientUserId,
    type: 'lab',
    title: 'Sample Collection Scheduled',
    message: `Your home sample collection for "${testName}" has been scheduled for ${date} during ${timeSlot || 'preferred slot'}.`,
    link: '/sample-collection.html',
    related_module: 'sample_collections',
    related_record_id: requestId,
    prefField: 'enable_collection_reminders'
  });
}

// Patient: Sample Collected
async function notifySampleCollected({ patientUserId, testName, requestId }) {
  await notify({
    userId: patientUserId,
    type: 'lab',
    title: 'Sample Collected',
    message: `Your sample for "${testName}" has been successfully collected and sent to laboratory.`,
    link: '/sample-collection.html',
    related_module: 'sample_collections',
    related_record_id: requestId,
    prefField: 'enable_collection_reminders'
  });
}


// ============================================================
// 5. MEDICAL REPORT NOTIFICATIONS
// ============================================================

// Patient: New Report Available
async function notifyReportUploaded({ patientUserId, title, reportId }) {
  await notify({
    userId: patientUserId,
    type: 'report',
    title: 'New Report Available',
    message: `A new medical report "${title}" has been uploaded to your profile.`,
    link: '/reports.html',
    related_module: 'reports',
    related_record_id: reportId,
    prefField: 'enable_report_notifications'
  });
}

// Participant: Report Updated
async function notifyReportUpdated({ userId, title, role, reportId }) {
  await notify({
    userId,
    type: 'report',
    title: 'Report Updated',
    message: `The medical report "${title}" has been updated by the ${role}.`,
    link: '/reports.html',
    related_module: 'reports',
    related_record_id: reportId,
    prefField: 'enable_report_notifications'
  });
}

// Doctor: Report Downloaded
async function notifyDoctorReportDownloaded({ doctorUserId, patientName, title, reportId }) {
  await notify({
    userId: doctorUserId,
    type: 'report',
    title: 'Report Downloaded',
    message: `Patient ${patientName} has downloaded the report "${title}".`,
    link: '/reports.html',
    related_module: 'reports',
    related_record_id: reportId,
    prefField: 'enable_report_notifications'
  });
}

// Doctor: Lab Result Review Required
async function notifyDoctorReviewRequired({ doctorUserId, patientName, testName, bookingId }) {
  await notify({
    userId: doctorUserId,
    type: 'report',
    title: 'Lab Results Review Required',
    message: `${patientName} completed the lab test "${testName}". Review is required.`,
    link: '/reports.html',
    related_module: 'lab_bookings',
    related_record_id: bookingId,
    prefField: 'enable_report_notifications'
  });
}


// ============================================================
// 6. ADMIN SYSTEM NOTIFICATIONS
// ============================================================

// Admin: New Doctor / Patient Registration
async function notifyAdminRegistration({ role, fullName }) {
  try {
    const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await notify({
        userId: admin.id,
        type: 'system',
        title: `New ${role.charAt(0).toUpperCase() + role.slice(1)} Registered`,
        message: `${fullName} has successfully registered a new account as a ${role}.`,
        link: role === 'doctor' ? '/admin-dashboard.html?tab=doctors' : '/admin-dashboard.html?tab=patients',
        prefField: 'enable_system_notifications'
      });
    }
  } catch (err) {
    console.error('Failed to notify admins of registration:', err.message);
  }
}

// Admin: High Volume Activity Alert
async function notifyHighVolumeActivity() {
  try {
    const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await notify({
        userId: admin.id,
        type: 'system',
        title: 'High Volume Activity Alert',
        message: 'System alert: The platform is experiencing high volume appointment booking activity.',
        link: '/admin-dashboard.html?tab=appointments',
        prefField: 'enable_system_notifications'
      });
    }
  } catch (err) {
    console.error('Failed to notify admins of high volume activity:', err.message);
  }
}

// Admin: Collection Issues
async function notifyAdminCollectionIssue({ requestId, message }) {
  try {
    const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await notify({
        userId: admin.id,
        type: 'system',
        title: 'Collection Issue Alert',
        message: `Sample pickup alert: ${message}`,
        link: '/admin-dashboard.html?tab=samples',
        related_module: 'sample_collections',
        related_record_id: requestId,
        prefField: 'enable_system_notifications'
      });
    }
  } catch (err) {
    console.error('Failed to notify admins of collection issue:', err.message);
  }
}

// Admin: Report Issues
async function notifyAdminReportIssue({ reportId, message }) {
  try {
    const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await notify({
        userId: admin.id,
        type: 'system',
        title: 'Report Upload Issue Alert',
        message: `Report upload alert: ${message}`,
        link: '/admin-dashboard.html?tab=reports',
        related_module: 'reports',
        related_record_id: reportId,
        prefField: 'enable_system_notifications'
      });
    }
  } catch (err) {
    console.error('Failed to notify admins of report issue:', err.message);
  }
}

// Admin: System Events (General configuration changes/broadcast log entries)
async function notifySystemEvent({ title, message }) {
  try {
    const [admins] = await pool.execute("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await notify({
        userId: admin.id,
        type: 'system',
        title,
        message,
        link: '/admin-dashboard.html?tab=settings',
        prefField: 'enable_system_notifications'
      });
    }
  } catch (err) {
    console.error('Failed to notify admins of system event:', err.message);
  }
}

module.exports = {
  notify,
  notifyAppointmentBookingConfirmation,
  notifyAppointmentBooked,
  notifyAppointmentApproved,
  notifyAppointmentRescheduled,
  notifyDoctorRescheduleRequest,
  notifyAppointmentCancelled,
  notifyAppointmentCompleted,
  notifyConsultationRequested,
  notifyConsultationAccepted,
  notifyConsultationRejected,
  notifyConsultationScheduled,
  notifyConsultationCompleted,
  notifyConsultationCancelled,
  notifyLabBookingConfirmed,
  notifyLabBookingStatus,
  notifyLabResult,
  notifyCollectorAssigned,
  notifyCollectionScheduled,
  notifySampleCollected,
  notifyReportUploaded,
  notifyReportUpdated,
  notifyDoctorReportDownloaded,
  notifyDoctorReviewRequired,
  notifyAdminRegistration,
  notifyHighVolumeActivity,
  notifyAdminCollectionIssue,
  notifyAdminReportIssue,
  notifySystemEvent
};
