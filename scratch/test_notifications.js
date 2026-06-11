const pool = require('../config/db');
const reminderEngine = require('../services/reminderEngine');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testNotifications() {
  try {
    console.log('--- STARTING NOTIFICATIONS & REMINDERS MODULE VERIFICATION ---');

    // 1. Resolve Patient & Doctor details
    const [[patientRow]] = await pool.execute("SELECT id, user_id FROM patients WHERE user_id = 19");
    const [[doctorRow]] = await pool.execute("SELECT id, user_id FROM doctors WHERE user_id = 20");

    if (!patientRow || !doctorRow) {
      throw new Error("Test users not found in the database. Ensure migrations and seed scripts are run.");
    }
    const patientId = patientRow.id;
    const patientUserId = patientRow.user_id;
    const doctorId = doctorRow.id;
    const doctorUserId = doctorRow.user_id;
    console.log(`Resolved IDs: Patient ID=${patientId} (User=${patientUserId}), Doctor ID=${doctorId} (User=${doctorUserId})`);

    // Clean up any existing appointments for these test users to prevent slot booking conflicts
    await pool.execute("DELETE FROM appointments WHERE patient_id = ? AND doctor_id = ?", [patientId, doctorId]);
    console.log('Cleaned up existing test appointments.');

    // 2. Log in users
    console.log('\n[1/7] Logging in users...');
    
    // Patient login
    const patientLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient1@test.com', password: 'Patient@123' })
    });
    const patientLoginData = await patientLoginRes.json();
    if (!patientLoginData.success) throw new Error(`Patient login failed: ${patientLoginData.message}`);
    const patientToken = patientLoginData.data.token;
    console.log('Patient logged in successfully.');

    // Doctor login
    const doctorLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor1@test.com', password: 'Patient@123' })
    });
    const doctorLoginData = await doctorLoginRes.json();
    if (!doctorLoginData.success) throw new Error(`Doctor login failed: ${doctorLoginData.message}`);
    const doctorToken = doctorLoginData.data.token;
    console.log('Doctor logged in successfully.');

    // Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mediconnect.com', password: 'password123' })
    });
    const adminLoginData = await adminLoginRes.json();
    if (!adminLoginData.success) throw new Error(`Admin login failed: ${adminLoginData.message}`);
    const adminToken = adminLoginData.data.token;
    console.log('Admin logged in successfully.');

    // 3. Test Preferences GET and PUT
    console.log('\n[2/7] Testing Preferences endpoints...');
    const getPrefsRes = await fetch(`${BASE_URL}/notifications/preferences`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const getPrefsData = await getPrefsRes.json();
    if (!getPrefsData.success) throw new Error(`Failed to get preferences: ${getPrefsData.message}`);
    console.log('Successfully fetched patient preferences:', getPrefsData.data);

    // Disable appointment notifications
    console.log('Updating preferences: disabling appointment reminders...');
    const updatePrefsRes = await fetch(`${BASE_URL}/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        ...getPrefsData.data,
        enable_appointment_reminders: false
      })
    });
    const updatePrefsData = await updatePrefsRes.json();
    if (!updatePrefsData.success) throw new Error(`Failed to update preferences: ${updatePrefsData.message}`);
    if (updatePrefsData.data.enable_appointment_reminders !== 0) {
      throw new Error('Preference was not updated to disabled (0).');
    }
    console.log('Preferences updated and validated.');

    // Restore to true
    await fetch(`${BASE_URL}/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        ...getPrefsData.data,
        enable_appointment_reminders: true
      })
    });
    console.log('Preferences restored to enabled.');

    // 4. Test Event-Driven Notification generation (Create Appointment)
    console.log('\n[3/7] Testing Event-Driven Notification Generation...');
    
    // Clear pre-existing notifications for cleaner testing
    await pool.execute("DELETE FROM notifications WHERE user_id IN (?, ?)", [patientUserId, doctorUserId]);

    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 3); // 3 days in future
    const formattedDate = appointmentDate.toISOString().split('T')[0];

    console.log(`Booking an appointment on ${formattedDate} at 10:00...`);
    const bookApptRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        doctor_id: doctorId,
        appointment_date: formattedDate,
        appointment_time: '10:00',
        type: 'in_person',
        reason: 'Regular verification checkup'
      })
    });
    const bookApptData = await bookApptRes.json();
    if (!bookApptRes.ok || !bookApptData.success) {
      throw new Error(`Failed to book appointment: ${bookApptData.message}`);
    }
    const apptId = bookApptData.data.id;
    console.log(`Appointment booked successfully. ID: ${apptId}`);

    // Wait a brief moment for database operations, then fetch notifications
    // Wait a brief moment for asynchronous database operations
    await new Promise(resolve => setTimeout(resolve, 500));

    const [patientNotifs] = await pool.execute(
      "SELECT * FROM notifications WHERE user_id = ? AND related_module = 'appointments' AND related_record_id = ?",
      [patientUserId, apptId]
    );
    const [doctorNotifs] = await pool.execute(
      "SELECT * FROM notifications WHERE user_id = ? AND related_module = 'appointments' AND related_record_id = ?",
      [doctorUserId, apptId]
    );

    if (patientNotifs.length === 0 || doctorNotifs.length === 0) {
      const [debugAll] = await pool.execute("SELECT * FROM notifications");
      console.log("DEBUG: Current Notifications table contents:", debugAll);
      if (patientNotifs.length === 0) throw new Error('Patient did not receive notification for appointment booking.');
      if (doctorNotifs.length === 0) throw new Error('Doctor did not receive notification for appointment booking.');
    }
    
    console.log('Verified: Event-driven notifications generated successfully for both Patient and Doctor.');
    console.log('Patient Notification:', patientNotifs[0].title, '-', patientNotifs[0].message);
    console.log('Doctor Notification:', doctorNotifs[0].title, '-', doctorNotifs[0].message);

    // 5. Test Search & Filter and Read Status
    console.log('\n[4/7] Testing Search, Filter, and Mark-as-Read endpoints...');
    const searchRes = await fetch(`${BASE_URL}/notifications/search?query=Booking&type=appointment`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const searchData = await searchRes.json();
    if (!searchData.success) throw new Error(`Search request failed: ${searchData.message}`);
    if (searchData.data.length === 0) throw new Error('Search failed to find the notification matching the pattern.');
    console.log(`Search matched ${searchData.data.length} notifications. Match title: "${searchData.data[0].title}"`);

    // Mark as read
    const notifId = patientNotifs[0].id;
    console.log(`Marking notification ID ${notifId} as read...`);
    const readRes = await fetch(`${BASE_URL}/notifications/${notifId}/read`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const readData = await readRes.json();
    if (!readData.success) throw new Error(`Failed to mark notification as read: ${readData.message}`);
    
    const [[updatedNotif]] = await pool.execute("SELECT is_read FROM notifications WHERE id = ?", [notifId]);
    if (updatedNotif.is_read !== 1) throw new Error('Notification is_read status was not updated to 1.');
    console.log('Mark-as-read successfully verified.');

    // Unread count check
    const unreadCountRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const unreadCountData = await unreadCountRes.json();
    console.log(`Unread count: ${unreadCountData.data.count}`);

    // 6. Test Preference Suppression (Muting Notifications)
    console.log('\n[5/7] Testing Notification Preferences Suppression (Muting)...');
    
    // Mute appointments
    await fetch(`${BASE_URL}/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        enable_appointment_reminders: false
      })
    });
    console.log('Patient appointments notifications muted.');

    // Create another appointment
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 5);
    const formattedNextDate = nextDate.toISOString().split('T')[0];

    console.log(`Booking a second appointment on ${formattedNextDate} at 11:00 while muted...`);
    const bookApptRes2 = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        doctor_id: doctorId,
        appointment_date: formattedNextDate,
        appointment_time: '11:00',
        type: 'in_person',
        reason: 'Regular verification checkup 2'
      })
    });
    const bookApptData2 = await bookApptRes2.json();
    if (!bookApptRes2.ok || !bookApptData2.success) {
      throw new Error(`Second appointment booking failed: ${bookApptData2.message}`);
    }
    const apptId2 = bookApptData2.data.id;

    // Wait a brief moment for asynchronous database operations
    await new Promise(resolve => setTimeout(resolve, 500));

    // Fetch notifications for the second appointment
    const [patientNotifs2] = await pool.execute(
      "SELECT * FROM notifications WHERE user_id = ? AND related_module = 'appointments' AND related_record_id = ?",
      [patientUserId, apptId2]
    );
    const [doctorNotifs2] = await pool.execute(
      "SELECT * FROM notifications WHERE user_id = ? AND related_module = 'appointments' AND related_record_id = ?",
      [doctorUserId, apptId2]
    );

    if (patientNotifs2.length > 0) {
      throw new Error('Suppression Error: Muted notification was still generated for patient.');
    }
    if (doctorNotifs2.length === 0) {
      throw new Error('Doctor should still receive notification because their preference is enabled.');
    }
    console.log('Verified: Patient notification was correctly suppressed while Doctor received theirs.');

    // Restore preferences
    await fetch(`${BASE_URL}/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        enable_appointment_reminders: true
      })
    });
    console.log('Preferences restored to default (enabled).');

    // 7. Test Reminder Engine Scanner & Duplication Prevention
    console.log('\n[6/7] Testing Reminder Engine Scanner & Duplicate Prevention...');

    // Clear notifications for appointments to avoid pre-existing interference
    await pool.execute("DELETE FROM notifications WHERE type = 'reminder'");

    // Insert an appointment for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`Inserting mock appointment scheduled for tomorrow (${tomorrowStr})...`);
    const [mockApptRes] = await pool.execute(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, status) 
       VALUES (?, ?, ?, '09:00', 'in_person', 'confirmed')`,
      [patientId, doctorId, tomorrowStr]
    );
    const mockApptId = mockApptRes.insertId;

    // Process reminders manually via engine
    console.log('Executing processAppointmentReminders() cycle 1...');
    await reminderEngine.processAppointmentReminders();

    // Verify reminder was created
    const [reminderNotifs] = await pool.execute(
      "SELECT * FROM notifications WHERE user_id = ? AND type = 'reminder' AND related_module = 'appointments' AND related_record_id = ?",
      [patientUserId, mockApptId]
    );
    if (reminderNotifs.length !== 1) {
      throw new Error(`Expected exactly 1 reminder notification, found ${reminderNotifs.length}`);
    }
    console.log('Success: Tomorrow reminder notification created.', reminderNotifs[0].message);

    // Run engine again to verify duplicate prevention
    console.log('Executing processAppointmentReminders() cycle 2...');
    await reminderEngine.processAppointmentReminders();

    const [reminderNotifs2] = await pool.execute(
      "SELECT * FROM notifications WHERE user_id = ? AND type = 'reminder' AND related_module = 'appointments' AND related_record_id = ?",
      [patientUserId, mockApptId]
    );
    if (reminderNotifs2.length !== 1) {
      throw new Error(`Duplicate Alert: Found ${reminderNotifs2.length} notifications instead of 1.`);
    }
    console.log('Success: Duplicate prevention verified (no duplicate alerts sent).');

    // Cleanup mock appointment
    await pool.execute("DELETE FROM appointments WHERE id = ?", [mockApptId]);
    await pool.execute("DELETE FROM notifications WHERE related_record_id = ? AND related_module = 'appointments'", [mockApptId]);

    // 8. Test Admin Compose & Broadcast Delivery
    console.log('\n[7/7] Testing Admin Scheduled Broadcast Compose...');

    const scheduledTime = new Date(Date.now() + 2000).toISOString(); // 2 seconds in the future
    const broadcastRes = await fetch(`${BASE_URL}/admin/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        user_id: 'all_patients',
        title: 'System Maintenance Alert',
        message: 'The clinic portal will undergo brief maintenance tonight at 11 PM.',
        type: 'system',
        link: '/profile.html',
        scheduled_for: scheduledTime
      })
    });
    const broadcastData = await broadcastRes.json();
    if (!broadcastRes.ok || !broadcastData.success) {
      throw new Error(`Broadcast composition failed: ${broadcastData.message}`);
    }
    console.log('Scheduled notification created in database. Waiting 3 seconds for scheduled time to elapse...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Process scheduled notifications manually via engine
    console.log('Running scheduler engine to dispatch pending broadcasts...');
    await reminderEngine.processScheduledNotifications();

    // Verify patient received the system maintenance notification
    const [broadcastCheck] = await pool.execute(
      "SELECT * FROM notifications WHERE user_id = ? AND title = ? AND type = 'system'",
      [patientUserId, 'System Maintenance Alert']
    );
    if (broadcastCheck.length === 0) {
      throw new Error('Broadcast notification not received by patient.');
    }
    console.log('Success: Broadcast notification received by patient. Message:', broadcastCheck[0].message);

    // Clean up
    await pool.execute("DELETE FROM notifications WHERE title = ?", ['System Maintenance Alert']);
    await pool.execute("DELETE FROM scheduled_notifications WHERE title = ?", ['System Maintenance Alert']);

    console.log('\n=============================================================');
    console.log('✅ ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
    console.log('=============================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err.message);
    process.exit(1);
  }
}

testNotifications();
