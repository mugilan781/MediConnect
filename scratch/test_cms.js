// ============================================================
// MediConnect – scratch/test_cms.js
// Automated verification script for Enterprise CMS Module
// ============================================================

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const BASE_URL = 'http://localhost:5000/api/cms';
const AUTH_URL = 'http://localhost:5000/api/v1/auth/login';

async function runTests() {
  console.log('🚀 Starting CMS Automated Verification Tests...\n');

  try {
    // 1. Log in as Admin
    console.log('🔑 Logging in as admin@mediconnect.com...');
    const loginRes = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mediconnect.com', password: 'password123' })
    });

    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.data.token) {
      throw new Error('Admin login failed: ' + JSON.stringify(loginData));
    }
    const token = loginData.data.token;
    console.log('✅ Admin login successful. Token acquired.\n');

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Test GET pages config
    console.log('📄 Testing GET /pages...');
    const pagesRes = await fetch(`${BASE_URL}/pages`, { headers: { 'Authorization': `Bearer ${token}` } });
    const pagesData = await pagesRes.json();
    if (!pagesData.success || !Array.isArray(pagesData.data)) {
      throw new Error('GET /pages failed: ' + JSON.stringify(pagesData));
    }
    console.log(`✅ GET /pages successful. Found ${pagesData.data.length} pages.`);
    const homepageId = pagesData.data.find(p => p.slug === 'homepage').id;

    // 3. Test PUT page metadata & SEO settings
    console.log(`📄 Testing PUT /page/${homepageId}...`);
    const updatePageRes = await fetch(`${BASE_URL}/page/${homepageId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        meta_title: 'MediConnect - Tested SEO Title',
        meta_keywords: 'test, health, tech',
        meta_description: 'Tested description tag.'
      })
    });
    const updatePageData = await updatePageRes.json();
    if (!updatePageData.success) {
      throw new Error('PUT /page/:id failed: ' + JSON.stringify(updatePageData));
    }
    console.log('✅ PUT /page/:id successful.');

    // 4. Test GET page dynamic details (SEO values)
    console.log('🔍 Testing GET /page/homepage (Public)...');
    const pubPageRes = await fetch(`${BASE_URL}/page/homepage`);
    const pubPageData = await pubPageRes.json();
    if (!pubPageData.success || pubPageData.data.page.meta_title !== 'MediConnect - Tested SEO Title') {
      throw new Error('Public SEO query failed or title mismatch: ' + JSON.stringify(pubPageData));
    }
    console.log('✅ GET /page/homepage verified (Title: ' + pubPageData.data.page.meta_title + ').');

    // 5. Test PUT sections (homepage CTA change)
    console.log('🏠 Testing PUT /sections/cta...');
    const ctaRes = await fetch(`${BASE_URL}/sections/cta`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        section_data: {
          title: 'Ready for Verified Health?',
          subtitle: 'Tested dynamic subsection changes.',
          button_text: 'Join Now',
          button_link: '/signup.html'
        }
      })
    });
    const ctaData = await ctaRes.json();
    if (!ctaData.success) {
      throw new Error('PUT /sections/cta failed: ' + JSON.stringify(ctaData));
    }
    console.log('✅ PUT /sections/cta successful.');

    // 6. Test FAQ CRUD & Reordering
    console.log('❓ Testing FAQ Creation...');
    const createFaqRes = await fetch(`${BASE_URL}/faqs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        question: 'Is this a programmatically added question?',
        answer: 'Yes, this is verified.',
        display_order: 10,
        is_active: 1
      })
    });
    const createFaqData = await createFaqRes.json();
    if (!createFaqData.success) {
      throw new Error('POST /faqs failed: ' + JSON.stringify(createFaqData));
    }
    const newFaqId = createFaqData.data.id;
    console.log(`✅ FAQ Created with ID ${newFaqId}.`);

    console.log('❓ Testing FAQ Reordering...');
    const reorderRes = await fetch(`${BASE_URL}/faqs/reorder`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        order: [
          { id: newFaqId, display_order: 99 },
          { id: 1, display_order: 1 } // placeholder swap
        ]
      })
    });
    const reorderData = await reorderRes.json();
    if (!reorderData.success) {
      throw new Error('POST /faqs/reorder failed: ' + JSON.stringify(reorderData));
    }
    console.log('✅ FAQ reorder transaction successful.');

    console.log('❓ Testing FAQ Deletion...');
    const delFaqRes = await fetch(`${BASE_URL}/faqs/${newFaqId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const delFaqData = await delFaqRes.json();
    if (!delFaqData.success) {
      throw new Error('DELETE /faqs/:id failed: ' + JSON.stringify(delFaqData));
    }
    console.log('✅ FAQ deletion successful.');

    // 7. Test PUT Social Links
    console.log('🔗 Testing PUT /social-links/1...');
    const socialRes = await fetch(`${BASE_URL}/social-links/1`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        url: 'https://facebook.com/mediconnect-testing',
        is_active: 1
      })
    });
    const socialData = await socialRes.json();
    if (!socialData.success) {
      throw new Error('PUT /social-links/:id failed: ' + JSON.stringify(socialData));
    }
    console.log('✅ PUT /social-links/:id verified.');

    // 8. Test Settings Bulk-updates
    console.log('⚙️ Testing PUT /settings...');
    const settingsRes = await fetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        clinic_name: 'MediConnect Tested Clinic',
        logo_path: '/uploads/cms/logo.png',
        favicon_path: '/favicon.ico',
        clinic_description: 'Verified dynamic site configurations description.'
      })
    });
    const settingsData = await settingsRes.json();
    if (!settingsData.success) {
      throw new Error('PUT /settings failed: ' + JSON.stringify(settingsData));
    }
    console.log('✅ PUT /settings verified.');

    // 9. Test Media Upload & Deletion
    console.log('🖼️ Testing POST /media (Upload Mock Asset)...');
    const form = new FormData();
    const mockFileContent = Buffer.from('mock image bytes');
    const blob = new Blob([mockFileContent], { type: 'image/png' });
    form.append('file', blob, 'test-mock-image.png');

    const uploadRes = await fetch(`${BASE_URL}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Do NOT set Content-Type header so fetch adds boundary auto
      },
      body: form
    });
    const uploadData = await uploadRes.json();
    if (!uploadData.success || !uploadData.data.id) {
      throw new Error('POST /media failed: ' + JSON.stringify(uploadData));
    }
    const uploadedMediaId = uploadData.data.id;
    console.log(`✅ Mock Media Uploaded successfully. ID = ${uploadedMediaId}`);

    console.log('🖼️ Testing DELETE /media...');
    const delMediaRes = await fetch(`${BASE_URL}/media/${uploadedMediaId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const delMediaData = await delMediaRes.json();
    if (!delMediaData.success) {
      throw new Error('DELETE /media/:id failed: ' + JSON.stringify(delMediaData));
    }
    console.log('✅ Mock Media deleted cleanly from database and disk.');

    // 10. Check Database History Logging Audits
    console.log('\n📜 Verifying patient_history entries...');
    const [historyRows] = await pool.execute(
      `SELECT * FROM patient_history 
       WHERE patient_id = 999 
       ORDER BY id DESC 
       LIMIT 5`
    );
    console.log('Recent Patient ID 999 logs:', historyRows.map(h => ({
      event_type: h.event_type,
      description: h.description,
      recorded_by: h.recorded_by
    })));

    if (historyRows.length === 0) {
      throw new Error('No history entries were logged under dummy patient ID 999!');
    }
    console.log('✅ Verified that activity history logs exist under patient ID 999.');

    console.log('\n🎉 ALL CMS BACKEND AND DB VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ VERIFICATION TEST FAILED:', error.message);
    process.exit(1);
  }
}

runTests();
