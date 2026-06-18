// ============================================================
// MediConnect – services/demoSeed.js
// Idempotent demo user seeder for demonstration mode
// Seeds COMPLETE relational data so every dashboard tab works
// ============================================================

const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Unusable password — random string that nobody knows
const DEMO_PASSWORD_PLAIN = 'DEMO_NO_LOGIN_' + Date.now() + '_' + Math.random().toString(36);

const DEMO_USERS = [
  {
    email: 'demo.patient@mediconnect.com',
    role: 'patient',
    full_name: 'Demo Patient',
    phone: '9999900001',
  },
  {
    email: 'demo.doctor@mediconnect.com',
    role: 'doctor',
    full_name: 'Dr. Demo Doctor',
    phone: '9999900002',
  },
  {
    email: 'demo.admin@mediconnect.com',
    role: 'admin',
    full_name: 'Demo Admin',
    phone: '9999900003',
  },
];

// ── Helper: get a date string offset from today ─────────────
function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function offsetDatetime(days, hours = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

const DemoSeed = {
  /**
   * Ensure demo users and ALL related data exist in the database.
   * Safe to call on every server start — uses INSERT IGNORE / existence checks.
   */
  async init() {
    try {
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD_PLAIN, 10);

      // ──────────────────────────────────────────────────────
      // STEP 1: Create users + profiles
      // ──────────────────────────────────────────────────────
      for (const user of DEMO_USERS) {
        await pool.execute(
          `INSERT IGNORE INTO users (email, password_hash, role, full_name, phone, is_active)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [user.email, passwordHash, user.role, user.full_name, user.phone]
        );
      }

      // Fetch user IDs
      const patientUserId = await this._getUserId('demo.patient@mediconnect.com');
      const doctorUserId  = await this._getUserId('demo.doctor@mediconnect.com');
      const adminUserId   = await this._getUserId('demo.admin@mediconnect.com');

      if (!patientUserId || !doctorUserId || !adminUserId) {
        console.warn('⚠️  Demo seed: could not find all demo user IDs');
        return;
      }

      // ── Create patient profile ───────────────────────────
      await pool.execute(
        `INSERT IGNORE INTO patients (user_id, date_of_birth, gender, blood_group, address, emergency_contact, allergies)
         VALUES (?, '1995-06-15', 'male', 'O+', '42 Health Avenue, Bengaluru 560001', '9876543210', 'Penicillin, Dust')`,
        [patientUserId]
      );

      // ── Create doctor profile ────────────────────────────
      await pool.execute(
        `INSERT IGNORE INTO doctors (user_id, specialization, qualification, experience_years, license_number, consultation_fee, available_days, slot_duration_min, bio, department, is_available)
         VALUES (?, 'General Medicine', 'MBBS, MD', 10, 'DEMO-LIC-001', 500.00, 'Mon,Tue,Wed,Thu,Fri', 30, 'Demo doctor profile for demonstration purposes. Specializing in General Medicine with 10 years of experience.', 'General Medicine', 1)`,
        [doctorUserId]
      );

      // Fetch profile IDs (patients.id and doctors.id)
      const patientId = await this._getProfileId('patients', patientUserId);
      const doctorId  = await this._getProfileId('doctors', doctorUserId);

      if (!patientId || !doctorId) {
        console.warn('⚠️  Demo seed: could not find patient/doctor profile IDs');
        return;
      }

      // ──────────────────────────────────────────────────────
      // STEP 2: Check if relational data already seeded
      // ──────────────────────────────────────────────────────
      const [existingAppts] = await pool.execute(
        `SELECT id FROM appointments WHERE patient_id = ? AND doctor_id = ? LIMIT 1`,
        [patientId, doctorId]
      );
      if (existingAppts.length > 0) {
        console.log('✅ Demo data already seeded — skipping relational data');
        return;
      }

      // ──────────────────────────────────────────────────────
      // STEP 3: Seed appointments
      // ──────────────────────────────────────────────────────
      const appointments = [
        { date: offsetDate(-7),  time: '09:00:00', end: '09:30:00', status: 'completed',  type: 'in_person',    reason: 'Regular health checkup' },
        { date: offsetDate(-3),  time: '10:00:00', end: '10:30:00', status: 'completed',  type: 'teleconsult',  reason: 'Follow-up on blood test results' },
        { date: offsetDate(2),   time: '11:00:00', end: '11:30:00', status: 'confirmed',  type: 'in_person',    reason: 'Chest pain and shortness of breath' },
        { date: offsetDate(5),   time: '14:00:00', end: '14:30:00', status: 'scheduled',  type: 'teleconsult',  reason: 'Routine follow-up' },
        { date: offsetDate(-14), time: '15:00:00', end: '15:30:00', status: 'cancelled',  type: 'in_person',    reason: 'Skin rash evaluation', cancelledBy: 'patient', cancelReason: 'Scheduling conflict' },
      ];

      const appointmentIds = [];
      for (const a of appointments) {
        const [result] = await pool.execute(
          `INSERT IGNORE INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, end_time, status, type, reason, cancelled_by, cancel_reason)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [patientId, doctorId, a.date, a.time, a.end, a.status, a.type, a.reason, a.cancelledBy || null, a.cancelReason || null]
        );
        appointmentIds.push(result.insertId);
      }

      // ──────────────────────────────────────────────────────
      // STEP 4: Seed consultations
      // ──────────────────────────────────────────────────────

      // Consultation 1: Completed, linked to first completed appointment
      let consultId1 = null;
      if (appointmentIds[0]) {
        const [result] = await pool.execute(
          `INSERT IGNORE INTO consultations (appointment_id, doctor_id, patient_id, diagnosis, symptoms, prescription, follow_up_date, notes, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
          [
            appointmentIds[0], doctorId, patientId,
            'Mild hypertension, BMI within normal range',
            'Occasional headaches, fatigue',
            'Tab. Amlodipine 5mg OD x 30 days\nTab. Vitamin D3 60K once weekly x 8 weeks',
            offsetDate(30),
            'Patient advised to reduce sodium intake and increase physical activity. Blood pressure 140/90.'
          ]
        );
        consultId1 = result.insertId;
      }

      // Consultation 2: Completed, linked to second completed appointment
      let consultId2 = null;
      if (appointmentIds[1]) {
        const [result] = await pool.execute(
          `INSERT IGNORE INTO consultations (appointment_id, doctor_id, patient_id, diagnosis, symptoms, prescription, follow_up_date, notes, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
          [
            appointmentIds[1], doctorId, patientId,
            'Vitamin D deficiency, borderline cholesterol',
            'Fatigue, muscle weakness',
            'Continue Vitamin D3 supplementation\nTab. Rosuvastatin 10mg HS x 30 days',
            offsetDate(60),
            'Lab results reviewed. LDL slightly elevated at 142. HDL normal. Recommend dietary changes.'
          ]
        );
        consultId2 = result.insertId;
      }

      // Consultation 3: Requested (pending) — online consultation request
      await pool.execute(
        `INSERT IGNORE INTO consultations (appointment_id, doctor_id, patient_id, symptoms, preferred_date, health_concerns, additional_notes, status)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, 'requested')`,
        [
          doctorId, patientId,
          'Persistent cough for 2 weeks, mild fever',
          offsetDate(4),
          'Respiratory symptoms not improving with OTC medication',
          'Prefer evening consultation slot if available'
        ]
      );

      // ──────────────────────────────────────────────────────
      // STEP 5: Seed lab bookings
      // ──────────────────────────────────────────────────────

      // Find first available lab test IDs
      const [labTests] = await pool.execute(
        `SELECT id, test_name FROM lab_tests WHERE is_active = 1 ORDER BY id LIMIT 3`
      );

      const labBookingIds = [];
      if (labTests.length >= 1) {
        // Lab booking 1: Completed
        const [lb1] = await pool.execute(
          `INSERT IGNORE INTO lab_bookings (patient_id, lab_test_id, doctor_id, booking_date, preferred_time, status, result_summary, notes)
           VALUES (?, ?, ?, ?, '08:00:00', 'completed', ?, ?)`,
          [
            patientId, labTests[0].id, doctorId, offsetDate(-10),
            'All values within normal range. Hemoglobin: 14.2 g/dL, WBC: 7500/µL, Platelets: 250000/µL',
            'Routine blood work ordered during checkup'
          ]
        );
        labBookingIds.push(lb1.insertId);
      }

      if (labTests.length >= 2) {
        // Lab booking 2: Booked (pending)
        const [lb2] = await pool.execute(
          `INSERT IGNORE INTO lab_bookings (patient_id, lab_test_id, doctor_id, booking_date, preferred_time, status, notes)
           VALUES (?, ?, ?, ?, '09:30:00', 'booked', ?)`,
          [
            patientId, labTests[1].id, doctorId, offsetDate(3),
            'Follow-up test to monitor cholesterol levels'
          ]
        );
        labBookingIds.push(lb2.insertId);
      }

      if (labTests.length >= 3) {
        // Lab booking 3: Sample collected
        const [lb3] = await pool.execute(
          `INSERT IGNORE INTO lab_bookings (patient_id, lab_test_id, doctor_id, booking_date, preferred_time, status, notes)
           VALUES (?, ?, ?, ?, '10:00:00', 'sample_collected', ?)`,
          [
            patientId, labTests[2].id, doctorId, offsetDate(-2),
            'Thyroid function test for fatigue symptoms'
          ]
        );
        labBookingIds.push(lb3.insertId);
      }

      // ──────────────────────────────────────────────────────
      // STEP 6: Seed sample collection request
      // ──────────────────────────────────────────────────────
      if (labBookingIds.length >= 2) {
        await pool.execute(
          `INSERT IGNORE INTO sample_collection_requests (lab_booking_id, patient_id, collection_address, preferred_date, preferred_time_slot, status, collector_name, collector_phone)
           VALUES (?, ?, ?, ?, ?, 'assigned', ?, ?)`,
          [
            labBookingIds[1], patientId,
            '42 Health Avenue, Bengaluru 560001',
            offsetDate(3), '09:00 AM - 11:00 AM',
            'Raj Kumar', '9988776655'
          ]
        );
      }

      // ──────────────────────────────────────────────────────
      // STEP 7: Seed medical reports
      // ──────────────────────────────────────────────────────
      await pool.execute(
        `INSERT IGNORE INTO medical_reports (patient_id, doctor_id, lab_booking_id, report_type, title, file_url, file_type, notes, is_shared_with_patient)
         VALUES (?, ?, ?, 'lab_result', ?, '/uploads/reports/demo_cbc_report.pdf', 'application/pdf', ?, 1)`,
        [
          patientId, doctorId, labBookingIds[0] || null,
          'Complete Blood Count Report — June 2026',
          'All parameters within normal reference ranges. No abnormalities detected.'
        ]
      );

      await pool.execute(
        `INSERT IGNORE INTO medical_reports (patient_id, doctor_id, report_type, title, file_url, file_type, notes, is_shared_with_patient)
         VALUES (?, ?, 'prescription', ?, '/uploads/reports/demo_prescription.pdf', 'application/pdf', ?, 1)`,
        [
          patientId, doctorId,
          'Prescription — Hypertension Management',
          'Prescription for Amlodipine 5mg and Vitamin D3 supplementation.'
        ]
      );

      if (consultId1) {
        await pool.execute(
          `INSERT IGNORE INTO medical_reports (patient_id, doctor_id, report_type, title, file_url, file_type, notes, is_shared_with_patient)
           VALUES (?, ?, 'other', ?, '/uploads/reports/demo_consultation_summary.pdf', 'application/pdf', ?, 1)`,
          [
            patientId, doctorId,
            'Consultation Summary — Health Checkup',
            'Comprehensive consultation summary from routine health checkup visit.'
          ]
        );
      }

      // ──────────────────────────────────────────────────────
      // STEP 8: Seed patient history
      // ──────────────────────────────────────────────────────
      const historyEntries = [
        { type: 'appointment',   title: 'Regular Health Checkup',               desc: 'In-person visit with Dr. Demo Doctor. Blood pressure recorded at 140/90.',                  daysAgo: -7 },
        { type: 'consultation',  title: 'Consultation: Mild Hypertension',      desc: 'Diagnosed with mild hypertension. Prescribed Amlodipine 5mg.',                               daysAgo: -7 },
        { type: 'lab_test',      title: 'Complete Blood Count Test',            desc: 'CBC test completed. All values normal.',                                                      daysAgo: -10 },
        { type: 'report',        title: 'CBC Report Uploaded',                  desc: 'Lab result report uploaded and shared with patient.',                                          daysAgo: -9 },
        { type: 'prescription',  title: 'Prescription Issued',                  desc: 'Amlodipine 5mg OD, Vitamin D3 60K weekly. Duration: 30 days.',                                daysAgo: -7 },
        { type: 'appointment',   title: 'Teleconsult Follow-up',               desc: 'Follow-up teleconsultation to review blood test results.',                                     daysAgo: -3 },
        { type: 'consultation',  title: 'Consultation: Vitamin D Deficiency',   desc: 'Vitamin D and cholesterol levels reviewed. Rosuvastatin 10mg prescribed.',                    daysAgo: -3 },
        { type: 'note',          title: 'Lifestyle Advisory',                   desc: 'Patient advised to increase daily walking to 30 min and reduce salt intake below 5g/day.',     daysAgo: -3 },
      ];

      for (const h of historyEntries) {
        await pool.execute(
          `INSERT INTO patient_history (patient_id, event_type, title, description, event_date, recorded_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [patientId, h.type, h.title, h.desc, offsetDatetime(h.daysAgo), doctorUserId]
        );
      }

      // ──────────────────────────────────────────────────────
      // STEP 9: Seed notifications for all roles
      // ──────────────────────────────────────────────────────

      // Patient notifications
      const patientNotifs = [
        { type: 'appointment', title: 'Appointment Confirmed',      message: 'Your appointment with Dr. Demo Doctor on ' + offsetDate(2) + ' at 11:00 AM has been confirmed.',   link: '/patient-dashboard.html' },
        { type: 'lab',         title: 'Lab Test Booked',             message: 'Your lab test has been booked for ' + offsetDate(3) + '. A phlebotomist will visit your address.',  link: '/lab-tests.html' },
        { type: 'report',      title: 'Report Available',            message: 'Your Complete Blood Count report is now available for download.',                                   link: '/reports.html' },
        { type: 'system',      title: 'Welcome to MediConnect',     message: 'Thank you for joining MediConnect. Explore your dashboard to manage your health.',                   link: '/patient-dashboard.html' },
        { type: 'reminder',    title: 'Upcoming Appointment',        message: 'Reminder: You have an appointment scheduled for ' + offsetDate(5) + ' at 02:00 PM.',                link: '/appointments.html' },
      ];

      for (const n of patientNotifs) {
        await pool.execute(
          `INSERT INTO notifications (user_id, type, title, message, link, is_read)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [patientUserId, n.type, n.title, n.message, n.link, n.type === 'system' ? 1 : 0]
        );
      }

      // Doctor notifications
      const doctorNotifs = [
        { type: 'appointment', title: 'New Appointment Request',     message: 'Demo Patient has requested an appointment for ' + offsetDate(5) + '.',                              link: '/doctor-dashboard.html?tab=appointments' },
        { type: 'system',      title: 'Schedule Updated',            message: 'Your weekly schedule has been updated successfully.',                                                link: '/doctor-dashboard.html?tab=schedule' },
        { type: 'reminder',    title: 'Upcoming Appointment',        message: 'You have an appointment with Demo Patient on ' + offsetDate(2) + ' at 11:00 AM.',                    link: '/doctor-dashboard.html?tab=appointments' },
        { type: 'system',      title: 'Consultation Request',        message: 'Demo Patient has requested an online consultation. Review and respond.',                             link: '/doctor-dashboard.html?tab=consultations' },
      ];

      for (const n of doctorNotifs) {
        await pool.execute(
          `INSERT INTO notifications (user_id, type, title, message, link, is_read)
           VALUES (?, ?, ?, ?, ?, 0)`,
          [doctorUserId, n.type, n.title, n.message, n.link]
        );
      }

      // Admin notifications
      const adminNotifs = [
        { type: 'system',      title: 'New Patient Registration',    message: 'Demo Patient has registered on the platform.',                                                       link: '/admin-dashboard.html?tab=patients' },
        { type: 'system',      title: 'New Doctor Registration',     message: 'Dr. Demo Doctor has registered and is pending verification.',                                         link: '/admin-dashboard.html?tab=doctors' },
        { type: 'appointment', title: 'Platform Appointment Created',message: 'A new appointment has been scheduled between Demo Patient and Dr. Demo Doctor.',                      link: '/admin-dashboard.html?tab=appointments' },
      ];

      for (const n of adminNotifs) {
        await pool.execute(
          `INSERT INTO notifications (user_id, type, title, message, link, is_read)
           VALUES (?, ?, ?, ?, ?, 0)`,
          [adminUserId, n.type, n.title, n.message, n.link]
        );
      }

      // ──────────────────────────────────────────────────────
      // STEP 10: Seed doctor schedules (Mon–Sun)
      // ──────────────────────────────────────────────────────
      const scheduleDays = [
        { day: 'Mon', start: '09:00:00', end: '17:00:00', breakS: '13:00:00', breakE: '14:00:00', active: 1 },
        { day: 'Tue', start: '09:00:00', end: '17:00:00', breakS: '13:00:00', breakE: '14:00:00', active: 1 },
        { day: 'Wed', start: '10:00:00', end: '18:00:00', breakS: '13:00:00', breakE: '14:00:00', active: 1 },
        { day: 'Thu', start: '09:00:00', end: '17:00:00', breakS: '13:00:00', breakE: '14:00:00', active: 1 },
        { day: 'Fri', start: '09:00:00', end: '16:00:00', breakS: '12:30:00', breakE: '13:30:00', active: 1 },
        { day: 'Sat', start: '10:00:00', end: '14:00:00', breakS: null,       breakE: null,       active: 1 },
        { day: 'Sun', start: '09:00:00', end: '17:00:00', breakS: null,       breakE: null,       active: 0 },
      ];

      for (const s of scheduleDays) {
        await pool.execute(
          `INSERT IGNORE INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, break_start_time, break_end_time, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [doctorId, s.day, s.start, s.end, s.breakS, s.breakE, s.active]
        );
      }

      // ──────────────────────────────────────────────────────
      // STEP 11: Seed custom availability slots
      // ──────────────────────────────────────────────────────
      await pool.execute(
        `INSERT IGNORE INTO doctor_availability_slots (doctor_id, slot_date, start_time, end_time, is_available)
         VALUES (?, ?, '08:00:00', '09:00:00', 1)`,
        [doctorId, offsetDate(7)]
      );
      await pool.execute(
        `INSERT IGNORE INTO doctor_availability_slots (doctor_id, slot_date, start_time, end_time, is_available)
         VALUES (?, ?, '18:00:00', '20:00:00', 1)`,
        [doctorId, offsetDate(10)]
      );

      // ──────────────────────────────────────────────────────
      // STEP 12: Seed doctor leave
      // ──────────────────────────────────────────────────────
      await pool.execute(
        `INSERT IGNORE INTO doctor_leaves (doctor_id, start_date, end_date, reason)
         VALUES (?, ?, ?, ?)`,
        [doctorId, offsetDate(20), offsetDate(22), 'Medical conference attendance']
      );

      // ──────────────────────────────────────────────────────
      // STEP 13: Seed notification preferences
      // ──────────────────────────────────────────────────────
      for (const uid of [patientUserId, doctorUserId, adminUserId]) {
        await pool.execute(
          `INSERT IGNORE INTO notification_preferences (user_id) VALUES (?)`,
          [uid]
        );
      }

      console.log('✅ Demo users + complete relational data seeded successfully');
    } catch (error) {
      // Non-fatal — demo mode is optional
      console.warn('⚠️  Demo user seeding skipped:', error.message);
    }
  },

  /**
   * Get demo user by role. Returns the user row or null.
   */
  async getDemoUser(role) {
    const emailMap = {
      patient: 'demo.patient@mediconnect.com',
      doctor: 'demo.doctor@mediconnect.com',
      admin: 'demo.admin@mediconnect.com',
    };
    const email = emailMap[role];
    if (!email) return null;

    try {
      const [rows] = await pool.execute(
        `SELECT id, email, role, full_name, phone, is_active FROM users WHERE email = ? AND is_active = 1`,
        [email]
      );
      return rows[0] || null;
    } catch {
      return null;
    }
  },

  // ── Internal helpers ─────────────────────────────────────
  async _getUserId(email) {
    const [rows] = await pool.execute(`SELECT id FROM users WHERE email = ?`, [email]);
    return rows[0]?.id || null;
  },

  async _getProfileId(table, userId) {
    const [rows] = await pool.execute(`SELECT id FROM ${table} WHERE user_id = ?`, [userId]);
    return rows[0]?.id || null;
  },
};

module.exports = DemoSeed;
