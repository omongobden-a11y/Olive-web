const { db } = require('../server/db');

// Update alert_banner setting
const alertData = JSON.stringify({
  enabled: true,
  type: 'announcement',
  message: '📢 Applications for First Term 2027 begin on 4th January 2027 and end on 14th February 2027. (Tap anywhere to dismiss ✕)'
});
db.prepare("UPDATE site_settings SET value = ?, updated_at = ? WHERE key = 'alert_banner'").run(alertData, new Date().toISOString());

// Update school_info setting
const schoolInfo = JSON.stringify({
  name: 'Olive Nursery and Primary School - Atapara',
  motto: 'Toil to Gain',
  licence: 'ME/P/10412',
  emis: '800048',
  location: 'Awaimunga Village, Ocini Parish, Kamdini Sub-county, Oyam District, Uganda',
  phone_pd: '0782053937',
  phone_ht: '0774996507',
  phone_deputy: '0777297321',
  phone_nursery_ht: '0775723204',
  phone_bursar: '0773782383',
  bank_name: 'Opportunity Bank, Kamdini branch',
  bank_account: '120396591117',
  bank_account_name: 'Olive Nursery and Primary School - Atapara',
  email: 'olivepri21@gmail.com',
  enrolment: { boys: 179, girls: 188, total: 367 },
  year: 2026
});
db.prepare("UPDATE site_settings SET value = ?, updated_at = ? WHERE key = 'school_info'").run(schoolInfo, new Date().toISOString());

console.log('Site settings updated in database.');
