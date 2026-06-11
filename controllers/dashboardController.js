// ============================================================
// MediConnect – controllers/dashboardController.js
// Role-specific dashboard data aggregation with online consultations
// ============================================================

const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const PatientHistory = require('../models/PatientHistory');
const pool = require('../config/db');

exports.getPatientDashboard = async (req, res, next) => {
  try {
    const patient = await Patient.findByUserId(req.user.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found.' });

    const summary = await Patient.getSummary(patient.id);
    const upcoming = await Appointment.getUpcoming({ patient_id: patient.id, limit: 5 });
    const unreadNotifs = await Notification.getUnreadCount(req.user.id);
    const recentReports = await Patient.getRecentReports(patient.id, 3);
    const recentLabBookings = await Patient.getRecentLabBookings(patient.id, 3);
    const notifResult = await Notification.findByUserId(req.user.id, { page: 1, limit: 5 });
    const recentHistory = await PatientHistory.findByPatientId(patient.id, { page: 1, limit: 5 });

    // Consultation Summary stats
    const [[consultationStats]] = await pool.execute(
      `SELECT COUNT(*) as total, COALESCE(SUM(status IN ('requested', 'accepted', 'scheduled', 'in_progress')), 0) as active 
       FROM consultations WHERE patient_id = ?`,
      [patient.id]
    );

    // Upcoming consultations
    const [upcomingConsultations] = await pool.execute(
      `SELECT c.*, du.full_name AS doctor_name, d.specialization 
       FROM consultations c 
       JOIN doctors d ON c.doctor_id = d.id JOIN users du ON d.user_id = du.id
       WHERE c.patient_id = ? AND c.status IN ('requested', 'accepted', 'scheduled', 'in_progress')
       ORDER BY c.consultation_date ASC, c.preferred_date ASC LIMIT 5`,
      [patient.id]
    );

    // Consultation History
    const [consultationHistory] = await pool.execute(
      `SELECT c.*, du.full_name AS doctor_name, d.specialization 
       FROM consultations c 
       JOIN doctors d ON c.doctor_id = d.id JOIN users du ON d.user_id = du.id
       WHERE c.patient_id = ? AND c.status IN ('completed', 'cancelled', 'rejected')
       ORDER BY c.updated_at DESC LIMIT 5`,
      [patient.id]
    );

    // Upcoming sample collections
    const [upcomingCollections] = await pool.execute(
      `SELECT scr.*, lt.test_name, lb.booking_date
       FROM sample_collection_requests scr
       JOIN lab_bookings lb ON scr.lab_booking_id = lb.id
       JOIN lab_tests lt ON lb.lab_test_id = lt.id
       WHERE scr.patient_id = ? AND scr.status NOT IN ('delivered', 'cancelled')
       ORDER BY scr.preferred_date ASC, scr.created_at DESC LIMIT 5`,
      [patient.id]
    );

    res.json({
      success: true,
      data: {
        patient,
        summary,
        upcomingAppointments: upcoming,
        unreadNotifications: unreadNotifs,
        recentReports,
        recentLabBookings,
        recentNotifications: notifResult.data,
        recentHistory: recentHistory.data,
        consultationStats,
        upcomingConsultations,
        consultationHistory,
        upcomingCollections,
      },
    });
  } catch (error) { next(error); }
};

exports.getDoctorDashboard = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByUserId(req.user.id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found.' });

    const summary = await Doctor.getSummary(doctor.id);
    const upcoming = await Appointment.getUpcoming({ doctor_id: doctor.id, limit: 5 });
    const unreadNotifs = await Notification.getUnreadCount(req.user.id);

    // Pending consultation requests
    const [pendingConsultations] = await pool.execute(
      `SELECT c.*, pu.full_name AS patient_name 
       FROM consultations c 
       JOIN patients p ON c.patient_id = p.id JOIN users pu ON p.user_id = pu.id
       WHERE c.doctor_id = ? AND c.status = 'requested'
       ORDER BY c.preferred_date ASC LIMIT 5`,
      [doctor.id]
    );

    // Scheduled consultations
    const [scheduledConsultations] = await pool.execute(
      `SELECT c.*, pu.full_name AS patient_name 
       FROM consultations c 
       JOIN patients p ON c.patient_id = p.id JOIN users pu ON p.user_id = pu.id
       WHERE c.doctor_id = ? AND c.status = 'scheduled'
       ORDER BY c.consultation_date ASC, c.consultation_time ASC LIMIT 5`,
      [doctor.id]
    );

    // Consultation Stats
    const [[consultationStats]] = await pool.execute(
      `SELECT COUNT(*) as total, 
              COALESCE(SUM(status='requested'), 0) as requested, 
              COALESCE(SUM(status='scheduled'), 0) as scheduled, 
              COALESCE(SUM(status='completed'), 0) as completed
       FROM consultations WHERE doctor_id = ?`,
      [doctor.id]
    );

    res.json({
      success: true,
      data: { 
        doctor, 
        summary, 
        upcomingAppointments: upcoming, 
        unreadNotifications: unreadNotifs,
        pendingConsultations,
        scheduledConsultations,
        consultationStats,
      },
    });
  } catch (error) { next(error); }
};

