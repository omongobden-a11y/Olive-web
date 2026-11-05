const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireRoles, logAudit } = require('../auth');

// GET /api/backup/export - One-click JSON backup export (Administrator only)
router.get('/export', authenticateToken, requireRoles(['Administrator']), (req, res) => {
  try {
    const backup = {
      exportedAt: new Date().toISOString(),
      school: 'Olive Nursery and Primary School - Atapara',
      systemVersion: '1.0.0',
      tables: {
        site_settings: db.prepare('SELECT * FROM site_settings;').all(),
        notices: db.prepare('SELECT * FROM notices;').all(),
        events: db.prepare('SELECT * FROM events;').all(),
        term_dates: db.prepare('SELECT * FROM term_dates;').all(),
        news: db.prepare('SELECT * FROM news;').all(),
        staff_members: db.prepare('SELECT * FROM staff_members;').all(),
        fee_structures: db.prepare('SELECT * FROM fee_structures;').all(),
        admission_requirements: db.prepare('SELECT * FROM admission_requirements;').all(),
        admissions_applications: db.prepare('SELECT * FROM admissions_applications;').all(),
        enquiries: db.prepare('SELECT * FROM enquiries;').all(),
        transactions: db.prepare('SELECT * FROM transactions;').all(),
        users: db.prepare('SELECT id, email, full_name, role, status, mfa_enabled, created_at FROM users;').all()
      }
    };

    logAudit(req, 'System Backup Export', 'Full system database exported as JSON');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="olive-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    console.error('Error generating backup:', err);
    res.status(500).json({ error: 'Failed to generate system backup.' });
  }
});

// POST /api/backup/restore - Restore system data from JSON backup (Administrator only)
router.post('/restore', authenticateToken, requireRoles(['Administrator']), (req, res) => {
  const { backupData } = req.body;
  if (!backupData || !backupData.tables) {
    return res.status(400).json({ error: 'Valid backup payload with tables is required.' });
  }

  try {
    const tables = backupData.tables;

    // Restore notices if present
    if (Array.isArray(tables.notices)) {
      db.exec('DELETE FROM notices;');
      const stmt = db.prepare('INSERT INTO notices (id, text, is_active, priority, created_at) VALUES (?, ?, ?, ?, ?);');
      for (const n of tables.notices) {
        stmt.run(n.id, n.text, n.is_active, n.priority, n.created_at);
      }
    }

    // Restore events if present
    if (Array.isArray(tables.events)) {
      db.exec('DELETE FROM events;');
      const stmt = db.prepare('INSERT INTO events (id, date_str, title, details, category, is_published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);');
      for (const e of tables.events) {
        stmt.run(e.id, e.date_str, e.title, e.details, e.category, e.is_published, e.created_at);
      }
    }

    // Restore news if present
    if (Array.isArray(tables.news)) {
      db.exec('DELETE FROM news;');
      const stmt = db.prepare('INSERT INTO news (id, date_str, title, excerpt, content, image_slug, is_published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);');
      for (const nw of tables.news) {
        stmt.run(nw.id, nw.date_str, nw.title, nw.excerpt, nw.content, nw.image_slug, nw.is_published, nw.created_at);
      }
    }

    logAudit(req, 'System Restore', `System restored from backup generated at ${backupData.exportedAt || 'unknown'}`);
    res.json({ message: 'System state restored successfully from backup.' });
  } catch (err) {
    console.error('Error restoring system backup:', err);
    res.status(500).json({ error: 'Failed to restore database from backup.' });
  }
});

module.exports = router;
