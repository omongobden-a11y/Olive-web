const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { db } = require('../db');
const { authenticateToken, requireRoles, logAudit } = require('../auth');

// POST /api/enquiries - Public inquiry submission with contextual departmental routing
router.post('/', (req, res) => {
  const { name, phone, email, department, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ error: 'Name and message are required' });
  }

  const validDepts = ['Admissions', 'Sports', 'Accounts', 'Administration'];
  const assignedDept = validDepts.includes(department) ? department : 'Administration';

  const id = crypto.randomUUID();
  const year = new Date().getFullYear();
  const ticketNumber = `TKT-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO enquiries (id, ticket_number, name, phone, email, department, message, status, response_notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'New', '', ?, ?);
  `);

  stmt.run(
    id,
    ticketNumber,
    name.trim(),
    phone ? phone.trim() : '',
    email ? email.trim() : '',
    assignedDept,
    message.trim(),
    now,
    now
  );

  logAudit(null, 'Submit Enquiry', `Public inquiry [${ticketNumber}] routed to ${assignedDept} from ${name}`);

  res.status(201).json({
    success: true,
    ticketNumber,
    message: `Thank you, ${name}. Your message has been routed to the ${assignedDept} Department. We will respond within two school days.`
  });
});

// GET /api/enquiries - Protected for Staff
router.get('/', authenticateToken, (req, res) => {
  const { department, status } = req.query;
  let query = 'SELECT * FROM enquiries WHERE 1=1';
  const params = [];

  if (department && department !== 'all') {
    query += ' AND department = ?';
    params.push(department);
  }
  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC;';
  const enquiries = db.prepare(query).all(...params);
  res.json(enquiries);
});

// PUT /api/enquiries/:id - Update status and notes
router.put('/:id', authenticateToken, (req, res) => {
  const { status, response_notes } = req.body;
  const validStatuses = ['New', 'Contacted', 'In Progress', 'Closed'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const enq = db.prepare('SELECT * FROM enquiries WHERE id = ?;').get(req.params.id);
  if (!enq) return res.status(404).json({ error: 'Enquiry not found' });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE enquiries
    SET status = COALESCE(?, status),
        response_notes = COALESCE(?, response_notes),
        updated_at = ?
    WHERE id = ?;
  `).run(status || null, response_notes != null ? response_notes : null, now, req.params.id);

  logAudit(req, 'Update Enquiry', `Updated enquiry ${enq.ticket_number} status to ${status || enq.status}`);
  res.json({ message: 'Enquiry updated successfully' });
});

// DELETE /api/enquiries/:id
router.delete('/:id', authenticateToken, requireRoles(['Administrator']), (req, res) => {
  const enq = db.prepare('SELECT * FROM enquiries WHERE id = ?;').get(req.params.id);
  if (!enq) return res.status(404).json({ error: 'Enquiry not found' });

  db.prepare('DELETE FROM enquiries WHERE id = ?;').run(req.params.id);
  logAudit(req, 'Delete Enquiry', `Deleted enquiry ${enq.ticket_number}`);
  res.json({ message: 'Enquiry deleted successfully' });
});

// GET /api/enquiries/export/csv
router.get('/export/csv', authenticateToken, (req, res) => {
  const rows = db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC;').all();
  const headers = ['Ticket Number', 'Name', 'Phone', 'Email', 'Department', 'Message', 'Status', 'Response Notes', 'Date'];
  
  const csvLines = [headers.join(',')];
  for (const r of rows) {
    const line = [
      `"${r.ticket_number || ''}"`,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${r.phone || ''}"`,
      `"${r.email || ''}"`,
      `"${r.department || ''}"`,
      `"${(r.message || '').replace(/"/g, '""')}"`,
      `"${r.status || ''}"`,
      `"${(r.response_notes || '').replace(/"/g, '""')}"`,
      `"${r.created_at ? r.created_at.slice(0, 10) : ''}"`
    ];
    csvLines.push(line.join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="olive-enquiries-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csvLines.join('\n'));
});

module.exports = router;