exports.getAdminDashboard = async (req, res, next) => {
  try {
    const [[users]] = await pool.execute(`SELECT COUNT(*) as total, COALESCE(SUM(role='patient'), 0) as patients, COALESCE(SUM(role='doctor'), 0) as doctors FROM users WHERE is_active = 1`);
    const [[appointments]] = await pool.execute(`SELECT COUNT(*) as total, COALESCE(SUM(status IN ('pending', 'scheduled', 'confirmed', 'rescheduled')), 0) as upcoming FROM appointments`);
    const [[todayAppts]] = await pool.execute(`SELECT COUNT(*) as total FROM appointments WHERE appointment_date = CURDATE() AND status IN ('pending', 'scheduled', 'confirmed', 'rescheduled')`);
    const [[labBookings]] = await pool.execute(`SELECT COUNT(*) as total, COALESCE(SUM(status NOT IN ('completed', 'cancelled')), 0) as pending FROM lab_bookings`);
    const [[collectionStats]] = await pool.execute(
      `SELECT COUNT(*) as total, 
              COALESCE(SUM(status = 'requested'), 0) as pending,
              COALESCE(SUM(status IN ('assigned', 'scheduled', 'in_transit')), 0) as assigned,
              COALESCE(SUM(status IN ('collected', 'testing', 'report_ready', 'delivered')), 0) as completed
       FROM sample_collection_requests`
    );
    const unreadNotifs = await Notification.getUnreadCount(req.user.id);

    // Consultation Analytics
    const [[consultationAnalytics]] = await pool.execute(
      `SELECT COUNT(*) as total, 
              COALESCE(SUM(status='requested'), 0) as requested, 
              COALESCE(SUM(status='scheduled'), 0) as scheduled, 
              COALESCE(SUM(status='completed'), 0) as completed, 
              COALESCE(SUM(status='cancelled'), 0) as cancelled
       FROM consultations`
    );

    // Consultation Activity Feed
    const [consultationActivity] = await pool.execute(
      `SELECT csl.*, du.full_name AS doctor_name, pu.full_name AS patient_name 
       FROM consultation_status_logs csl 
       JOIN consultations c ON csl.consultation_id = c.id 
       JOIN doctors d ON c.doctor_id = d.id JOIN users du ON d.user_id = du.id
       JOIN patients p ON c.patient_id = p.id JOIN users pu ON p.user_id = pu.id
       ORDER BY csl.created_at DESC LIMIT 5`
    );

    // Doctor Workload (top doctors with consultation counts)
    const [doctorWorkload] = await pool.execute(
      `SELECT du.full_name as doctor_name, d.specialization, COUNT(c.id) as consultation_count
       FROM doctors d
       JOIN users du ON d.user_id = du.id
       LEFT JOIN consultations c ON d.id = c.doctor_id
       GROUP BY d.id, du.full_name, d.specialization
       ORDER BY consultation_count DESC LIMIT 5`
    );

    // Medical Reports KPIs
    const [[reportsKPI]] = await pool.execute(
      `SELECT COUNT(*) as total, COALESCE(SUM(file_size), 0) as total_size FROM medical_reports`
    );

    // Patient History KPIs
    const [[historyKPI]] = await pool.execute(`SELECT COUNT(*) as total FROM patient_history`);
    const [historyEventsGrouped] = await pool.execute(
      `SELECT event_type, COUNT(*) as count FROM patient_history GROUP BY event_type ORDER BY count DESC`
    );

    // Recent Report Activities (HIPAA Audit Log Feed)
    const [recentReportActivities] = await pool.execute(
      `SELECT ral.*, u.full_name AS user_name, mr.title AS report_title, mr.patient_id, pu.full_name AS patient_name
       FROM report_activity_logs ral
       JOIN users u ON ral.user_id = u.id
       JOIN medical_reports mr ON ral.report_id = mr.id
       JOIN patients p ON mr.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       ORDER BY ral.created_at DESC LIMIT 5`
    );

    // Notifications KPIs
    const [[notifSent]] = await pool.execute(`SELECT COUNT(*) as total FROM notifications`);
    const [[notifScheduled]] = await pool.execute(`SELECT COUNT(*) as total FROM scheduled_notifications WHERE status = 'pending'`);
    const [[notifMuted]] = await pool.execute(
      `SELECT COUNT(*) as total FROM notification_preferences 
       WHERE enable_appointment_reminders = 0 
          OR enable_consultation_reminders = 0 
          OR enable_lab_reminders = 0 
          OR enable_collection_reminders = 0 
          OR enable_report_notifications = 0 
          OR enable_system_notifications = 0`
    );
    const [notifTypeStats] = await pool.execute(
      `SELECT type AS type, COUNT(*) as count FROM notifications GROUP BY type`
    );

    res.json({
      success: true,
      data: { 
        users, 
        appointments, 
        todayAppointments: todayAppts.total, 
        labBookings, 
        collectionStats,
        unreadNotifications: unreadNotifs,
        consultationAnalytics,
        consultationActivity,
        doctorWorkload,
        reportsKPI,
        recentReportActivities,
        historyKPI,
        historyEventsGrouped,
        notifSent: notifSent.total,
        notifScheduled: notifScheduled.total,
        notifMuted: notifMuted.total,
        notifTypeStats,
      },
    });
  } catch (error) { next(error); }
};
