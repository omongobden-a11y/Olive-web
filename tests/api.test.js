// ==========================================================================
// Comprehensive Backend API and Security Verification Test Suite
// ==========================================================================

const http = require('node:http');
const app = require('../server/index');

let server;
let port;
let adminToken = '';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }
    if (adminToken && reqHeaders['Authorization'] === undefined) {
      reqHeaders['Authorization'] = `Bearer ${adminToken}`;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders
      },
      res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(data); } catch (e) {}
          resolve({ status: res.statusCode, headers: res.headers, body: data, json });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Olive School Test Suite ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✔ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Start temporary server
  await new Promise(resolve => {
    server = app.listen(0, () => {
      port = server.address().port;
      console.log(`Test server running on port ${port}`);
      resolve();
    });
  });

  try {
    // 1. Health check
    console.log('\n[1] Health Check');
    const health = await request('GET', '/api/health');
    assert(health.status === 200, 'GET /api/health returns 200');
    assert(health.json && health.json.status === 'healthy', 'Health status is "healthy"');

    // 2. Public Content API
    console.log('\n[2] Public Content Endpoint');
    const content = await request('GET', '/api/content/all');
    assert(content.status === 200, 'GET /api/content/all returns 200');
    assert(Array.isArray(content.json.notices) && content.json.notices.length > 0, 'Notices array populated');
    assert(Array.isArray(content.json.events) && content.json.events.length > 0, 'Events array populated');
    assert(Array.isArray(content.json.news) && content.json.news.length > 0, 'News array populated');
    assert(Array.isArray(content.json.staff) && content.json.staff.length > 0, 'Staff array populated');
    assert(content.json.galleryCount > 0, `Gallery contains ${content.json.galleryCount} optimized photos`);

    // 3. Gallery Endpoint
    console.log('\n[3] Gallery Endpoint');
    const gallery = await request('GET', '/api/content/gallery?limit=4');
    assert(gallery.status === 200, 'GET /api/content/gallery returns 200');
    assert(Array.isArray(gallery.json) && gallery.json.length === 4, 'Gallery limit query works correctly');

    // 4. Authentication: Invalid Login
    console.log('\n[4] Authentication Security');
    const badLogin = await request('POST', '/api/auth/login', { email: 'bad@olive.com', password: 'wrong' });
    assert(badLogin.status === 401, 'Invalid login rejected with 401');

    // 5. Authentication: Valid Login
    const login = await request('POST', '/api/auth/login', {
      email: 'admin@oliveatapara.ac.ug',
      password: 'AdminOlive2027!'
    });
    assert(login.status === 200, 'Valid login returns 200');
    assert(login.json && login.json.token, 'Session token issued');
    adminToken = login.json.token;

    // 6. User Profile Verification
    console.log('\n[5] User Profile & RBAC Verification');
    const me = await request('GET', '/api/auth/me');
    assert(me.status === 200, 'GET /api/auth/me returns 200');
    assert(me.json.user.role === 'Administrator', 'User role is correctly identified as Administrator');

    // 7. Role-Based Access Control
    const users = await request('GET', '/api/users');
    assert(users.status === 200, 'Administrator can list /api/users');
    assert(Array.isArray(users.json) && users.json.length >= 6, 'All pre-seeded staff roles returned');

    // Test unauthenticated access to /api/users
    const unauthUsers = await request('GET', '/api/users', null, { Authorization: '' });
    assert(unauthUsers.status === 401, 'Unauthenticated request to /api/users rejected with 401');

    // 8. Online Admission Application Submission
    console.log('\n[6] Online Admission Application');
    const appRes = await request('POST', '/api/admissions/apply', {
      child_name: 'Akol Emmanuel',
      class_applied: 'P.1',
      date_of_birth: '2020-03-15',
      gender: 'Male',
      boarding_status: 'Day',
      guardian_name: 'Mr. Denis Akol',
      guardian_phone: '0774496507',
      guardian_email: 'denis.akol@example.com',
      address: 'Ocini Parish, Kamdini'
    });
    assert(appRes.status === 201, 'Application submission returns 201 Created');
    assert(appRes.json.appNumber && appRes.json.appNumber.startsWith('OLV-'), `Generated application number: ${appRes.json.appNumber}`);

    // 9. Automated Routing Contact Inquiries
    console.log('\n[7] Contact Form Routing');
    const enqRes = await request('POST', '/api/enquiries', {
      name: 'Sarah Amongi',
      phone: '0773782383',
      email: 'sarah@example.com',
      department: 'Admissions',
      message: 'Inquiring about reporting dates for P.4 day scholars.'
    });
    assert(enqRes.status === 201, 'Inquiry submission returns 201');
    assert(enqRes.json.ticketNumber && enqRes.json.ticketNumber.startsWith('TKT-'), `Generated ticket: ${enqRes.json.ticketNumber}`);

    // 10. Secure Remittance Transaction Gateway
    console.log('\n[8] Remittances & Transaction Gateway');
    const txnRes = await request('POST', '/api/transactions/initiate', {
      student_name: 'Akol Emmanuel',
      class_name: 'P.1',
      fee_category: 'Tuition Fees',
      amount_ugx: 230000,
      payment_method: 'MTN Mobile Money',
      phone_number: '0774496507',
      payer_name: 'Mr. Denis Akol'
    });
    assert(txnRes.status === 201, 'Transaction processed with 201 Created');
    assert(txnRes.json.receiptNumber && txnRes.json.receiptNumber.startsWith('REC-'), `Receipt issued: ${txnRes.json.receiptNumber}`);

    // 11. Digital Receipt Verification
    const receiptRes = await request('GET', `/api/transactions/receipt/${txnRes.json.receiptNumber}`);
    assert(receiptRes.status === 200, 'Official receipt verification page returns 200');
    assert(receiptRes.body.includes('PAYMENT VERIFIED'), 'Receipt contains verification badge');

    // 12. Printable PDF/HTML Admission Form
    console.log('\n[9] Printable Official Form & Calendar Feed');
    const formRes = await request('GET', '/api/admissions/form/download');
    assert(formRes.status === 200, 'Printable admission form returns 200');
    assert(formRes.body.includes('Olive Nursery and Primary School - Atapara'), 'Form contains school name');
    assert(formRes.body.includes('ME/P/10412'), 'Form contains official licence ME/P/10412');

    // 13. iCalendar Feed Interoperability
    const calRes = await request('GET', '/api/calendar/feed.ics');
    assert(calRes.status === 200, 'iCalendar feed returns 200');
    assert(calRes.body.includes('BEGIN:VCALENDAR') && calRes.body.includes('END:VCALENDAR'), 'RFC 5545 valid calendar structure');

    // 14. Full System Backup Export
    console.log('\n[10] Full System JSON Backup');
    const backupRes = await request('GET', '/api/backup/export');
    assert(backupRes.status === 200, 'Backup export returns 200');
    assert(backupRes.json && backupRes.json.tables && backupRes.json.tables.notices, 'Backup includes full database tables');

    // 15. Anthem PDF Generation & Download
    console.log('\n[11] Official Anthem PDF Download');
    const anthemPdf = await request('GET', '/api/content/anthem/pdf');
    assert(anthemPdf.status === 200, 'GET /api/content/anthem/pdf returns 200');
    assert(anthemPdf.headers['content-type'] === 'application/pdf', 'Content-Type is application/pdf');
    assert(anthemPdf.headers['content-disposition'] && anthemPdf.headers['content-disposition'].includes('Olive_School_Anthem.pdf'), 'Disposition attachment set to Olive_School_Anthem.pdf');

    // 16. Parent Registration & Phone Login
    console.log('\n[12] Parent Registration & Authentication');
    const testPhone = '0779' + Math.floor(100000 + Math.random() * 900000);
    const testEmail = `parent_${Date.now()}@example.com`;
    const regRes = await request('POST', '/api/auth/register', {
      full_name: 'Patrick Okello',
      phone: testPhone,
      email: testEmail,
      password: 'ParentSecret2027!'
    });
    assert(regRes.status === 201, 'Parent registration returns 201');
    assert(regRes.json.user.role === 'Parent', 'Role assigned is Parent');

    // Login using Phone Number instead of Email
    const phoneLogin = await request('POST', '/api/auth/login', {
      phone: testPhone,
      password: 'ParentSecret2027!'
    });
    assert(phoneLogin.status === 200, 'Login using mobile phone number returns 200');
    assert(phoneLogin.json.token, 'Session token issued from phone login');

    // 17. Forgot Password & Account Recovery with 6-Digit Code
    console.log('\n[13] Account Recovery & Password Reset');
    const forgotRes = await request('POST', '/api/auth/forgot-password', {
      identifier: testPhone
    });
    assert(forgotRes.status === 200, 'Forgot password returns 200');
    assert(forgotRes.json.code && forgotRes.json.code.length === 6, `Generated 6-digit code: ${forgotRes.json.code}`);

    const resetRes = await request('POST', '/api/auth/reset-password', {
      identifier: testPhone,
      code: forgotRes.json.code,
      newPassword: 'NewParentPassword2027!'
    });
    assert(resetRes.status === 200, 'Reset password returns 200');

    // Verify login with new password
    const newPassLogin = await request('POST', '/api/auth/login', {
      phone: testPhone,
      password: 'NewParentPassword2027!'
    });
    assert(newPassLogin.status === 200, 'Login with new recovered password returns 200');

    // 18. School Info & Fee Structure Verification
    console.log('\n[14] Bank Account & Fee Structure Verification');
    const schoolInfoRes = await request('GET', '/api/content/all');
    assert(schoolInfoRes.json.schoolInfo.phone_pd === '0782053937', 'Principal Director phone is 0782053937');
    assert(schoolInfoRes.json.schoolInfo.bank_account === '120396591117', 'Opportunity Bank account is 120396591117');
    assert(schoolInfoRes.json.fees.length >= 6, 'Contains 6 classes in fee structure');

  } catch (err) {
    console.error('Fatal test execution error:', err);
    failed++;
  } finally {
    server.close();
    console.log('\n=======================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('=======================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
