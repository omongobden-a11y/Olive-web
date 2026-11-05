const express = require('express');
const path = require('node:path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Initialize database
require('./db');

const { generalRateLimiter } = require('./security');

const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const admissionsRoutes = require('./routes/admissions');
const enquiriesRoutes = require('./routes/enquiries');
const transactionsRoutes = require('./routes/transactions');
const usersRoutes = require('./routes/users');
const auditRoutes = require('./routes/audit');
const backupRoutes = require('./routes/backup');
const calendarRoutes = require('./routes/calendar');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware (Helmet with CSP relaxed for Google Fonts & inline SVGs)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Compression middleware for high-speed delivery on mobile / 3G / 4G
app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// CORS & Parsing
app.use(cors());
app.use(generalRateLimiter);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static Assets with Cache-Control headers
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR, {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : '0',
  etag: true,
  lastModified: true
}));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admissions', admissionsRoutes);
app.use('/api/enquiries', enquiriesRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/calendar', calendarRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    school: 'Olive Nursery and Primary School - Atapara',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version
  });
});

// Admin CMS route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

// Parent Portal (SPA served by index.html with client-side routing)
app.get('/portal', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Student Portal (SPA served by index.html with client-side routing)
app.get('/student', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Single Page Application fallback (Express 5 compatible)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`Olive Nursery & Primary School - Atapara Server Running`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Admin Portal: http://localhost:${PORT}/admin`);
    console.log(`API Health: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
