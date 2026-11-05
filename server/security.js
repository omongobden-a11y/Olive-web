// ==========================================================================
// Olive Nursery and Primary School - Atapara
// Comprehensive Security & Brute-Force Defense Architecture
// ==========================================================================

const { logAudit } = require('./auth');

// In-memory sliding window failure tracking
// Map: key -> { count: number, firstAttempt: number, lockedUntil: number }
const loginFailures = new Map();
const resetFailures = new Map();
const generalIpTracker = new Map();

// Configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const FAILURE_WINDOW_MS = 15 * 60 * 1000;   // 15 minutes window
const MAX_REQUESTS_PER_MINUTE = 200;        // IP rate limit

// Helper to extract client IP address
function getClientIp(req) {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket ? req.socket.remoteAddress || '127.0.0.1' : '127.0.0.1';
}

// 1. General IP Request Rate Limiter (Protects against DoS / scraping)
function generalRateLimiter(req, res, next) {
  // Exclude static assets (.css, .js, .webp, .jpg, .png, .pdf, .svg)
  if (/\.(css|js|webp|jpg|jpeg|png|svg|ico|pdf|woff2?)$/i.test(req.path)) {
    return next();
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const entry = generalIpTracker.get(ip) || { count: 0, resetTime: now + 60000 };

  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + 60000;
  } else {
    entry.count++;
  }
  generalIpTracker.set(ip, entry);

  if (entry.count > MAX_REQUESTS_PER_MINUTE) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please wait a minute before sending more requests.',
      retryAfterSeconds: Math.ceil((entry.resetTime - now) / 1000)
    });
  }

  next();
}

// 2. Check if an account or IP is currently locked out
function checkLoginLockout(req, res, next) {
  const { email, phone, identifier } = req.body || {};
  const id = (email || phone || identifier || '').trim().toLowerCase();
  const ip = getClientIp(req);
  const now = Date.now();

  const keys = [id ? `user:${id}` : null, `ip:${ip}`].filter(Boolean);

  for (const key of keys) {
    const record = loginFailures.get(key);
    if (record && record.lockedUntil && now < record.lockedUntil) {
      const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      try {
        logAudit(req, 'SECURITY_ALERT: Lockout Active', `Blocked login attempt for locked account/IP: ${key} (${remainingMinutes}m remaining)`);
      } catch (e) {}

      return res.status(429).json({
        error: 'Account Temporarily Locked',
        message: `Maximum failed login attempts exceeded. Account is locked for security. Please try again in ${remainingMinutes} minute(s).`,
        locked: true,
        remainingMinutes
      });
    }
  }

  next();
}

// 3. Record a failed login attempt
function recordLoginFailure(identifier, ip, req = null) {
  const now = Date.now();
  const id = (identifier || '').trim().toLowerCase();
  const keys = [id ? `user:${id}` : null, `ip:${ip}`].filter(Boolean);

  for (const key of keys) {
    let record = loginFailures.get(key);
    if (!record || (now - record.firstAttempt > FAILURE_WINDOW_MS)) {
      record = { count: 1, firstAttempt: now, lockedUntil: 0 };
    } else {
      record.count++;
    }

    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      if (req) {
        logAudit(req, 'SECURITY_ALERT: Account Locked', `Account/IP ${key} locked for 15 minutes due to ${record.count} consecutive failed attempts.`);
      }
    }

    loginFailures.set(key, record);
  }
}

// 4. Clear failures upon successful authentication
function clearLoginFailures(identifier, ip) {
  const id = (identifier || '').trim().toLowerCase();
  if (id) loginFailures.delete(`user:${id}`);
  if (ip) loginFailures.delete(`ip:${ip}`);
}

// 5. Password Reset Request Rate Limiter (Max 3 per hour)
function checkResetRateLimit(req, res, next) {
  const { identifier } = req.body || {};
  if (!identifier) return next();

  const clean = identifier.trim().toLowerCase();
  const now = Date.now();
  const record = resetFailures.get(clean) || { count: 0, resetTime: now + 3600000 };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + 3600000;
  } else {
    record.count++;
  }
  resetFailures.set(clean, record);

  if (record.count > 4) {
    return res.status(429).json({
      error: 'Password reset limit reached',
      message: 'Too many recovery requests for this account. Please wait before trying again or contact the administrator.'
    });
  }

  next();
}

// 6. Basic Input Sanitization (strips script injection and normalizes)
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}

module.exports = {
  getClientIp,
  generalRateLimiter,
  checkLoginLockout,
  recordLoginFailure,
  clearLoginFailures,
  checkResetRateLimit,
  sanitizeString,
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MS
};
