const BASE_URL = 'http://localhost:5000/api/v1';

async function testAdminNotificationsHistory() {
  try {
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

    console.log('Requesting admin notifications history...');
    const historyRes = await fetch(`${BASE_URL}/admin/notifications?page=1&limit=5`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const historyData = await historyRes.json();
    
    if (!historyRes.ok || !historyData.success) {
      throw new Error(`Failed to retrieve history: ${historyData.message}`);
    }

    console.log(`Successfully retrieved ${historyData.data.length} notifications.`);
    console.log('First notification sample:', historyData.data[0]);
    console.log('Pagination details:', historyData.pagination);
    
    console.log('\n✅ ADMIN NOTIFICATIONS HISTORY ROUTE VERIFICATION PASSED! ✅');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
    process.exit(1);
  }
}

testAdminNotificationsHistory();
