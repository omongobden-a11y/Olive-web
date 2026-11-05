const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { db, hashPassword, verifyPassword } = require('../db');
const {
  createSessionToken,
  authenticateToken,
  requireRoles,
  logAudit,
  generateMfaSecret,
  generateTOTP,
  verifyTOTP
} = require('../auth');
const {
  getClientIp,
  checkLoginLockout,
  recordLoginFailure,
  clearLoginFailures,
  checkResetRateLimit
} = require('../security');

// POST /api/auth/login - Protected by intelligent anti-brute-force lockout
router.post('/login', checkLoginLockout, (req, res) => {
  const { email, phone, identifier, password, mfaCode } = req.body;
  const loginId = (email || phone || identifier || '').trim();
  const clientIp = getClientIp(req);

  if (!loginId || !password) {
    return res.status(400).json({ error: 'Email, phone number, or student ID and password are required' });
  }

  const cleanId = loginId.toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ? OR phone = ? OR id = ?;').get(cleanId, loginId.trim(), loginId.trim());

  if (!user) {
    recordLoginFailure(loginId, clientIp, req);
    logAudit(req, 'Failed login attempt', `Failed login for non-existent identifier: ${loginId}`);
    return res.status(401).json({ error: 'Invalid login credentials' });
  }

  if (user.status !== 'Active') {
    return res.status(403).json({ error: 'Account is inactive. Please contact the administrator.' });
  }

  const isMatch = verifyPassword(password, user.password_hash, user.salt);
  if (!isMatch) {
    recordLoginFailure(loginId, clientIp, req);
    logAudit(req, 'Failed login attempt', `Failed login password mismatch for: ${loginId}`);
    return res.status(401).json({ error: 'Invalid login credentials' });
  }

  // Clear any accumulated failed login attempts on successful password verification
  clearLoginFailures(loginId, clientIp);

  // Check MFA
  if (user.mfa_enabled) {
    // If mfaCode is provided in the same request
    if (mfaCode) {
      const isValidMfa = verifyTOTP(mfaCode, user.mfa_secret);
      // Also check backup codes
      let usedBackupCode = false;
      if (!isValidMfa && user.mfa_backup_codes) {
        try {
          const codes = JSON.parse(user.mfa_backup_codes);
          const codeIdx = codes.indexOf(mfaCode.trim());
          if (codeIdx !== -1) {
            codes.splice(codeIdx, 1);
            db.prepare('UPDATE users SET mfa_backup_codes = ? WHERE id = ?;').run(JSON.stringify(codes), user.id);
            usedBackupCode = true;
          }
        } catch (e) {}
      }

      if (!isValidMfa && !usedBackupCode) {
        return res.status(401).json({ error: 'Invalid 6-digit MFA verification code' });
      }

      // MFA successfully verified
      const token = createSessionToken(user, true);
      db.prepare('UPDATE users SET last_login = ? WHERE id = ?;').run(new Date().toISOString(), user.id);
      logAudit(req, 'User login (MFA verified)', `User ${user.email} logged in with role ${user.role}`);

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone || '',
          name: user.full_name,
          role: user.role,
          mfaEnabled: true
        }
      });
    }

    // MFA is required but code was not provided yet
    const tempToken = createSessionToken(user, false);
    return res.json({
      mfaRequired: true,
      tempToken,
      message: 'Enter the 6-digit verification code from your authenticator app'
    });
  }

  // MFA not enabled on account
  const token = createSessionToken(user, true);
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?;').run(new Date().toISOString(), user.id);
  logAudit(req, 'User login', `User ${user.email} logged in with role ${user.role}`);

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone || '',
      name: user.full_name,
      role: user.role,
      mfaEnabled: false
    }
  });
});

