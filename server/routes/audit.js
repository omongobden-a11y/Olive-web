const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { authenticateToken, requireRoles } = require('../auth');

// GET /api/audit - Searchable activity audit log (Administrator only)
router.get('/', authenticateToken, requireRoles(['Administrator']), (req, res) => {
  const { search, limit } = req.query;
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (user_email LIKE ? OR action LIKE ? OR details LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  const maxRows = limit ? parseInt(limit, 10) : 100;
  query += ' ORDER BY timestamp DESC LIMIT ?;';
  params.push(maxRows);

  const logs = db.prepare(query).all(...params);
  res.json(logs);
});

module.exports = router;
