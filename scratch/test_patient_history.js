const pool = require('../config/db');

const BASE_URL = 'http://localhost:5000/api/v1';

async function runTests() {
  try {
    console.log('--- STARTING PATIENT HISTORY TRACKING MODULE VERIFICATION ---');

    // 1. Resolve Patient & Doctor IDs from DB
    const [[patientUserRow]] = await pool.execute("SELECT id FROM users WHERE email = 'patient1@test.com'");
    if (!patientUserRow) throw new Error("Patient user not found.");
    const [[patientRow]] = await pool.execute("SELECT id FROM patients WHERE user_id = ?", [patientUserRow.id]);
    if (!patientRow) throw new Error("Patient profile not found.");
    const patientId = patientRow.id;

    const [[doctorUserRow]] = await pool.execute("SELECT id FROM users WHERE email = 'doctor1@test.com'");
    if (!doctorUserRow) throw new Error("Doctor user not found.");
    const [[doctorRow]] = await pool.execute("SELECT id FROM doctors WHERE user_id = ?", [doctorUserRow.id]);
    if (!doctorRow) throw new Error("Doctor profile not found.");
    const doctorId = doctorRow.id;

    console.log(`Resolved IDs: Patient ID = ${patientId}, Doctor ID = ${doctorId}`);

    // Resolve or Create an Unauthorized Doctor (to test 403 authorization rules)
    let unauthorizedDoctorId;
    let unauthorizedDoctorToken;
    let unauthorizedDoctorEmail = 'doctor_unauth@test.com';

    const [[unauthDocUserRow]] = await pool.execute("SELECT id FROM users WHERE email = ?", [unauthorizedDoctorEmail]);
    if (unauthDocUserRow) {
      const [[unauthDocRow]] = await pool.execute("SELECT id FROM doctors WHERE user_id = ?", [unauthDocUserRow.id]);
      if (unauthDocRow) {
        unauthorizedDoctorId = unauthDocRow.id;
      }
    }

    if (!unauthorizedDoctorId) {
      console.log('Creating unauthorized doctor user for verification...');
      // Use direct SQL to insert a test unauthorized doctor to avoid registration complexities
      const bcrypt = require('bcryptjs');
      const hashedPass = await bcrypt.hash('Patient@123', 10);
      const [insertUser] = await pool.execute(
        "INSERT INTO users (email, password_hash, role, full_name, is_active) VALUES (?, ?, 'doctor', 'Dr. Unauth History', 1)",
        [unauthorizedDoctorEmail, hashedPass]
      );
      const [insertDoc] = await pool.execute(
        "INSERT INTO doctors (user_id, specialization, qualification, experience_years, license_number) VALUES (?, 'Cardiology', 'MD', 5, 'LIC-UNAUTH-8822')",
        [insertUser.insertId]
      );
      unauthorizedDoctorId = insertDoc.insertId;
      console.log(`Created unauthorized doctor. ID: ${unauthorizedDoctorId}`);
    }

    // 2. Generate tokens programmatically to bypass express-rate-limit
    const jwt = require('jsonwebtoken');
    const env = require('../config/env');

    console.log('Generating JWT tokens programmatically to bypass login rate limits...');
    
    const [[adminUserRow]] = await pool.execute("SELECT id, email, role FROM users WHERE email = 'admin@mediconnect.com'");
    if (!adminUserRow) throw new Error("Admin user not found in database.");
    const adminToken = jwt.sign({ id: adminUserRow.id, email: adminUserRow.email, role: adminUserRow.role }, env.JWT_SECRET, { expiresIn: '1h' });

    const [[doctorUserObj]] = await pool.execute("SELECT id, email, role FROM users WHERE email = 'doctor1@test.com'");
    if (!doctorUserObj) throw new Error("Authorized doctor user not found in database.");
    const doctorToken = jwt.sign({ id: doctorUserObj.id, email: doctorUserObj.email, role: doctorUserObj.role }, env.JWT_SECRET, { expiresIn: '1h' });

    const [[unauthDocUserObj]] = await pool.execute("SELECT id, email, role FROM users WHERE email = ?", [unauthorizedDoctorEmail]);
    if (!unauthDocUserObj) throw new Error("Unauthorized doctor user not found in database.");
    unauthorizedDoctorToken = jwt.sign({ id: unauthDocUserObj.id, email: unauthDocUserObj.email, role: unauthDocUserObj.role }, env.JWT_SECRET, { expiresIn: '1h' });

    const [[patientUserObj]] = await pool.execute("SELECT id, email, role FROM users WHERE email = 'patient1@test.com'");
    if (!patientUserObj) throw new Error("Patient user not found in database.");
    const patientToken = jwt.sign({ id: patientUserObj.id, email: patientUserObj.email, role: patientUserObj.role }, env.JWT_SECRET, { expiresIn: '1h' });

    console.log('JWT tokens generated successfully.');

    // 3. Cleanup old test data
    console.log('Cleaning up previous test verification records...');
    await pool.execute("DELETE FROM patient_history WHERE patient_id = ?", [patientId]);
    await pool.execute("DELETE FROM sample_collection_requests WHERE patient_id = ?", [patientId]);
    await pool.execute("DELETE FROM lab_bookings WHERE patient_id = ?", [patientId]);
    await pool.execute("DELETE FROM consultations WHERE patient_id = ?", [patientId]);
    await pool.execute("DELETE FROM appointments WHERE patient_id = ?", [patientId]);
    await pool.execute("DELETE FROM medical_reports WHERE patient_id = ?", [patientId]);
    await pool.execute("DELETE FROM lab_tests WHERE test_code = 'TEST-HIST-01'");
    console.log('Database cleanup completed.');

    // 4. Test Case: Appointment Workflow -> Patient History Integration
    console.log('\n--- 4. TESTING APPOINTMENT TRIGGER ---');
    console.log('Patient booking appointment...');
    const createApptRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        doctor_id: doctorId,
        appointment_date: '2026-06-25',
        appointment_time: '11:00',
        type: 'in_person',
        reason: 'Patient History Verification Appointment'
      })
    });
    const createApptData = await createApptRes.json();
    if (!createApptRes.ok || !createApptData.success) {
      throw new Error(`Appointment creation failed: ${createApptData.message}`);
    }
    const appointmentId = createApptData.data.id;
    console.log(`Appointment created with ID: ${appointmentId}`);

    // Wait a brief moment to allow async logging to insert
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify appointment history log
    const [apptHistory] = await pool.execute(
      "SELECT * FROM patient_history WHERE patient_id = ? AND source_module = 'appointments' AND source_record_id = ?",
      [patientId, appointmentId]
    );
    if (apptHistory.length === 0) {
      throw new Error("Patient history record was NOT created automatically for appointment creation!");
    }
    console.log(`Verified: History record created. Title: "${apptHistory[0].title}", Event Type: "${apptHistory[0].event_type}"`);

    // Let's reschedule the appointment
    console.log('Patient rescheduling appointment...');
    const rescheduleRes = await fetch(`${BASE_URL}/appointments/${appointmentId}/reschedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        appointment_date: '2026-06-26',
        appointment_time: '14:30',
        reason: 'Changing date'
      })
    });
    const rescheduleData = await rescheduleRes.json();
    if (!rescheduleRes.ok || !rescheduleData.success) {
      throw new Error(`Appointment rescheduling failed: ${rescheduleData.message}`);
    }
    console.log('Reschedule endpoint called successfully.');

    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify rescheduled history log
    const [reschedHistory] = await pool.execute(
      "SELECT * FROM patient_history WHERE patient_id = ? AND source_module = 'appointments' AND source_record_id = ? AND event_type = 'Appointment Rescheduled'",
      [patientId, appointmentId]
    );
    if (reschedHistory.length === 0) {
      throw new Error("Patient history record was NOT created automatically for appointment reschedule!");
    }
    console.log(`Verified: Reschedule history record created: "${reschedHistory[0].description}"`);


    // 5. Test Case: Consultation Request Workflow -> Patient History Integration
    console.log('\n--- 5. TESTING CONSULTATION TRIGGER ---');
    console.log('Patient requesting consultation...');
    const createConsultRes = await fetch(`${BASE_URL}/consultations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        doctor_id: doctorId,
        preferred_date: '2026-06-28',
        symptoms: 'History verification symptoms description'
      })
    });
    const createConsultData = await createConsultRes.json();
    if (!createConsultRes.ok || !createConsultData.success) {
      throw new Error(`Consultation creation failed: ${createConsultData.message}`);
    }
    const consultationId = createConsultData.data.id;
    console.log(`Consultation created with ID: ${consultationId}`);

    await new Promise(resolve => setTimeout(resolve, 300));

    const [consultHistory] = await pool.execute(
      "SELECT * FROM patient_history WHERE patient_id = ? AND source_module = 'consultations' AND source_record_id = ?",
      [patientId, consultationId]
    );
    if (consultHistory.length === 0) {
      throw new Error("Patient history record was NOT created automatically for consultation request!");
    }
    console.log(`Verified: Consultation history record created: "${consultHistory[0].title}"`);


    // 6. Test Case: Lab Booking Workflow -> Patient History Integration
    console.log('\n--- 6. TESTING LAB BOOKING TRIGGER ---');
    console.log('Admin creating a lab test...');
    const createTestRes = await fetch(`${BASE_URL}/lab-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        test_name: 'Patient History Verification Test',
        test_code: 'TEST-HIST-01',
        category: 'Biochemistry',
        description: 'Verify patient history tracking workflows.',
        price: 99.00,
        preparation_instructions: 'Fasting 12 hours.',
        turnaround_hours: 12
      })
    });
    const createTestData = await createTestRes.json();
    if (!createTestRes.ok || !createTestData.success) {
      throw new Error(`Failed to create lab test: ${createTestData.message}`);
    }
    const testId = createTestData.data.id;
    console.log(`Lab test created. ID: ${testId}`);

    console.log('Patient booking the lab test...');
    const bookLabRes = await fetch(`${BASE_URL}/lab-bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        lab_test_id: testId,
        booking_date: '2026-06-29',
        preferred_time: '10:00',
        notes: 'Verification test booking'
      })
    });
    const bookLabData = await bookLabRes.json();
    if (!bookLabRes.ok || !bookLabData.success) {
      throw new Error(`Failed to book lab test: ${bookLabData.message}`);
    }
    const bookingId = bookLabData.data.id;
    console.log(`Lab booking created. ID: ${bookingId}`);

    await new Promise(resolve => setTimeout(resolve, 300));

    const [labHistory] = await pool.execute(
      "SELECT * FROM patient_history WHERE patient_id = ? AND source_module = 'lab_bookings' AND source_record_id = ?",
      [patientId, bookingId]
    );
    if (labHistory.length === 0) {
      throw new Error("Patient history record was NOT created automatically for lab booking!");
    }
    console.log(`Verified: Lab booking history record created: "${labHistory[0].title}"`);


    // 7. Test Case: Home Sample Collection Workflow -> Patient History Integration
    console.log('\n--- 7. TESTING SAMPLE COLLECTION TRIGGER ---');
    console.log('Patient requesting home sample collection...');
    const createCollectionRes = await fetch(`${BASE_URL}/sample-collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        lab_booking_id: bookingId,
        collection_address: '456 Mint and Teal Way',
        preferred_date: '2026-06-29',
        preferred_time_slot: '09:00-11:00',
        notes: 'Ring bell'
      })
    });
    const createCollectionData = await createCollectionRes.json();
    if (!createCollectionRes.ok || !createCollectionData.success) {
      throw new Error(`Failed to request sample collection: ${createCollectionData.message}`);
    }
    const requestId = createCollectionData.data.id;
    console.log(`Sample collection requested. ID: ${requestId}`);

    await new Promise(resolve => setTimeout(resolve, 300));

    const [collectionHistory] = await pool.execute(
      "SELECT * FROM patient_history WHERE patient_id = ? AND source_module = 'sample_collections' AND source_record_id = ?",
      [patientId, requestId]
    );
    if (collectionHistory.length === 0) {
      throw new Error("Patient history record was NOT created automatically for sample collection request!");
    }
    console.log(`Verified: Sample collection history record created: "${collectionHistory[0].title}"`);


    // 8. Test Case: Medical Report Workflow -> Patient History Integration
    console.log('\n--- 8. TESTING MEDICAL REPORT TRIGGER ---');
    console.log('Doctor uploading medical report...');
    const pdfForm = new FormData();
    pdfForm.append('patient_id', patientId);
    pdfForm.append('report_type', 'lab_result');
    pdfForm.append('category', 'Biochemistry');
    pdfForm.append('title', 'Patient History Test Lab Report');
    const pdfBlob = new Blob(['%PDF-1.4 dummy pdf'], { type: 'application/pdf' });
    pdfForm.append('file', pdfBlob, 'patient_history_test.pdf');

    const uploadRes = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${doctorToken}` },
      body: pdfForm
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.success) {
      throw new Error(`Failed to upload medical report: ${uploadData.message}`);
    }
    const reportId = uploadData.data.id;
    console.log(`Report uploaded. ID: ${reportId}`);

    await new Promise(resolve => setTimeout(resolve, 300));

    const [reportHistory] = await pool.execute(
      "SELECT * FROM patient_history WHERE patient_id = ? AND source_module = 'reports' AND source_record_id = ?",
      [patientId, reportId]
    );
    if (reportHistory.length === 0) {
      throw new Error("Patient history record was NOT created automatically for report upload!");
    }
    console.log(`Verified: Report history record created: "${reportHistory[0].title}"`);


    // 9. Test Case: Role-Based Access Control and Ownership Boundaries
    console.log('\n--- 9. TESTING ACCESS CONTROL AND ENDPOINTS ---');
    
    // 9a. Patient gets their own history
    console.log('Retrieving history as patient (should succeed)...');
    const patHistoryRes = await fetch(`${BASE_URL}/history`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const patHistoryData = await patHistoryRes.json();
    if (!patHistoryRes.ok || !patHistoryData.success) {
      throw new Error(`Patient history retrieval failed: ${patHistoryData.message}`);
    }
    console.log(`Success: Patient retrieved ${patHistoryData.data.length} history records.`);

    // 9b. Patient attempts to get history of another patient (direct endpoint /patient/:id)
    // Wait, patient ID does not match patient user's profile ID. Let's try to query history of patient ID 99999.
    console.log('Patient attempting to retrieve history of another patient (should return 403)...');
    const patGetOtherRes = await fetch(`${BASE_URL}/history/patient/99999`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const patGetOtherData = await patGetOtherRes.json();
    if (patGetOtherRes.status !== 403 || patGetOtherData.success) {
      throw new Error("Security breach: Patient was allowed to retrieve another patient's history!");
    }
    console.log('Verified: Access forbidden for patient querying other patients.');

    // 9c. Authorized Doctor gets history (associated with patient via active appointment)
    console.log('Retrieving history as authorized doctor (should succeed because care relationship exists)...');
    const docGetRes = await fetch(`${BASE_URL}/history/patient/${patientId}`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const docGetData = await docGetRes.json();
    if (!docGetRes.ok || !docGetData.success) {
      throw new Error(`Authorized doctor was blocked from patient history: ${docGetData.message}`);
    }
    console.log(`Success: Authorized doctor retrieved ${docGetData.data.length} records.`);

    // 9d. Unauthorized Doctor gets history
    console.log('Retrieving history as unauthorized doctor (should return 403 because no care relationship exists)...');
    const unauthDocGetRes = await fetch(`${BASE_URL}/history/patient/${patientId}`, {
      headers: { 'Authorization': `Bearer ${unauthorizedDoctorToken}` }
    });
    const unauthDocGetData = await unauthDocGetRes.json();
    if (unauthDocGetRes.status !== 403 || unauthDocGetData.success) {
      throw new Error("Security breach: Unauthorized doctor was allowed to retrieve patient's history!");
    }
    console.log('Verified: Access forbidden for unauthorized doctor.');

    // 9e. Admin retrieves patient history
    console.log('Retrieving history as admin (should succeed for any patient)...');
    const adminGetRes = await fetch(`${BASE_URL}/history/patient/${patientId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminGetData = await adminGetRes.json();
    if (!adminGetRes.ok || !adminGetData.success) {
      throw new Error(`Admin was blocked from patient history: ${adminGetData.message}`);
    }
    console.log(`Success: Admin retrieved ${adminGetData.data.length} records.`);

    // 9f. Timeline retrieval endpoint
    console.log('Retrieving timeline as patient (should succeed)...');
    const timelineRes = await fetch(`${BASE_URL}/history/timeline?patientId=${patientId}`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const timelineData = await timelineRes.json();
    if (!timelineRes.ok || !timelineData.success) {
      throw new Error(`Timeline retrieval failed: ${timelineData.message}`);
    }
    console.log(`Success: Retrieved timeline list with ${timelineData.data.length} items.`);

    // 9g. Search endpoint
    console.log('Searching patient history for "Appointment" keyword...');
    const searchRes = await fetch(`${BASE_URL}/history/search?query=Appointment`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const searchData = await searchRes.json();
    if (!searchRes.ok || !searchData.success) {
      throw new Error(`Search endpoint failed: ${searchData.message}`);
    }
    const hasSearchMatches = searchData.data.length > 0;
    if (!hasSearchMatches) {
      throw new Error("Search query returned empty results when matches should exist.");
    }
    console.log(`Success: Search query matched ${searchData.data.length} records.`);

    // 10. Clean up and finalize
    console.log('\nCleaning up verification records...');
    await pool.execute("DELETE FROM patient_history WHERE patient_id = ?", [patientId]);
    await pool.execute("DELETE FROM sample_collection_requests WHERE patient_id = ?", [patientId]);
    await pool.execute("DELETE FROM lab_bookings WHERE patient_id = ?", [patientId]);
    await pool.execute("DELETE FROM consultations WHERE patient_id = ?", [patientId]);
    await pool.execute("DELETE FROM appointments WHERE patient_id = ?", [patientId]);
    await pool.execute("DELETE FROM medical_reports WHERE patient_id = ?", [patientId]);
    await pool.execute("DELETE FROM lab_tests WHERE test_code = 'TEST-HIST-01'");

    // Clean up created unauthorized doctor user/doctor
    await pool.execute("DELETE FROM doctors WHERE id = ?", [unauthorizedDoctorId]);
    await pool.execute("DELETE FROM users WHERE email = ?", [unauthorizedDoctorEmail]);

    console.log('✅ ALL PATIENT HISTORY SYSTEM E2E TESTS PASSED SUCCESSFULLY! ✅');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ PATIENT HISTORY VERIFICATION FAILED:', error.message);
    process.exit(1);
  }
}

runTests();