// POST /api/auth/mfa/verify-login
router.post('/mfa/verify-login', (req, res) => {
  const { tempToken, mfaCode } = req.body;
  if (!tempToken || !mfaCode) {
    return res.status(400).json({ error: 'Temporary token and MFA code are required' });
  }

  const { verifySessionToken } = require('../auth');
  const decoded = verifySessionToken(tempToken);
  if (!decoded || !decoded.sub) {
    return res.status(401).json({ error: 'Temporary login session expired. Please log in again.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?;').get(decoded.sub);
  if (!user || user.status !== 'Active') {
    return res.status(401).json({ error: 'User account not available' });
  }

  const isValidMfa = verifyTOTP(mfaCode, user.mfa_secret);
  let usedBackupCode = false;
  if (!isValidMfa && user.mfa_backup_codes) {
    try {
      const codes = JSON.parse(user.mfa_backup_codes);
      const codeIdx = codes.indexOf(mfaCode.trim());
      if (codeIdx !== -1) {
        codes.splice(codeIdx, 1);
        db.prepare('UPDATE users SET mfa_backup_codes = ? WHERE id = ?;').run(JSON.stringify(codes), user.id);
        usedBackupCode = true;
      }
    } catch (e) {}
  }

  if (!isValidMfa && !usedBackupCode) {
    return res.status(401).json({ error: 'Invalid 6-digit MFA verification code' });
  }

  const token = createSessionToken(user, true);
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?;').run(new Date().toISOString(), user.id);
  logAudit(req, 'User login (MFA complete)', `User ${user.email} verified MFA`);

  res.json({
    message: 'MFA verified successfully',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      mfaEnabled: true
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, email, phone, full_name, role, status, mfa_enabled, last_login, created_at FROM users WHERE id = ?;').get(req.user.sub);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone || '',
      name: user.full_name,
      role: user.role,
      status: user.status,
      mfaEnabled: Boolean(user.mfa_enabled),
      lastLogin: user.last_login,
      createdAt: user.created_at
    }
  });
});

// POST /api/auth/mfa/setup
router.post('/mfa/setup', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?;').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = generateMfaSecret();
  // Store secret temporarily until verified
  db.prepare('UPDATE users SET mfa_secret = ? WHERE id = ?;').run(secret, user.id);

  // Construct standard OTPAuth URL
  const issuer = encodeURIComponent('Olive Nursery & Primary School - Atapara');
  const account = encodeURIComponent(user.email);
  const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

  res.json({
    secret,
    otpauthUrl,
    message: 'Scan the QR code or enter the key in Google Authenticator or Microsoft Authenticator, then enter the 6-digit code to activate.'
  });
});

// POST /api/auth/mfa/enable
router.post('/mfa/enable', authenticateToken, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Verification code is required' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?;').get(req.user.sub);
  if (!user || !user.mfa_secret) {
    return res.status(400).json({ error: 'Please initiate MFA setup first' });
  }

  const isValid = verifyTOTP(code, user.mfa_secret);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your authenticator clock.' });
  }

  // Generate 5 emergency backup recovery codes
  const backupCodes = Array.from({ length: 5 }, () => crypto.randomBytes(4).toString('hex').toUpperCase());

  db.prepare('UPDATE users SET mfa_enabled = 1, mfa_backup_codes = ? WHERE id = ?;').run(
    JSON.stringify(backupCodes),
    user.id
  );

  logAudit(req, 'MFA enabled', `User ${user.email} enabled Multi-Factor Authentication`);

  res.json({
    message: 'Multi-Factor Authentication enabled successfully',
    backupCodes
  });
});

// POST /api/auth/mfa/disable
router.post('/mfa/disable', authenticateToken, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password confirmation is required to disable MFA' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?;').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isMatch = verifyPassword(password, user.password_hash, user.salt);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  db.prepare('UPDATE users SET mfa_enabled = 0, mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = ?;').run(user.id);
  logAudit(req, 'MFA disabled', `User ${user.email} disabled Multi-Factor Authentication`);

  res.json({ message: 'Multi-Factor Authentication disabled successfully' });
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?;').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isMatch = verifyPassword(currentPassword, user.password_hash, user.salt);
  if (!isMatch) {
    return res.status(401).json({ error: 'Current password does not match' });
  }

  const { hash, salt } = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?;').run(hash, salt, user.id);
  logAudit(req, 'Password changed', `User ${user.email} updated account password`);

  res.json({ message: 'Password updated successfully' });
});

