const crypto = require('node:crypto');
const { db } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'olive-atapara-secret-key-2027-uganda-education';

// Base32 decoding for TOTP
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(str) {
  str = str.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const output = [];
  for (let i = 0; i < str.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(str[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

// RFC 6238 TOTP generation & verification
function generateTOTP(secretBase32, timeStepSeconds = 30) {
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / timeStepSeconds);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(timeStep));

  const key = base32Decode(secretBase32);
  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, '0');
  return otp;
}

function verifyTOTP(token, secretBase32) {
  if (!token || !secretBase32) return false;
  const cleanToken = token.trim();
  // Check current window and previous window (clock drift tolerance)
  const epoch = Math.floor(Date.now() / 1000);
  for (const delta of [-1, 0, 1]) {
    const timeStep = Math.floor((epoch + delta * 30) / 30);
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(timeStep));
    const key = base32Decode(secretBase32);
    const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    const otp = (binary % 1000000).toString().padStart(6, '0');
    if (otp === cleanToken) return true;
  }
  return false;
}

function generateMfaSecret() {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

// Token creation using HMAC SHA256 (Self-contained, fast, secure)
function createSessionToken(user, isMfaVerified = false) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.full_name,
    mfaVerified: isMfaVerified,
    mfaRequired: Boolean(user.mfa_enabled),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (isMfaVerified ? 86400 : 900) // 24h if verified, 15m if pending MFA
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  const expectedSig = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return data;
  } catch (e) {
    return null;
  }
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.olive_auth_token) {
    token = req.cookies.olive_auth_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifySessionToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // If user has MFA enabled but hasn't verified secondary step
  if (decoded.mfaRequired && !decoded.mfaVerified && !req.path.startsWith('/mfa')) {
    return res.status(403).json({ error: 'MFA verification required', mfaPending: true });
  }

  req.user = decoded;
  next();
}

// Role-Based Access Control (RBAC) Guard
function requireRoles(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }
    
    // Administrator has universal permission
    if (req.user.role === 'Administrator') {
      return next();
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    try {
      logAudit(req, 'SECURITY: Unauthorized Access Blocked', `User ${req.user.email} (Role: ${req.user.role}) attempted to access restricted route: ${req.method} ${req.originalUrl || req.path}. Allowed roles: ${allowedRoles.join(', ')}`);
    } catch (e) {}

    return res.status(403).json({
      error: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`
    });
  };
}

// Log audit action helper
function logAudit(req, action, details = '') {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_email, user_name, action, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `);
    const userEmail = req && req.user ? req.user.email : 'system';
    const userName = req && req.user ? req.user.name : 'System';
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
    stmt.run(crypto.randomUUID(), new Date().toISOString(), userEmail, userName, action, details, String(ip));
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }
}

module.exports = {
  createSessionToken,
  verifySessionToken,
  authenticateToken,
  requireRoles,
  logAudit,
  generateMfaSecret,
  generateTOTP,
  verifyTOTP
};
