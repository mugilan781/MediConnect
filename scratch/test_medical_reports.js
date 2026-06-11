const pool = require('../config/db');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testWorkflow() {
  try {
    console.log('--- STARTING MEDICAL REPORTS MODULE VERIFICATION ---');

    // 1. Resolve Patient & Doctor profile IDs from DB
    const [[patientRow]] = await pool.execute("SELECT id FROM patients WHERE user_id = 19");
    const [[doctorRow]] = await pool.execute("SELECT id FROM doctors WHERE user_id = 20");
    
    if (!patientRow || !doctorRow) {
      throw new Error("Test users not found in the database. Run previous migration seeds first.");
    }
    const patientId = patientRow.id;
    const doctorId = doctorRow.id;
    console.log(`Resolved test profile IDs: Patient ID = ${patientId}, Doctor ID = ${doctorId}`);

    // 2. Log in users
    console.log('Logging in as admin...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mediconnect.com', password: 'password123' })
    });
    const adminLoginData = await adminLoginRes.json();
    if (!adminLoginData.success) throw new Error(`Admin login failed: ${adminLoginData.message}`);
    const adminToken = adminLoginData.data.token;
    console.log('Admin logged in.');

    console.log('Logging in as doctor...');
    const doctorLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'doctor1@test.com', password: 'Patient@123' })
    });
    const doctorLoginData = await doctorLoginRes.json();
    if (!doctorLoginData.success) throw new Error(`Doctor login failed: ${doctorLoginData.message}`);
    const doctorToken = doctorLoginData.data.token;
    console.log('Doctor logged in.');

    console.log('Logging in as patient...');
    const patientLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient1@test.com', password: 'Patient@123' })
    });
    const patientLoginData = await patientLoginRes.json();
    if (!patientLoginData.success) throw new Error(`Patient login failed: ${patientLoginData.message}`);
    const patientToken = patientLoginData.data.token;
    console.log('Patient logged in.');

    // 3. Category CRUD as Admin
    console.log('Testing Categories management as Admin...');
    const createCatRes = await fetch(`${BASE_URL}/reports/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ category_name: 'Workflow Verification Test Category' })
    });
    const createCatData = await createCatRes.json();
    if (!createCatData.success) throw new Error(`Failed to create category: ${createCatData.message}`);
    console.log('Category created successfully.');

    // List categories
    const listCatRes = await fetch(`${BASE_URL}/reports/categories`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const listCatData = await listCatRes.json();
    const testCat = listCatData.data.find(c => c.category_name === 'Workflow Verification Test Category');
    if (!testCat) throw new Error('Verification category not found in list.');
    console.log(`Category found in list. ID: ${testCat.id}`);

    // 4. File upload format verification (only PDF and images allowed)
    console.log('Verifying invalid file format upload (TXT)...');
    const txtForm = new FormData();
    txtForm.append('patient_id', patientId);
    txtForm.append('report_type', 'lab_result');
    txtForm.append('category', 'Workflow Verification Test Category');
    txtForm.append('title', 'Invalid Format Test');
    const txtBlob = new Blob(['invalid format content'], { type: 'text/plain' });
    txtForm.append('file', txtBlob, 'test.txt');

    const txtUploadRes = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${doctorToken}` },
      body: txtForm
    });
    const txtUploadData = await txtUploadRes.json();
    if (txtUploadRes.ok || txtUploadData.success) {
      throw new Error('Security Error: Uploading text file succeeded when it should be blocked by express validation filters.');
    }
    console.log('Success: Invalid file format blocked. Message:', txtUploadData.message);

    // 5. Valid PDF file upload
    console.log('Uploading valid report file (PDF)...');
    const pdfForm = new FormData();
    pdfForm.append('patient_id', patientId);
    pdfForm.append('report_type', 'lab_result');
    pdfForm.append('category', 'Workflow Verification Test Category');
    pdfForm.append('title', 'Verification Lab Report');
    const pdfBlob = new Blob(['%PDF-1.4 dummy pdf content'], { type: 'application/pdf' });
    pdfForm.append('file', pdfBlob, 'verification_report.pdf');

    const pdfUploadRes = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${doctorToken}` },
      body: pdfForm
    });
    const pdfUploadData = await pdfUploadRes.json();
    if (!pdfUploadRes.ok || !pdfUploadData.success) {
      throw new Error(`Failed to upload valid report: ${pdfUploadData.message}`);
    }
    const reportId = pdfUploadData.data.id;
    console.log(`PDF report uploaded successfully. Report ID: ${reportId}`);

    // 6. Access Control Boundaries testing
    // By default, the uploaded report is shared with the patient (is_shared_with_patient = 1).
    // Let's verify patient can access it.
    console.log('Verifying patient can view shared report...');
    const patViewRes = await fetch(`${BASE_URL}/reports/${reportId}`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const patViewData = await patViewRes.json();
    if (!patViewRes.ok || !patViewData.success) {
      throw new Error(`Patient failed to access shared report: ${patViewData.message}`);
    }
    console.log('Verified: Patient can access shared report.');

    // Now set is_shared_with_patient = 0 as doctor (hide from patient)
    console.log('Updating report to hide from patient (is_shared_with_patient = 0)...');
    const updateRes = await fetch(`${BASE_URL}/reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${doctorToken}`
      },
      body: JSON.stringify({ is_shared_with_patient: 0 })
    });
    const updateData = await updateRes.json();
    if (!updateRes.ok || !updateData.success) {
      throw new Error(`Failed to hide report: ${updateData.message}`);
    }
    console.log('Report shared status updated to hidden.');

    // Verify patient is now BLOCKED (403 Forbidden)
    console.log('Verifying patient access is blocked for hidden report...');
    const patViewHiddenRes = await fetch(`${BASE_URL}/reports/${reportId}`, {
      headers: { 'Authorization': `Bearer ${patientToken}` }
    });
    const patViewHiddenData = await patViewHiddenRes.json();
    if (patViewHiddenRes.status !== 403 || patViewHiddenData.success) {
      throw new Error('Security Error: Patient was able to view report hidden from patient!');
    }
    console.log('Verified: Patient access successfully blocked for hidden reports.');

    // Test secure download
    console.log('Testing secure download route for doctor...');
    const downloadRes = await fetch(`${BASE_URL}/reports/${reportId}/download`, {
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    if (!downloadRes.ok) {
      throw new Error(`Doctor download failed: ${downloadRes.status}`);
    }
    console.log('Verified: Doctor can securely download reports.');

    // 7. Verify HIPAA Audit Logs creation
    console.log('Verifying HIPAA audit logs exist for activities...');
    const [logs] = await pool.execute(`SELECT * FROM report_activity_logs WHERE report_id = ? ORDER BY id ASC`, [reportId]);
    console.log(`Found ${logs.length} activity log entries for Report ID ${reportId}:`);
    logs.forEach(log => {
      console.log(` - User ID: ${log.user_id}, Type: ${log.activity_type}, IP: ${log.ip_address}, Created: ${log.created_at}`);
    });
    
    // Check for upload and download events log existence
    const hasUpload = logs.some(l => l.activity_type === 'upload');
    const hasDownload = logs.some(l => l.activity_type === 'download');
    if (!hasUpload) throw new Error('Upload activity log entry missing.');
    if (!hasDownload) throw new Error('Download activity log entry missing.');
    console.log('Verified: HIPAA activity logs generated accurately.');

    // 8. Clean up created test records
    console.log('Cleaning up verification records from database...');
    // Delete report (physical file deleted automatically in controller)
    const deleteRes = await fetch(`${BASE_URL}/reports/${reportId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${doctorToken}` }
    });
    const deleteData = await deleteRes.json();
    if (!deleteRes.ok || !deleteData.success) {
      throw new Error(`Cleanup delete failed: ${deleteData.message}`);
    }
    console.log('Verification report cleaned up.');

    // Delete category
    const deleteCatRes = await fetch(`${BASE_URL}/reports/categories/${testCat.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const deleteCatData = await deleteCatRes.json();
    if (!deleteCatRes.ok || !deleteCatData.success) {
      throw new Error(`Cleanup category failed: ${deleteCatData.message}`);
    }
    console.log('Verification category cleaned up.');

    console.log('\n✅ ALL MEDICAL REPORTS MODULE END-TO-END TESTS PASSED! ✅');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ MODULE VERIFICATION FAILED:', err.message);
    process.exit(1);
  }
}

testWorkflow();