// POST /api/auth/register - Allow Parents / Normal Users to register
router.post('/register', (req, res) => {
  const { full_name, email, phone, password } = req.body;
  if (!full_name || !password || (!email && !phone)) {
    return res.status(400).json({ error: 'Full name, password, and at least an email or phone number are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : null;
  const cleanPhone = phone && phone.trim() ? phone.trim() : null;

  if (cleanEmail) {
    const existingEmail = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?;').get(cleanEmail);
    if (existingEmail) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }
  }

  if (cleanPhone) {
    const existingPhone = db.prepare('SELECT id FROM users WHERE phone = ?;').get(cleanPhone);
    if (existingPhone) {
      return res.status(400).json({ error: 'An account with this phone number already exists.' });
    }
  }

  const userId = crypto.randomUUID();
  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();
  const assignedEmail = cleanEmail || `${cleanPhone}@oliveatapara.parent`;

  db.prepare(`
    INSERT INTO users (id, email, phone, password_hash, salt, full_name, role, status, mfa_enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'Parent', 'Active', 0, ?);
  `).run(userId, assignedEmail, cleanPhone, hash, salt, full_name.trim(), now);

  const newUser = {
    id: userId,
    email: assignedEmail,
    phone: cleanPhone,
    full_name: full_name.trim(),
    role: 'Parent'
  };

  const token = createSessionToken(newUser, true);
  logAudit(req, 'User Registration', `Registered parent account: ${full_name.trim()} (${cleanPhone || assignedEmail})`);

  res.status(201).json({
    message: 'Registration successful! You are now logged in.',
    token,
    user: {
      id: userId,
      email: assignedEmail,
      phone: cleanPhone,
      name: full_name.trim(),
      role: 'Parent'
    }
  });
});

// POST /api/auth/forgot-password - Generate 6-digit recovery code (Rate Limited)
router.post('/forgot-password', checkResetRateLimit, (req, res) => {
  const { identifier } = req.body;
  if (!identifier || !identifier.trim()) {
    return res.status(400).json({ error: 'Please enter your registered phone number or email address' });
  }

  const clean = identifier.trim();
  const user = db.prepare('SELECT id, email, phone, full_name FROM users WHERE LOWER(email) = ? OR phone = ?;').get(clean.toLowerCase(), clean);

  if (!user) {
    return res.status(404).json({ error: 'No registered account found with that phone number or email address.' });
  }

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry
  const now = new Date().toISOString();

  // Invalidate any existing unused codes for this identifier
  db.prepare('UPDATE password_resets SET used = 1 WHERE identifier = ? AND used = 0;').run(clean);

  db.prepare(`
    INSERT INTO password_resets (id, identifier, code, expires_at, used, created_at)
    VALUES (?, ?, ?, ?, 0, ?);
  `).run(crypto.randomUUID(), clean, code, expiresAt, now);

  logAudit(req, 'Password Reset Code Generated', `Generated recovery code for user: ${user.email} (${clean})`);

  res.json({
    message: `A 6-digit verification code has been generated for ${clean}.`,
    code,
    identifier: clean,
    expiresInMinutes: 15
  });
});

// POST /api/auth/reset-password - Verify 6-digit code and set new password
router.post('/reset-password', (req, res) => {
  const { identifier, code, newPassword } = req.body;
  if (!identifier || !code || !newPassword) {
    return res.status(400).json({ error: 'Phone/email, 6-digit verification code, and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  const clean = identifier.trim();
  const cleanCode = code.trim();
  const now = new Date().toISOString();

  const resetRecord = db.prepare(`
    SELECT * FROM password_resets
    WHERE identifier = ? AND code = ? AND used = 0 AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1;
  `).get(clean, cleanCode, now);

  if (!resetRecord) {
    return res.status(400).json({ error: 'Invalid or expired 6-digit verification code. Please request a new code.' });
  }

  const user = db.prepare('SELECT id, email, full_name FROM users WHERE LOWER(email) = ? OR phone = ?;').get(clean.toLowerCase(), clean);
  if (!user) {
    return res.status(404).json({ error: 'User account not found' });
  }

  const { hash, salt } = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?;').run(hash, salt, user.id);
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?;').run(resetRecord.id);

  logAudit(req, 'Password Reset Completed', `Password successfully recovered for user: ${user.email}`);

  res.json({ message: 'Your password has been reset successfully! You can now log in.' });
});

// GET /api/auth/account-directory - Public reference of all official school accounts & roles
router.get('/account-directory', (req, res) => {
  const users = db.prepare(`
    SELECT id, email, phone, full_name, role, status
    FROM users
    WHERE status = 'Active'
    ORDER BY role ASC, full_name ASC;
  `).all();

  const categorized = {
    leadership: [],
    admissions: [],
    accounts: [],
    academics: [],
    welfare: [],
    support: [],
    parents: [],
    students: []
  };

  for (const u of users) {
    const item = {
      id: u.id,
      name: u.full_name,
      role: u.role,
      email: u.email,
      phone: u.phone || ''
    };

    if (u.role === 'Administrator') {
      categorized.leadership.push(item);
    } else if (u.role === 'Admissions Officer') {
      categorized.admissions.push(item);
    } else if (u.role === 'Accounts Officer') {
      categorized.accounts.push(item);
    } else if (u.role === 'Teacher') {
      categorized.academics.push(item);
    } else if (u.role === 'Content Editor') {
      categorized.leadership.push(item);
    } else if (u.role === 'Welfare Officer') {
      categorized.welfare.push(item);
    } else if (u.role === 'Support Staff') {
      categorized.support.push(item);
    } else if (u.role === 'Parent') {
      categorized.parents.push(item);
    } else if (u.role === 'Student') {
      categorized.students.push(item);
    }
  }

  res.json({
    totalAccounts: users.length,
    rolesCount: Object.keys(categorized).length,
    directory: categorized
  });
});

// GET /api/auth/parent/portal-data - Dedicated Parent Portal Dashboard Data
router.get('/parent/portal-data', authenticateToken, requireRoles(['Parent', 'Administrator']), (req, res) => {
  const user = db.prepare('SELECT id, email, phone, full_name, role FROM users WHERE id = ?;').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const phone = user.phone || '';
  const email = (user.email || '').toLowerCase();

  // Find children admission applications
  const applications = db.prepare(`
    SELECT * FROM admissions_applications
    WHERE LOWER(guardian_email) = ? OR guardian_phone = ? OR guardian_name LIKE ?
    ORDER BY created_at DESC;
  `).all(email, phone, `%${user.full_name.split(' ')[0]}%`);

  // Find fee remittance receipts
  const transactions = db.prepare(`
    SELECT * FROM transactions
    WHERE phone_number = ? OR receipt_data LIKE ?
    ORDER BY payment_date DESC;
  `).all(phone, `%${phone}%`);

  // Fee structures
  const fees = db.prepare('SELECT * FROM fee_structures ORDER BY day_fees_ugx ASC;').all();

  // Term dates
  const termDates = db.prepare('SELECT * FROM term_dates ORDER BY display_order ASC;').all();

  // Alert banner
  const bannerSetting = db.prepare('SELECT value FROM site_settings WHERE key = "alert_banner";').get();
  const alertBanner = bannerSetting ? JSON.parse(bannerSetting.value) : null;

  res.json({
    parent: {
      id: user.id,
      name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      role: user.role
    },
    applications,
    transactions,
    fees,
    termDates,
    alertBanner
  });
});

// GET /api/auth/student/portal-data - Dedicated Student Portal Data
router.get('/student/portal-data', authenticateToken, requireRoles(['Student', 'Administrator']), (req, res) => {
  const user = db.prepare('SELECT id, email, phone, full_name, role FROM users WHERE id = ?;').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Term dates
  const termDates = db.prepare('SELECT * FROM term_dates ORDER BY display_order ASC;').all();

  // Events & Examinations
  const events = db.prepare('SELECT * FROM events WHERE is_published = 1 ORDER BY date_str ASC;').all();

  // Notices
  const notices = db.prepare('SELECT * FROM notices WHERE is_active = 1 ORDER BY priority ASC;').all();

  // School alert banner
  const bannerSetting = db.prepare('SELECT value FROM site_settings WHERE key = "alert_banner";').get();
  const alertBanner = bannerSetting ? JSON.parse(bannerSetting.value) : null;

  // Determine candidate status
  const isCandidate = user.full_name.includes('P.7') || user.email.includes('joshua');

  res.json({
    student: {
      id: user.id,
      name: user.full_name,
      studentId: user.phone || user.email.split('@')[0],
      email: user.email,
      isCandidate
    },
    termDates,
    events,
    notices,
    alertBanner,
    candidateSchedule: isCandidate ? [
      { subject: 'Mathematics', date: '2026-11-04 09:00', duration: '2 hours 30 mins' },
      { subject: 'Social Studies & R.E.', date: '2026-11-04 14:00', duration: '2 hours 15 mins' },
      { subject: 'Integrated Science', date: '2026-11-05 09:00', duration: '2 hours 15 mins' },
      { subject: 'English Language', date: '2026-11-05 14:00', duration: '2 hours 15 mins' }
    ] : null
  });
});

module.exports = router;
