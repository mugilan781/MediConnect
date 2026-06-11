// ============================================================
// MediConnect – services/reminderEngine.js
// Automated background processor for reminders and schedules
// ============================================================

const pool = require('../config/db');
const notificationService = require('./notificationService');
const ScheduledNotification = require('../models/ScheduledNotification');

let engineInterval = null;

const reminderEngine = {
  /**
   * Start the reminder check loop
   * @param {number} intervalMs - Poll interval in milliseconds (default: 1 hour)
   */
  start(intervalMs = 60 * 60 * 1000) {
    if (engineInterval) clearInterval(engineInterval);
    
    console.log(`🚀 Notification Reminder Engine started (polling every ${intervalMs / 1000}s)`);
    
    // Execute immediately on startup
    this.runCycle();

    engineInterval = setInterval(() => this.runCycle(), intervalMs);
  },

  /**
   * Stop the reminder check loop
   */
  stop() {
    if (engineInterval) {
      clearInterval(engineInterval);
      engineInterval = null;
      console.log('🛑 Notification Reminder Engine stopped');
    }
  },

  /**
   * Run a single checking cycle across all tables
   */
  async runCycle() {
    try {
      console.log('⏰ Running Notification Reminder Engine Cycle...');
      await this.processScheduledNotifications();
      await this.processAppointmentReminders();
      await this.processConsultationReminders();
      await this.processLabBookingReminders();
      await this.processSampleCollectionReminders();
      console.log('✅ Notification Reminder Engine Cycle Completed.');
    } catch (err) {
      console.error('❌ Notification Reminder Engine error:', err.message);
    }
  },

  /**
   * 1. Process Scheduled / Broadcast Notifications
   */
  async processScheduledNotifications() {
    try {
      const pending = await ScheduledNotification.findPending();
      if (pending.length === 0) return;

      console.log(`Processing ${pending.length} pending scheduled admin notifications...`);
      for (const sn of pending) {
        try {
          if (sn.target_group === 'individual') {
            await notificationService.notify({
              userId: sn.target_user_id,
              type: sn.type,
              title: sn.title,
              message: sn.message,
              link: sn.link,
              related_module: 'scheduled_notifications',
              related_record_id: sn.id
            });
          } else if (sn.target_group === 'all') {
            const [users] = await pool.execute("SELECT id FROM users WHERE is_active = 1");
            for (const u of users) {
              await notificationService.notify({
                userId: u.id,
                type: sn.type,
                title: sn.title,
                message: sn.message,
                link: sn.link,
                related_module: 'scheduled_notifications',
                related_record_id: sn.id
              });
            }
          } else if (sn.target_group === 'all_patients') {
            const [users] = await pool.execute("SELECT id FROM users WHERE role = 'patient' AND is_active = 1");
            for (const u of users) {
              await notificationService.notify({
                userId: u.id,
                type: sn.type,
                title: sn.title,
                message: sn.message,
                link: sn.link,
                related_module: 'scheduled_notifications',
                related_record_id: sn.id
              });
            }
          } else if (sn.target_group === 'all_doctors') {
            const [users] = await pool.execute("SELECT id FROM users WHERE role = 'doctor' AND is_active = 1");
            for (const u of users) {
              await notificationService.notify({
                userId: u.id,
                type: sn.type,
                title: sn.title,
                message: sn.message,
                link: sn.link,
                related_module: 'scheduled_notifications',
                related_record_id: sn.id
              });
            }
          }
          await ScheduledNotification.updateStatus(sn.id, 'sent');
        } catch (err) {
          console.error(`Failed to dispatch scheduled notification ID ${sn.id}:`, err.message);
          await ScheduledNotification.updateStatus(sn.id, 'failed');
        }
      }
    } catch (err) {
      console.error('Error in processScheduledNotifications:', err.message);
    }
  },

  /**
   * 2. Process Appointment Reminders (24h Before / Same Day)
   */
  async processAppointmentReminders() {
    try {
      // 2a. 24 Hours Before Reminder
      const [appt24h] = await pool.execute(
        `SELECT a.id, a.appointment_date, a.appointment_time, du.full_name AS doctor_name, p.user_id AS patient_user_id
         FROM appointments a
         JOIN doctors d ON a.doctor_id = d.id
         JOIN users du ON d.user_id = du.id
         JOIN patients p ON a.patient_id = p.id
         JOIN users pu ON p.user_id = pu.id
         WHERE a.status IN ('scheduled', 'confirmed')
           AND a.appointment_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)`
      );

      for (const a of appt24h) {
        const title = 'Reminder: Appointment in 24 Hours';
        // Check if reminder was already sent
        const [existing] = await pool.execute(
          `SELECT id FROM notifications 
           WHERE user_id = ? AND type = 'reminder' AND related_module = 'appointments' 
             AND related_record_id = ? AND title = ?`,
          [a.patient_user_id, a.id, title]
        );
        if (existing.length === 0) {
          const formattedDate = a.appointment_date.toISOString().split('T')[0];
          await notificationService.notify({
            userId: a.patient_user_id,
            type: 'reminder',
            title,
            message: `You have an appointment with Dr. ${a.doctor_name} tomorrow on ${formattedDate} at ${a.appointment_time}.`,
            link: '/appointments.html',
            related_module: 'appointments',
            related_record_id: a.id,
            prefField: 'enable_appointment_reminders'
          });
        }
      }

      // 2b. Same Day Reminder
      const [apptToday] = await pool.execute(
        `SELECT a.id, a.appointment_date, a.appointment_time, du.full_name AS doctor_name, p.user_id AS patient_user_id
         FROM appointments a
         JOIN doctors d ON a.doctor_id = d.id
         JOIN users du ON d.user_id = du.id
         JOIN patients p ON a.patient_id = p.id
         JOIN users pu ON p.user_id = pu.id
         WHERE a.status IN ('scheduled', 'confirmed')
           AND a.appointment_date = CURDATE()`
      );

      for (const a of apptToday) {
        const title = 'Reminder: Appointment Today';
        const [existing] = await pool.execute(
          `SELECT id FROM notifications 
           WHERE user_id = ? AND type = 'reminder' AND related_module = 'appointments' 
             AND related_record_id = ? AND title = ?`,
          [a.patient_user_id, a.id, title]
        );
        if (existing.length === 0) {
          await notificationService.notify({
            userId: a.patient_user_id,
            type: 'reminder',
            title,
            message: `Your appointment with Dr. ${a.doctor_name} is scheduled for today at ${a.appointment_time}.`,
            link: '/appointments.html',
            related_module: 'appointments',
            related_record_id: a.id,
            prefField: 'enable_appointment_reminders'
          });
        }
      }
    } catch (err) {
      console.error('Error in processAppointmentReminders:', err.message);
    }
  },

  /**
   * 3. Process Consultation Reminders (24h Before / Same Day)
   */
  async processConsultationReminders() {
    try {
      // 3a. 24h before
      const [consult24h] = await pool.execute(
        `SELECT c.id, c.consultation_date, c.consultation_time, du.full_name AS doctor_name, p.user_id AS patient_user_id
         FROM consultations c
         JOIN doctors d ON c.doctor_id = d.id
         JOIN users du ON d.user_id = du.id
         JOIN patients p ON c.patient_id = p.id
         JOIN users pu ON p.user_id = pu.id
         WHERE c.status = 'scheduled'
           AND c.consultation_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)`
      );

      for (const c of consult24h) {
        const title = 'Reminder: Teleconsultation in 24 Hours';
        const [existing] = await pool.execute(
          `SELECT id FROM notifications 
           WHERE user_id = ? AND type = 'reminder' AND related_module = 'consultations' 
             AND related_record_id = ? AND title = ?`,
          [c.patient_user_id, c.id, title]
        );
        if (existing.length === 0) {
          const formattedDate = c.consultation_date.toISOString().split('T')[0];
          await notificationService.notify({
            userId: c.patient_user_id,
            type: 'reminder',
            title,
            message: `You have an online consultation with Dr. ${c.doctor_name} tomorrow on ${formattedDate} at ${c.consultation_time}.`,
            link: '/consultations.html',
            related_module: 'consultations',
            related_record_id: c.id,
            prefField: 'enable_consultation_reminders'
          });
        }
      }

      // 3b. Same Day
      const [consultToday] = await pool.execute(
        `SELECT c.id, c.consultation_date, c.consultation_time, du.full_name AS doctor_name, p.user_id AS patient_user_id
         FROM consultations c
         JOIN doctors d ON c.doctor_id = d.id
         JOIN users du ON d.user_id = du.id
         JOIN patients p ON c.patient_id = p.id
         JOIN users pu ON p.user_id = pu.id
         WHERE c.status = 'scheduled'
           AND c.consultation_date = CURDATE()`
      );

      for (const c of consultToday) {
        const title = 'Reminder: Teleconsultation Today';
        const [existing] = await pool.execute(
          `SELECT id FROM notifications 
           WHERE user_id = ? AND type = 'reminder' AND related_module = 'consultations' 
             AND related_record_id = ? AND title = ?`,
          [c.patient_user_id, c.id, title]
        );
        if (existing.length === 0) {
          await notificationService.notify({
            userId: c.patient_user_id,
            type: 'reminder',
            title,
            message: `Your online consultation with Dr. ${c.doctor_name} is scheduled for today at ${c.consultation_time}.`,
            link: '/consultations.html',
            related_module: 'consultations',
            related_record_id: c.id,
            prefField: 'enable_consultation_reminders'
          });
        }
      }
    } catch (err) {
      console.error('Error in processConsultationReminders:', err.message);
    }
  },

  /**
   * 4. Process Lab Booking Reminders (Same Day)
   */
  async processLabBookingReminders() {
    try {
      const [labsToday] = await pool.execute(
        `SELECT lb.id, lb.booking_date, lb.preferred_time, lt.test_name, p.user_id AS patient_user_id
         FROM lab_bookings lb
         JOIN lab_tests lt ON lb.lab_test_id = lt.id
         JOIN patients p ON lb.patient_id = p.id
         JOIN users pu ON p.user_id = pu.id
         WHERE lb.status IN ('pending', 'confirmed')
           AND lb.booking_date = CURDATE()`
      );

      for (const l of labsToday) {
        const title = 'Reminder: Lab Test Appointment Today';
        const [existing] = await pool.execute(
          `SELECT id FROM notifications 
           WHERE user_id = ? AND type = 'reminder' AND related_module = 'lab_bookings' 
             AND related_record_id = ? AND title = ?`,
          [l.patient_user_id, l.id, title]
        );
        if (existing.length === 0) {
          await notificationService.notify({
            userId: l.patient_user_id,
            type: 'reminder',
            title,
            message: `Your booking for "${l.test_name}" is scheduled for today at ${l.preferred_time || 'scheduled hour'}.`,
            link: '/lab-tests.html',
            related_module: 'lab_bookings',
            related_record_id: l.id,
            prefField: 'enable_lab_reminders'
          });
        }
      }
    } catch (err) {
      console.error('Error in processLabBookingReminders:', err.message);
    }
  },

  /**
   * 5. Process Sample Collection Reminders (Same Day)
   */
  async processSampleCollectionReminders() {
    try {
      const [colToday] = await pool.execute(
        `SELECT scr.id, scr.preferred_date, scr.preferred_time_slot, lt.test_name, p.user_id AS patient_user_id
         FROM sample_collection_requests scr
         JOIN lab_bookings lb ON scr.lab_booking_id = lb.id
         JOIN lab_tests lt ON lb.lab_test_id = lt.id
         JOIN patients p ON scr.patient_id = p.id
         JOIN users pu ON p.user_id = pu.id
         WHERE scr.status IN ('assigned', 'scheduled')
           AND scr.preferred_date = CURDATE()`
      );

      for (const c of colToday) {
        const title = 'Reminder: Home Sample Collection Today';
        const [existing] = await pool.execute(
          `SELECT id FROM notifications 
           WHERE user_id = ? AND type = 'reminder' AND related_module = 'sample_collections' 
             AND related_record_id = ? AND title = ?`,
          [c.patient_user_id, c.id, title]
        );
        if (existing.length === 0) {
          await notificationService.notify({
            userId: c.patient_user_id,
            type: 'reminder',
            title,
            message: `Your home sample collection for "${c.test_name}" is scheduled for today during slot: ${c.preferred_time_slot || 'scheduled hour'}.`,
            link: '/sample-collection.html',
            related_module: 'sample_collections',
            related_record_id: c.id,
            prefField: 'enable_collection_reminders'
          });
        }
      }
    } catch (err) {
      console.error('Error in processSampleCollectionReminders:', err.message);
    }
  }
};

module.exports = reminderEngine;
