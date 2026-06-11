// ============================================================
// MediConnect – controllers/adminController.js
// Platform administrative controls
// ============================================================

const pool = require('../config/db');
const AdminSetting = require('../models/AdminSetting');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const PatientHistory = require('../models/PatientHistory');
const MedicalReport = require('../models/MedicalReport');
const LabBooking = require('../models/LabBooking');
const Appointment = require('../models/Appointment');
const Consultation = require('../models/Consultation');
const Notification = require('../models/Notification');
const ScheduledNotification = require('../models/ScheduledNotification');
const dashboardController = require('./dashboardController');
const bcrypt = require('bcryptjs');

// Delegate to the single source of truth for admin dashboard stats
exports.getDashboard = dashboardController.getAdminDashboard;

exports.getAllUsers = async (req, res, next) => {
  try {
    const result = await User.findAll(req.query);
    res.json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    await User.update(req.params.id, { is_active });
    res.json({ success: true, message: `User ${is_active ? 'activated' : 'deactivated'}.` });
  } catch (error) { next(error); }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const targetUserId = parseInt(req.params.id);

    // Prevent admin from changing their own role
    if (targetUserId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role.' });
    }

    const user = await User.findById(targetUserId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    await User.update(targetUserId, { role });

    // Create role-specific profile if switching to doctor/patient and profile doesn't exist
    if (role === 'doctor') {
      const existing = await Doctor.findByUserId(targetUserId);
      if (!existing) await Doctor.create({ user_id: targetUserId, specialization: 'General', qualification: 'MBBS' });
    } else if (role === 'patient') {
      const existing = await Patient.findByUserId(targetUserId);
      if (!existing) await Patient.create({ user_id: targetUserId });
    }

    res.json({ success: true, message: `User role updated to '${role}'.` });
  } catch (error) { next(error); }
};

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await AdminSetting.findAll();
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
};

exports.updateSetting = async (req, res, next) => {
  try {
    await AdminSetting.upsert({ setting_key: req.params.key, ...req.body, updated_by: req.user.id });
    const updated = await AdminSetting.findByKey(req.params.key);
    res.json({ success: true, message: 'Setting updated.', data: updated });
  } catch (error) { next(error); }
};

// --- Patients Management (Section 2) ---

exports.getPatients = async (req, res, next) => {
  try {
    const result = await Patient.findAll(req.query);
    res.json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

exports.getPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, data: patient });
  } catch (error) { next(error); }
};

exports.updatePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

    // Update patient table fields
    const { address, emergency_contact, date_of_birth, gender, blood_group, allergies, insurance_id } = req.body;
    await Patient.update(patient.id, { address, emergency_contact, date_of_birth, gender, blood_group, allergies, insurance_id });

    // Update user table fields
    const { full_name, phone, email } = req.body;
    const userUpdates = {};
    if (full_name !== undefined) userUpdates.full_name = full_name;
    if (phone !== undefined) userUpdates.phone = phone;
    if (email !== undefined) userUpdates.email = email;

    if (Object.keys(userUpdates).length > 0) {
      await User.update(patient.user_id, userUpdates);
    }

    const updated = await Patient.findById(req.params.id);
    res.json({ success: true, message: 'Patient updated successfully.', data: updated });
  } catch (error) { next(error); }
};

exports.deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

    // Cascade delete user
    await pool.execute(`DELETE FROM users WHERE id = ?`, [patient.user_id]);
    res.json({ success: true, message: 'Patient deleted successfully.' });
  } catch (error) { next(error); }
};

// --- Doctors Management (Section 3) ---

exports.getDoctors = async (req, res, next) => {
  try {
    const result = await Doctor.findAll(req.query);
    res.json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

exports.createDoctor = async (req, res, next) => {
  try {
    const { email, password, full_name, phone, specialization, qualification, experience_years, license_number, consultation_fee, department } = req.body;
    
    // Check if user already exists
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

    // Hash password
    const password_hash = await bcrypt.hash(password || 'MediConnect@123', 12);

    // Create user
    const userResult = await User.create({ email, password_hash, role: 'doctor', full_name, phone });
    const userId = userResult.insertId;

    // Create doctor profile
    await Doctor.create({
      user_id: userId, specialization, qualification, experience_years, license_number, consultation_fee, department
    });

    const doc = await Doctor.findByUserId(userId);
    res.status(201).json({ success: true, message: 'Doctor created successfully.', data: doc });
  } catch (error) { next(error); }
};

exports.updateDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });

    // Update doctor table fields
    const { specialization, qualification, experience_years, license_number, consultation_fee, department, is_available } = req.body;
    await Doctor.update(doctor.id, { specialization, qualification, experience_years, license_number, consultation_fee, department, is_available });

    // Update user table fields
    const { full_name, phone, email } = req.body;
    const userUpdates = {};
    if (full_name !== undefined) userUpdates.full_name = full_name;
    if (phone !== undefined) userUpdates.phone = phone;
    if (email !== undefined) userUpdates.email = email;

    if (Object.keys(userUpdates).length > 0) {
      await User.update(doctor.user_id, userUpdates);
    }

    const updated = await Doctor.findById(req.params.id);
    res.json({ success: true, message: 'Doctor updated successfully.', data: updated });
  } catch (error) { next(error); }
};

exports.deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });

    // Cascade delete doctor user
    await pool.execute(`DELETE FROM users WHERE id = ?`, [doctor.user_id]);
    res.json({ success: true, message: 'Doctor deleted successfully.' });
  } catch (error) { next(error); }
};

exports.getDoctorSchedule = async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    const [schedules] = await pool.execute(
      `SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY FIELD(day_of_week, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')`,
      [doctorId]
    );
    res.json({ success: true, data: schedules });
  } catch (error) { next(error); }
};

