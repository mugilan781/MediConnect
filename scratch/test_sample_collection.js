const pool = require('c:/MUGILAN/MR Coderz Hub/Project 7/MediConnect/config/db');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testSampleCollectionWorkflow() {
  try {
    console.log('--- STARTING SAMPLE COLLECTION MODULE VERIFICATION ---');

    // 1. Log in as admin
    console.log('Logging in as admin...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mediconnect.com', password: 'password123' })
    });
    const adminLoginData = await adminLoginRes.json();
    if (!adminLoginData.success) {
      throw new Error(`Admin login failed: ${adminLoginData.message}`);
    }
    const adminToken = adminLoginData.data.token;
    console.log('Admin logged in successfully.');

    // 2. Log in as patient
    console.log('Logging in as patient...');
    const patientLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient1@test.com', password: 'Patient@123' })
    });
    const patientLoginData = await patientLoginRes.json();
    if (!patientLoginData.success) {
      throw new Error(`Patient login failed: ${patientLoginData.message}`);
    }
    const patientToken = patientLoginData.data.token;
    const patientId = patientLoginData.data.profile.id;
    console.log(`Patient logged in successfully. Profile ID: ${patientId}`);

    // Clean up old verification tests
    console.log('Cleaning up existing database verify records...');
    await pool.execute("DELETE FROM sample_collection_requests WHERE lab_booking_id IN (SELECT id FROM lab_bookings WHERE lab_test_id IN (SELECT id FROM lab_tests WHERE test_code = 'TEST-SAMPLE-01'))");
    await pool.execute("DELETE FROM lab_bookings WHERE lab_test_id IN (SELECT id FROM lab_tests WHERE test_code = 'TEST-SAMPLE-01')");
    await pool.execute("DELETE FROM lab_tests WHERE test_code = 'TEST-SAMPLE-01'");

    // 3. Create lab test catalog item
    console.log('Admin creating new lab test...');
    const createTestRes = await fetch(`${BASE_URL}/lab-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        test_name: 'Sample Collection Verification Test',
        test_code: 'TEST-SAMPLE-01',
        category: 'Diagnostic',
        description: 'Test catalog item for sample collection verification.',
        price: 150.00,
        preparation_instructions: 'No special instruction.',
        turnaround_hours: 24
      })
    });
    const createTestData = await createTestRes.json();
    if (!createTestData.success) {
      throw new Error(`Failed to create lab test: ${createTestData.message}`);
    }
    const testId = createTestData.data.id;
    console.log(`Lab test created successfully. ID: ${testId}`);

    // 4. Patient books lab test
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const bookingDate = tomorrow.toISOString().split('T')[0];

    console.log('Patient submitting a valid lab booking request...');
    const bookingRes = await fetch(`${BASE_URL}/lab-bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        lab_test_id: testId,
        booking_date: bookingDate,
        preferred_time: '10:30',
        notes: 'Verification booking.'
      })
    });
    const bookingData = await bookingRes.json();
    if (!bookingData.success) {
      throw new Error(`Failed to book lab test: ${bookingData.message}`);
    }
    const bookingId = bookingData.data.id;
    console.log(`Booking created. ID: ${bookingId}, Status: ${bookingData.data.status}`);

    // 5. Patient requests collection
    // 5a. Past date validation check
    console.log('Verifying collection validation prevents past dates...');
    const pastDateRes = await fetch(`${BASE_URL}/sample-collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        lab_booking_id: bookingId,
        collection_address: '123 Health Street',
        preferred_date: '2020-01-01',
        preferred_time_slot: '09:00-11:00',
        notes: 'Past date check'
      })
    });
    const pastDateData = await pastDateRes.json();
    if (pastDateRes.status !== 400 || pastDateData.success) {
      throw new Error('Validation failed: pickup date in the past was allowed.');
    }
    console.log('Verified: Past pickup dates are successfully blocked.');

    // 5b. Valid request submission
    console.log('Patient requesting home collection for the booking...');
    const requestRes = await fetch(`${BASE_URL}/sample-collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        lab_booking_id: bookingId,
        collection_address: '123 Teal Health Blvd, Suite 400',
        preferred_date: bookingDate,
        preferred_time_slot: '09:00-11:00',
        notes: 'Ring doorbell on arrival.'
      })
    });
    const requestData = await requestRes.json();
    if (!requestData.success) {
      throw new Error(`Failed to create sample collection request: ${requestData.message}`);
    }
    const requestId = requestData.data.id;
    console.log(`Collection Request submitted. ID: ${requestId}, Status: ${requestData.data.status}`);

    // Verify initial requested log
    const [initialLogs] = await pool.execute(`SELECT * FROM sample_collection_status_logs WHERE sample_collection_request_id = ?`, [requestId]);
    if (initialLogs.length === 0 || initialLogs[0].new_status !== 'requested') {
      throw new Error('Initial status log record for "requested" missing in database.');
    }
    console.log('Verified: Request initial status log saved in database.');

    // 5c. Duplicate active request check
    console.log('Verifying validation blocks duplicate active pickup requests for the same booking...');
    const duplicateRes = await fetch(`${BASE_URL}/sample-collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        lab_booking_id: bookingId,
        collection_address: '123 Teal Health Blvd, Suite 400',
        preferred_date: bookingDate,
        preferred_time_slot: '09:00-11:00',
        notes: 'Duplicate check'
      })
    });
    const duplicateData = await duplicateRes.json();
    if (duplicateRes.status !== 409 || duplicateData.success) {
      throw new Error('Validation failed: Duplicate active collection request was allowed.');
    }
    console.log('Verified: Duplicate active pickup requests successfully blocked.');

    // 6. Admin assigns collector and schedules
    console.log('Admin assigning collector phlebotomist and scheduling date/time...');
    const assignRes = await fetch(`${BASE_URL}/sample-collections/${requestId}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        collector_name: 'Alice Phlebotomist',
        collector_phone: '1234567890',
        collection_date: bookingDate,
        collection_time: '10:00',
        notes: 'Urgent pick-up'
      })
    });
    const assignData = await assignRes.json();
    if (!assignRes.ok || !assignData.success || assignData.data.status !== 'scheduled') {
      throw new Error(`Collector assignment failed: ${assignData.message}`);
    }
    console.log(`Collector staff assigned. Request updated to status: ${assignData.data.status}`);

    // Verify parent lab booking status synced to 'sample_scheduled'
    const [bookingAfterAssign] = await pool.execute(`SELECT status FROM lab_bookings WHERE id = ?`, [bookingId]);
    if (bookingAfterAssign[0].status !== 'sample_scheduled') {
      throw new Error(`Parent booking status did not sync. Expected: 'sample_scheduled', Found: '${bookingAfterAssign[0].status}'`);
    }
    console.log("Verified: Parent booking status synced to 'sample_scheduled'.");

    // 7. Admin updates request status: scheduled -> in_transit
    console.log('Admin updating request status to in_transit...');
    const transitRes = await fetch(`${BASE_URL}/sample-collections/${requestId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'in_transit', reason: 'Collector is on the way.' })
    });
    const transitData = await transitRes.json();
    if (!transitData.success || transitData.data.status !== 'in_transit') {
      throw new Error(`Failed to update status to in_transit: ${transitData.message}`);
    }
    console.log('Status updated to in_transit successfully.');

    // 8. Admin updates request status: in_transit -> collected
    console.log('Admin updating request status to collected...');
    const collectedRes = await fetch(`${BASE_URL}/sample-collections/${requestId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'collected', reason: 'Sample collected successfully.' })
    });
    const collectedData = await collectedRes.json();
    if (!collectedData.success || collectedData.data.status !== 'collected') {
      throw new Error(`Failed to update status to collected: ${collectedData.message}`);
    }
    console.log('Status updated to collected successfully.');

    // Verify parent booking status synced to 'sample_collected'
    const [bookingAfterCollected] = await pool.execute(`SELECT status FROM lab_bookings WHERE id = ?`, [bookingId]);
    if (bookingAfterCollected[0].status !== 'sample_collected') {
      throw new Error(`Parent booking status did not sync. Expected: 'sample_collected', Found: '${bookingAfterCollected[0].status}'`);
    }
    console.log("Verified: Parent booking status synced to 'sample_collected'.");

    // 9. Admin updates request status: collected -> testing
    console.log('Admin updating request status to testing...');
    const testingRes = await fetch(`${BASE_URL}/sample-collections/${requestId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'testing', reason: 'Sample received at lab and testing has begun.' })
    });
    const testingData = await testingRes.json();
    if (!testingData.success || testingData.data.status !== 'testing') {
      throw new Error(`Failed to update status to testing: ${testingData.message}`);
    }
    console.log('Status updated to testing successfully.');

    // Verify parent booking status synced to 'processing'
    const [bookingAfterTesting] = await pool.execute(`SELECT status FROM lab_bookings WHERE id = ?`, [bookingId]);
    if (bookingAfterTesting[0].status !== 'processing') {
      throw new Error(`Parent booking status did not sync. Expected: 'processing', Found: '${bookingAfterTesting[0].status}'`);
    }
    console.log("Verified: Parent booking status synced to 'processing'.");

    // 10. Patient attempts cancellation (should fail since status is now 'testing')
    console.log('Verifying patient cancellation guard prevents cancellation after collector is assigned...');
    const cancelRes = await fetch(`${BASE_URL}/sample-collections/${requestId}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({ reason: 'Patient changed mind.' })
    });
    const cancelData = await cancelRes.json();
    if (cancelRes.status !== 400 || cancelData.success) {
      throw new Error('Cancellation guard failed: cancellation allowed after collector assigned.');
    }
    console.log('Verified: Cancellation guard successfully blocks late cancellations.');

    // 11. Database logs audit check
    console.log('Checking database status change log logs...');
    const [logs] = await pool.execute(`SELECT * FROM sample_collection_status_logs WHERE sample_collection_request_id = ? ORDER BY id ASC`, [requestId]);
    console.log(`Found ${logs.length} total status transition logs in DB:`);
    logs.forEach(log => {
      console.log(` - ${log.previous_status || 'NULL'} -> ${log.new_status} (Changed by: ${log.changed_by}, Reason: ${log.reason})`);
    });

    if (logs.length < 5) {
      throw new Error('Status logs log count is incomplete.');
    }

    console.log('\n✅ ALL HOME SAMPLE COLLECTION WORKFLOW TESTS PASSED SUCCESSFULLY! ✅');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
    process.exit(1);
  }
}

testSampleCollectionWorkflow();
