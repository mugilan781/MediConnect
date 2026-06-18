// Test all demo mode API endpoints
const http = require('http');

const endpoints = [
  '/api/v1/appointments',
  '/api/v1/appointments/upcoming',
  '/api/v1/consultations',
  '/api/v1/reports',
  '/api/v1/reports/categories',
  '/api/v1/notifications',
  '/api/v1/notifications/unread-count',
  '/api/v1/history',
  '/api/v1/lab-bookings',
  '/api/v1/sample-collections',
  '/api/v1/lab-tests',
  '/api/v1/patients/profile',
  '/api/v1/dashboard/patient',
  '/api/v1/dashboard/doctor',
  '/api/v1/dashboard/admin',
  '/api/v1/admin/dashboard',
  '/api/v1/admin/users',
  '/api/v1/admin/analytics',
];

let pass = 0, fail = 0;

function test(endpoint) {
  return new Promise((resolve) => {
    http.get('http://localhost:5000' + endpoint, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${res.statusCode} ${endpoint}`);
          pass++;
        } else {
          console.log(`❌ ${res.statusCode} ${endpoint} — ${body.substring(0, 100)}`);
          fail++;
        }
        resolve();
      });
    }).on('error', (e) => {
      console.log(`❌ ERR ${endpoint} — ${e.message}`);
      fail++;
      resolve();
    });
  });
}

(async () => {
  for (const ep of endpoints) {
    await test(ep);
  }
  console.log(`\n${pass} passed, ${fail} failed out of ${endpoints.length} total`);
})();
