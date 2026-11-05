const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { db, hashPassword } = require('../db');
const { authenticateToken, requireRoles, logAudit } = require('../auth');

// GET /api/users - List all staff users (Administrator only)
router.get('/', authenticateToken, requireRoles(['Administrator']), (req, res) => {
  const users = db.prepare(`
    SELECT id, email, phone, full_name, role, status, mfa_enabled, last_login, created_at
    FROM users
    ORDER BY created_at ASC;
  `).all();
  res.json(users);
});

// POST /api/users - Create new staff account (Administrator only)
router.post('/', authenticateToken, requireRoles(['Administrator']), (req, res) => {
  const { email, phone, password, full_name, role, status } = req.body;
  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'Email, password, full name, and role are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?;').get(cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'A user with this email address already exists.' });
  }

  const validRoles = [
    'Administrator',
    'Admissions Officer',
    'Accounts Officer',
    'Content Editor',
    'Teacher',
    'Welfare Officer',
    'Support Staff',
    'Parent',
    'Student'
  ];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  const id = crypto.randomUUID();
  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, phone, password_hash, salt, full_name, role, status, mfa_enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?);
  `).run(id, cleanEmail, phone ? phone.trim() : null, hash, salt, full_name.trim(), role, status || 'Active', now);

  logAudit(req, 'Create User', `Created account: ${cleanEmail} with role: ${role}`);
  res.status(201).json({ message: 'User account created successfully', id });
});

// PUT /api/users/:id - Update user details or role (Administrator only)
router.put('/:id', authenticateToken, requireRoles(['Administrator']), (req, res) => {
  const { full_name, phone, role, status, new_password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?;').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let updateQuery = 'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), role = COALESCE(?, role), status = COALESCE(?, status)';
  const params = [full_name || null, phone || null, role || null, status || null];

  if (new_password && new_password.trim().length >= 6) {
    const { hash, salt } = hashPassword(new_password.trim());
    updateQuery += ', password_hash = ?, salt = ?';
    params.push(hash, salt);
  }

  updateQuery += ' WHERE id = ?;';
  params.push(req.params.id);

  db.prepare(updateQuery).run(...params);
  logAudit(req, 'Update User', `Updated user: ${user.email} (role: ${role || user.role}, status: ${status || user.status})`);
  res.json({ message: 'User updated successfully' });
});

// DELETE /api/users/:id - Remove user account (Administrator only)
router.delete('/:id', authenticateToken, requireRoles(['Administrator']), (req, res) => {
  // Prevent deleting oneself
  if (req.user.sub === req.params.id) {
    return res.status(400).json({ error: 'You cannot delete your own administrator account.' });
  }

  const user = db.prepare('SELECT email FROM users WHERE id = ?;').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare('DELETE FROM users WHERE id = ?;').run(req.params.id);
  logAudit(req, 'Delete User', `Deleted staff account: ${user.email}`);
  res.json({ message: 'User account removed' });
});

module.exports = router;
