const express = require('express');
const router = express.Router();
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const { db } = require('../db');
const { authenticateToken, requireRoles, logAudit } = require('../auth');

// Multer storage for Gallery Photo Uploads
const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'images', 'gallery');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unique = `photo_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
    cb(null, unique);
  }
});
const uploadPhoto = multer({
  storage: galleryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// GET /api/content/all - Single high-speed cached JSON endpoint for the client SPA
router.get('/all', (req, res) => {
  try {
    const notices = db.prepare('SELECT id, text FROM notices WHERE is_active = 1 ORDER BY priority ASC, created_at DESC;').all();
    const events = db.prepare('SELECT id, date_str as d, title as t, details as p, category as c FROM events WHERE is_published = 1 ORDER BY date_str ASC;').all();
    const news = db.prepare('SELECT id, date_str as d, title as t, excerpt, content as p, image_slug as img FROM news WHERE is_published = 1 ORDER BY created_at DESC;').all();
    const terms = db.prepare('SELECT term_name as t, opens_date as o, closes_date as c, school_days as d, academic_year as y FROM term_dates ORDER BY display_order ASC;').all();
    const staff = db.prepare('SELECT id, name as n, role as r, initials as i, category as cat, image_slug as img, contact FROM staff_members ORDER BY display_order ASC;').all();
    const fees = db.prepare('SELECT id, class_category as c, day_fees_ugx, boarding_fees_ugx, uniform_ugx, meals_ugx, scholastic_ugx, notes FROM fee_structures;').all();
    const reqs = db.prepare('SELECT id, requirement_text as t FROM admission_requirements ORDER BY display_order ASC;').all();
    
    // Settings & alert banner
    const alertRow = db.prepare('SELECT value FROM site_settings WHERE key = ?;').get('alert_banner');
    const alert = alertRow ? JSON.parse(alertRow.value) : { enabled: false, type: 'info', message: '' };

    const schoolInfoRow = db.prepare('SELECT value FROM site_settings WHERE key = ?;').get('school_info');
    const schoolInfo = schoolInfoRow ? JSON.parse(schoolInfoRow.value) : null;

    // Load gallery index
    let gallery = [];
    const galleryJsonPath = path.join(__dirname, '..', '..', 'public', 'data', 'gallery.json');
    if (fs.existsSync(galleryJsonPath)) {
      try {
        gallery = JSON.parse(fs.readFileSync(galleryJsonPath, 'utf8'));
      } catch (e) {}
    }

    res.json({
      notices,
      events,
      news,
      terms,
      staff,
      fees,
      reqs,
      alert,
      schoolInfo,
      galleryCount: gallery.length
    });
  } catch (err) {
    console.error('Error fetching site content:', err);
    res.status(500).json({ error: 'Failed to load site content' });
  }
});

// GET /api/content/events
router.get('/events', (req, res) => {
  const { category } = req.query;
  let rows;
  if (category && category !== 'all') {
    rows = db.prepare('SELECT * FROM events WHERE is_published = 1 AND category = ? ORDER BY date_str ASC;').all(category);
  } else {
    rows = db.prepare('SELECT * FROM events WHERE is_published = 1 ORDER BY date_str ASC;').all();
  }
  res.json(rows);
});

// GET /api/content/gallery
router.get('/gallery', (req, res) => {
  const { category, limit } = req.query;
  const galleryJsonPath = path.join(__dirname, '..', '..', 'public', 'data', 'gallery.json');
  if (!fs.existsSync(galleryJsonPath)) {
    return res.json([]);
  }
  try {
    let items = JSON.parse(fs.readFileSync(galleryJsonPath, 'utf8'));
    if (category && category !== 'all') {
      items = items.filter(it => it.category === category);
    }
    if (limit) {
      items = items.slice(0, parseInt(limit, 10));
    }
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load gallery' });
  }
});

// --- PROTECTED CMS MANAGEMENT ENDPOINTS (Administrator or Content Editor) ---

// PUT /api/content/alert-banner
router.put('/alert-banner', authenticateToken, requireRoles(['Content Editor', 'Administrator']), (req, res) => {
  const { enabled, type, message } = req.body;
  const alertData = {
    enabled: Boolean(enabled),
    type: type || 'announcement',
    message: String(message || '').trim()
  };
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES ('alert_banner', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
  `).run(JSON.stringify(alertData), now);

  logAudit(req, 'Update alert banner', `Alert banner set to enabled=${alertData.enabled}: ${alertData.message}`);
  res.json({ message: 'Alert banner updated successfully', alert: alertData });
});