exports.getDoctorSlots = async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    const [slots] = await pool.execute(
      `SELECT * FROM doctor_availability_slots WHERE doctor_id = ? ORDER BY slot_date DESC, start_time ASC`,
      [doctorId]
    );
    res.json({ success: true, data: slots });
  } catch (error) { next(error); }
};

exports.getDoctorLeaves = async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    const [leaves] = await pool.execute(
      `SELECT * FROM doctor_leaves WHERE doctor_id = ? ORDER BY start_date DESC`,
      [doctorId]
    );
    res.json({ success: true, data: leaves });
  } catch (error) { next(error); }
};

// --- Notifications Management (Section 9) ---

exports.createNotification = async (req, res, next) => {
  try {
    const { user_id, type, title, message, link, scheduled_for } = req.body;

    const isScheduled = scheduled_for && new Date(scheduled_for) > new Date();

    if (isScheduled) {
      let target_group = 'individual';
      let target_user_id = null;

      if (['all', 'all_patients', 'all_doctors'].includes(user_id)) {
        target_group = user_id;
      } else {
        target_user_id = user_id;
      }

      await ScheduledNotification.create({
        sender_id: req.user.id,
        target_group,
        target_user_id,
        title,
        message,
        type: type || 'system',
        link,
        scheduled_for
      });

      return res.json({ success: true, message: 'Notification scheduled successfully.' });
    }

    // Immediate dispatch
    if (user_id === 'all') {
      const [users] = await pool.execute(`SELECT id FROM users WHERE is_active = 1`);
      for (const u of users) {
        await Notification.create({ user_id: u.id, type: type || 'system', title, message, link });
      }
      res.json({ success: true, message: `Notification broadcasted to ${users.length} users.` });
    } else if (user_id === 'all_patients') {
      const [users] = await pool.execute(`SELECT id FROM users WHERE role = 'patient' AND is_active = 1`);
      for (const u of users) {
        await Notification.create({ user_id: u.id, type: type || 'system', title, message, link });
      }
      res.json({ success: true, message: `Notification broadcasted to ${users.length} patients.` });
    } else if (user_id === 'all_doctors') {
      const [users] = await pool.execute(`SELECT id FROM users WHERE role = 'doctor' AND is_active = 1`);
      for (const u of users) {
        await Notification.create({ user_id: u.id, type: type || 'system', title, message, link });
      }
      res.json({ success: true, message: `Notification broadcasted to ${users.length} doctors.` });
    } else {
      await Notification.create({ user_id, type: type || 'system', title, message, link });
      res.json({ success: true, message: 'Notification sent successfully.' });
    }
  } catch (error) { next(error); }
};

exports.sendCustomNotification = exports.createNotification;
exports.broadcastNotification = exports.createNotification;

exports.getNotificationsHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const page = parseInt(req.query.page, 10) || 1;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT n.*, u.full_name, u.role, u.email
       FROM notifications n
       JOIN users u ON n.user_id = u.id
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [[countRows]] = await pool.execute(`SELECT COUNT(*) as total FROM notifications`);
    
    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total: countRows.total, totalPages: Math.ceil(countRows.total / limit) }
    });
  } catch (error) { next(error); }
};

// --- Analytics (Section 10) ---

exports.getAnalytics = async (req, res, next) => {
  try {
    // 1. Appointments per day (last 30 days)
    const [apptsPerDay] = await pool.execute(
      `SELECT DATE_FORMAT(appointment_date, '%Y-%m-%d') AS date, COUNT(*) AS count
       FROM appointments
       GROUP BY date
       ORDER BY date DESC
       LIMIT 30`
    );

    // 2. Consultations per month (last 12 months)
    const [consultsPerMonth] = await pool.execute(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
       FROM consultations
       GROUP BY month
       ORDER BY month DESC
       LIMIT 12`
    );

    // 3. Top Doctors by appointment count
    const [topDoctors] = await pool.execute(
      `SELECT du.full_name AS name, d.specialization, COUNT(a.id) AS appointment_count
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users du ON d.user_id = du.id
       GROUP BY d.id, du.full_name, d.specialization
       ORDER BY appointment_count DESC
       LIMIT 5`
    );

    // 4. Lab Test Trends
    const [labTestTrends] = await pool.execute(
      `SELECT lt.test_name, COUNT(lb.id) AS booking_count
       FROM lab_bookings lb
       JOIN lab_tests lt ON lb.lab_test_id = lt.id
       GROUP BY lt.id, lt.test_name
       ORDER BY booking_count DESC
       LIMIT 5`
    );

    // 5. Patient registration trends (last 30 days)
    const [registrations] = await pool.execute(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS count
       FROM users
       WHERE role = 'patient'
       GROUP BY date
       ORDER BY date DESC
       LIMIT 30`
    );

    // 6. Revenue placeholder (lab bookings complete)
    const [revenue] = await pool.execute(
      `SELECT DATE_FORMAT(lb.booking_date, '%Y-%m') AS month, COALESCE(SUM(lt.price), 0) AS revenue
       FROM lab_bookings lb
       JOIN lab_tests lt ON lb.lab_test_id = lt.id
       WHERE lb.status = 'completed'
       GROUP BY month
       ORDER BY month DESC
       LIMIT 12`
    );

    res.json({
      success: true,
      data: {
        appointmentsPerDay: apptsPerDay.reverse(),
        consultationsPerMonth: consultsPerMonth.reverse(),
        topDoctors,
        labTestTrends,
        patientRegistrations: registrations.reverse(),
        revenue: revenue.reverse(),
      }
    });
  } catch (error) { next(error); }
};