// POST /api/content/events
router.post('/events', authenticateToken, requireRoles(['Content Editor', 'Administrator']), (req, res) => {
  const { date_str, title, details, category, is_published } = req.body;
  if (!date_str || !title || !category) {
    return res.status(400).json({ error: 'Date, title, and category are required' });
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO events (id, date_str, title, details, category, is_published, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `).run(id, date_str, title, details || '', category, is_published !== false ? 1 : 0, now);

  logAudit(req, 'Create event', `Created event: ${title} on ${date_str}`);
  res.status(201).json({ message: 'Event created successfully', id });
});

// PUT /api/content/events/:id
router.put('/events/:id', authenticateToken, requireRoles(['Content Editor', 'Administrator']), (req, res) => {
  const { date_str, title, details, category, is_published } = req.body;
  db.prepare(`
    UPDATE events
    SET date_str = ?, title = ?, details = ?, category = ?, is_published = ?
    WHERE id = ?;
  `).run(date_str, title, details || '', category, is_published ? 1 : 0, req.params.id);

  logAudit(req, 'Update event', `Updated event ID: ${req.params.id}`);
  res.json({ message: 'Event updated successfully' });
});

// DELETE /api/content/events/:id
router.delete('/events/:id', authenticateToken, requireRoles(['Content Editor', 'Administrator']), (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?;').run(req.params.id);
  logAudit(req, 'Delete event', `Deleted event ID: ${req.params.id}`);
  res.json({ message: 'Event deleted successfully' });
});

// POST /api/content/news
router.post('/news', authenticateToken, requireRoles(['Content Editor', 'Administrator']), (req, res) => {
  const { date_str, title, excerpt, content, image_slug, is_published } = req.body;
  if (!date_str || !title || !content) {
    return res.status(400).json({ error: 'Date, title, and content are required' });
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO news (id, date_str, title, excerpt, content, image_slug, is_published, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `).run(id, date_str, title, excerpt || '', content, image_slug || '', is_published !== false ? 1 : 0, now);

  logAudit(req, 'Create news article', `Created news: ${title}`);
  res.status(201).json({ message: 'News article published successfully', id });
});

// PUT /api/content/news/:id
router.put('/news/:id', authenticateToken, requireRoles(['Content Editor', 'Administrator']), (req, res) => {
  const { date_str, title, excerpt, content, image_slug, is_published } = req.body;
  db.prepare(`
    UPDATE news
    SET date_str = ?, title = ?, excerpt = ?, content = ?, image_slug = ?, is_published = ?
    WHERE id = ?;
  `).run(date_str, title, excerpt || '', content, image_slug || '', is_published ? 1 : 0, req.params.id);

  logAudit(req, 'Update news article', `Updated news ID: ${req.params.id}`);
  res.json({ message: 'News article updated successfully' });
});

// DELETE /api/content/news/:id
router.delete('/news/:id', authenticateToken, requireRoles(['Content Editor', 'Administrator']), (req, res) => {
  db.prepare('DELETE FROM news WHERE id = ?;').run(req.params.id);
  logAudit(req, 'Delete news article', `Deleted news ID: ${req.params.id}`);
  res.json({ message: 'News article deleted successfully' });
});

// PUT /api/content/fees
router.put('/fees', authenticateToken, requireRoles(['Accounts Officer', 'Administrator']), (req, res) => {
  const { fees } = req.body;
  if (!Array.isArray(fees)) {
    return res.status(400).json({ error: 'Fees array is required' });
  }
  const updateFee = db.prepare(`
    UPDATE fee_structures
    SET day_fees_ugx = ?, boarding_fees_ugx = ?, uniform_ugx = ?, meals_ugx = ?, scholastic_ugx = ?, notes = ?
    WHERE id = ?;
  `);

  for (const f of fees) {
    if (f.id) {
      updateFee.run(
        parseInt(f.day_fees_ugx || 0, 10),
        parseInt(f.boarding_fees_ugx || 0, 10),
        parseInt(f.uniform_ugx || 0, 10),
        parseInt(f.meals_ugx || 0, 10),
        parseInt(f.scholastic_ugx || 0, 10),
        f.notes || '',
        f.id
      );
    }
  }

  logAudit(req, 'Update fees structure', 'Updated tuition and fees structure');
  res.json({ message: 'Fee structures updated successfully' });
});

// POST /api/content/staff
router.post('/staff', authenticateToken, requireRoles(['Content Editor', 'Administrator']), (req, res) => {
  const { name, role, initials, category, image_slug, contact, display_order } = req.body;
  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role are required' });
  }
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO staff_members (id, name, role, initials, category, image_slug, contact, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `).run(id, name, role, initials || '', category || 'teaching', image_slug || '', contact || '', display_order || 0);

  logAudit(req, 'Add staff member', `Added staff member: ${name} (${role})`);
  res.status(201).json({ message: 'Staff member added', id });
});

// DELETE /api/content/staff/:id
router.delete('/staff/:id', authenticateToken, requireRoles(['Content Editor', 'Administrator']), (req, res) => {
  db.prepare('DELETE FROM staff_members WHERE id = ?;').run(req.params.id);
  logAudit(req, 'Delete staff member', `Deleted staff member ID: ${req.params.id}`);
  res.json({ message: 'Staff member removed' });
});

// GET /api/content/anthem/pdf - Download official printable Anthem PDF
router.get('/anthem/pdf', (req, res) => {
  try {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Olive_School_Anthem.pdf"');

    doc.pipe(res);

    // Decorative page border
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
       .lineWidth(2)
       .strokeColor('#8b1e2b')
       .stroke();

    doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48)
       .lineWidth(0.75)
       .strokeColor('#d49a16')
       .stroke();

    // Header Crest / Title
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold')
       .fontSize(20)
       .fillColor('#8b1e2b')
       .text('OLIVE NURSERY AND PRIMARY SCHOOL - ATAPARA', { align: 'center' });

    doc.moveDown(0.2);
    doc.font('Helvetica-Bold')
       .fontSize(11)
       .fillColor('#d49a16')
       .text('MOTTO: TOIL TO GAIN', { align: 'center' });

    doc.font('Helvetica')
       .fontSize(9)
       .fillColor('#444444')
       .text('Licence: ME/P/10412  |  EMIS: 800048  |  Awaimunga Village, Kamdini, Oyam District, Uganda', { align: 'center' });

    doc.moveDown(0.4);
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.6);

    doc.font('Helvetica-Bold')
       .fontSize(15)
       .fillColor('#8b1e2b')
       .text('OFFICIAL SCHOOL ANTHEM', { align: 'center' });

    doc.moveDown(0.8);

    // Stanza 1
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#8b1e2b').text('STANZA 1', { align: 'center' });
    doc.font('Helvetica').fontSize(11.5).fillColor('#111827').text(
      'Olive\nThe school for our future\nThe school of peace, love, and joy\nOur motto is toil to gain\nThat\'s why we shall always struggle',
      { align: 'center', lineGap: 3 }
    );
    doc.moveDown(0.6);

    // Stanza 2
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#8b1e2b').text('STANZA 2', { align: 'center' });
    doc.font('Helvetica').fontSize(11.5).fillColor('#111827').text(
      'Our parents support our director\nOur teachers, PTA\nBecause divided we shall fall\nAnd together we shall always struggle',
      { align: 'center', lineGap: 3 }
    );
    doc.moveDown(0.6);

    // Chorus
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor('#d49a16').text('CHORUS', { align: 'center' });
    doc.font('Helvetica-BoldOblique').fontSize(12).fillColor('#8b1e2b').text(
      'From the rising, rising of the sun\nTo its setting, grace is above\nWe are always one\nTogether as one',
      { align: 'center', lineGap: 3 }
    );
    doc.moveDown(0.6);

    // Stanza 3
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#8b1e2b').text('STANZA 3', { align: 'center' });
    doc.font('Helvetica').fontSize(11.5).fillColor('#111827').text(
      'Discipline is our nature\nOur results is out of hard work\nWe are after quality\nBut not quantity',
      { align: 'center', lineGap: 3 }
    );
    doc.moveDown(0.6);

    // Refrain
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#8b1e2b').text('REFRAIN', { align: 'center' });
    doc.font('Helvetica').fontSize(11.5).fillColor('#111827').text(
      'Olive\nThe school for our future\nThe school of peace, love, and joy\nOur motto is toil to gain\nThat\'s why we shall always struggle',
      { align: 'center', lineGap: 3 }
    );
    doc.moveDown(0.6);

    // Outro
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#8b1e2b').text('Always struggle!', { align: 'center' });

    // Footer info
    doc.moveDown(1.2);
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
    doc.moveDown(0.4);

    doc.font('Helvetica')
       .fontSize(8.5)
       .fillColor('#6b7280')
       .text('Olive Nursery and Primary School - Atapara · Principal Director: 0782053937 · Head Teacher: 0774496507 · Email: olivepri21@gmail.com', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('Anthem PDF error:', err);
    res.status(500).json({ error: 'Failed to generate Anthem PDF' });
  }
});

// POST /api/content/gallery/upload - Major Admin Photo Upload with Caption
router.post('/gallery/upload', authenticateToken, requireRoles(['Administrator']), uploadPhoto.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  const galleryJsonPath = path.join(__dirname, '..', '..', 'public', 'data', 'gallery.json');
  let gallery = [];
  if (fs.existsSync(galleryJsonPath)) {
    try {
      gallery = JSON.parse(fs.readFileSync(galleryJsonPath, 'utf8'));
    } catch (e) {
      gallery = [];
    }
  }

  const relativePath = `/images/gallery/${req.file.filename}`;
  const newItem = {
    id: `gal-${Date.now()}`,
    thumb: relativePath,
    large: relativePath,
    category: req.body.category || 'campus',
    caption: (req.body.caption || '').trim(),
    originalFile: req.file.originalname,
    date: new Date().toISOString().split('T')[0]
  };

  gallery.unshift(newItem);
  fs.writeFileSync(galleryJsonPath, JSON.stringify(gallery, null, 2), 'utf8');

  logAudit(req, 'Upload School Photo', `Uploaded photo: ${req.file.originalname} (Caption: ${newItem.caption || 'None'})`);
  res.status(201).json({ message: 'Photo uploaded successfully', item: newItem });
});

// PUT /api/content/gallery/:id - Update photo caption and category
router.put('/gallery/:id', authenticateToken, requireRoles(['Administrator']), (req, res) => {
  const { caption, category } = req.body;
  const galleryJsonPath = path.join(__dirname, '..', '..', 'public', 'data', 'gallery.json');
  if (!fs.existsSync(galleryJsonPath)) {
    return res.status(404).json({ error: 'Gallery file not found' });
  }

  try {
    const gallery = JSON.parse(fs.readFileSync(galleryJsonPath, 'utf8'));
    const item = gallery.find(g => g.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    if (caption !== undefined) item.caption = String(caption).trim();
    if (category !== undefined) item.category = String(category).trim();

    fs.writeFileSync(galleryJsonPath, JSON.stringify(gallery, null, 2), 'utf8');
    logAudit(req, 'Update Photo Details', `Updated details for photo: ${item.id}`);
    res.json({ message: 'Photo updated successfully', item });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update photo' });
  }
});

// DELETE /api/content/gallery/:id - Major Admin Photo Delete
router.delete('/gallery/:id', authenticateToken, requireRoles(['Administrator']), (req, res) => {
  const galleryJsonPath = path.join(__dirname, '..', '..', 'public', 'data', 'gallery.json');
  if (!fs.existsSync(galleryJsonPath)) {
    return res.status(404).json({ error: 'Gallery not found' });
  }

  try {
    let gallery = JSON.parse(fs.readFileSync(galleryJsonPath, 'utf8'));
    const item = gallery.find(g => g.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Photo not found in gallery' });
    }

    gallery = gallery.filter(g => g.id !== req.params.id);
    fs.writeFileSync(galleryJsonPath, JSON.stringify(gallery, null, 2), 'utf8');

    // Optionally clean up local file if located in public/images/gallery
    if (item.large && item.large.startsWith('/images/gallery/')) {
      const filePath = path.join(__dirname, '..', '..', 'public', item.large);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    logAudit(req, 'Delete School Photo', `Deleted photo ID: ${req.params.id}`);
    res.json({ message: 'Photo removed from gallery successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove photo' });
  }
});

module.exports = router;
