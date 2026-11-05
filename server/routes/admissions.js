const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { db } = require('../db');
const { authenticateToken, requireRoles, logAudit } = require('../auth');

// Multer storage for document uploads (Birth certificate, report cards)
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'documents');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `doc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, PNG, or WebP documents are allowed'));
    }
  }
});

// POST /api/admissions/apply - Public online application submission
router.post('/apply', upload.single('document'), (req, res) => {
  try {
    const {
      child_name,
      class_applied,
      date_of_birth,
      gender,
      boarding_status,
      guardian_name,
      guardian_phone,
      guardian_email,
      address,
      previous_school,
      health_notes
    } = req.body;

    if (!child_name || !class_applied || !guardian_name || !guardian_phone) {
      return res.status(400).json({ error: 'Child name, class applied, guardian name, and phone are required.' });
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const year = now.getFullYear();
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const appNumber = `OLV-${year}-${randNum}`;
    const receivedDate = now.toISOString().split('T')[0];
    const docPath = req.file ? `/uploads/documents/${req.file.filename}` : '';

    const stmt = db.prepare(`
      INSERT INTO admissions_applications (
        id, app_number, child_name, class_applied, date_of_birth, gender,
        boarding_status, guardian_name, guardian_phone, guardian_email,
        address, previous_school, health_notes, document_path, status,
        interviewer_notes, received_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    stmt.run(
      id,
      appNumber,
      child_name.trim(),
      class_applied.trim(),
      date_of_birth || '',
      gender || '',
      boarding_status || 'Day',
      guardian_name.trim(),
      guardian_phone.trim(),
      guardian_email ? guardian_email.trim() : '',
      address ? address.trim() : '',
      previous_school ? previous_school.trim() : '',
      health_notes ? health_notes.trim() : '',
      docPath,
      'Received',
      '',
      receivedDate,
      now.toISOString(),
      now.toISOString()
    );

    logAudit(null, 'Online Admission Application', `New application submitted: ${child_name} for ${class_applied} (Ref: ${appNumber})`);

    res.status(201).json({
      success: true,
      message: 'Admission application received successfully.',
      appNumber,
      details: {
        childName: child_name,
        classApplied: class_applied,
        guardianName: guardian_name,
        status: 'Received',
        receivedDate
      }
    });
  } catch (err) {
    console.error('Error submitting application:', err);
    res.status(500).json({ error: 'Internal server error processing admission application.' });
  }
});

// GET /api/admissions/applications - Protected: Admissions Officer, Administrator, Teacher, Welfare Officer
router.get('/applications', authenticateToken, requireRoles(['Admissions Officer', 'Administrator', 'Teacher', 'Welfare Officer']), (req, res) => {
  const { status, class_name, search } = req.query;
  let query = 'SELECT * FROM admissions_applications WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (class_name && class_name !== 'all') {
    query += ' AND class_applied = ?';
    params.push(class_name);
  }
  if (search) {
    query += ' AND (child_name LIKE ? OR guardian_name LIKE ? OR app_number LIKE ? OR guardian_phone LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY created_at DESC;';
  const applications = db.prepare(query).all(...params);
  res.json(applications);
});

// GET /api/admissions/my-applications - Parent / Student viewing their own application status
router.get('/my-applications', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT email, phone, full_name FROM users WHERE id = ?;').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const applications = db.prepare(`
    SELECT id, app_number, child_name, class_applied, boarding_status, guardian_name, status, interviewer_notes, received_date, created_at
    FROM admissions_applications
    WHERE LOWER(guardian_email) = ? OR guardian_phone = ?
    ORDER BY created_at DESC;
  `).all((user.email || '').toLowerCase(), user.phone || '');

  res.json(applications);
});

// PUT /api/admissions/applications/:id - Update status and notes
router.put('/applications/:id', authenticateToken, requireRoles(['Admissions Officer', 'Administrator']), (req, res) => {
  const { status, interviewer_notes } = req.body;
  const validStatuses = ['Received', 'Interview', 'Admitted', 'Waiting list', 'Declined'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const app = db.prepare('SELECT * FROM admissions_applications WHERE id = ?;').get(req.params.id);
  if (!app) {
    return res.status(404).json({ error: 'Application not found' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE admissions_applications
    SET status = COALESCE(?, status),
        interviewer_notes = COALESCE(?, interviewer_notes),
        updated_at = ?
    WHERE id = ?;
  `).run(status || null, interviewer_notes != null ? interviewer_notes : null, now, req.params.id);

  logAudit(req, 'Update Admission Application', `Updated app ${app.app_number} status to ${status || app.status}`);
  res.json({ message: 'Application updated successfully' });
});

// DELETE /api/admissions/applications/:id
router.delete('/applications/:id', authenticateToken, requireRoles(['Administrator']), (req, res) => {
  const app = db.prepare('SELECT * FROM admissions_applications WHERE id = ?;').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  db.prepare('DELETE FROM admissions_applications WHERE id = ?;').run(req.params.id);
  logAudit(req, 'Delete Admission Application', `Deleted application ${app.app_number} (${app.child_name})`);
  res.json({ message: 'Application deleted successfully' });
});

// GET /api/admissions/export/csv
router.get('/export/csv', authenticateToken, requireRoles(['Admissions Officer', 'Administrator']), (req, res) => {
  const rows = db.prepare('SELECT * FROM admissions_applications ORDER BY created_at DESC;').all();
  const headers = ['Application Number', 'Child Name', 'Class Applied', 'Boarding Status', 'Guardian Name', 'Guardian Phone', 'Guardian Email', 'Address', 'Status', 'Interviewer Notes', 'Received Date'];
  
  const csvLines = [headers.join(',')];
  for (const r of rows) {
    const line = [
      `"${r.app_number || ''}"`,
      `"${(r.child_name || '').replace(/"/g, '""')}"`,
      `"${r.class_applied || ''}"`,
      `"${r.boarding_status || ''}"`,
      `"${(r.guardian_name || '').replace(/"/g, '""')}"`,
      `"${r.guardian_phone || ''}"`,
      `"${r.guardian_email || ''}"`,
      `"${(r.address || '').replace(/"/g, '""')}"`,
      `"${r.status || ''}"`,
      `"${(r.interviewer_notes || '').replace(/"/g, '""')}"`,
      `"${r.received_date || ''}"`
    ];
    csvLines.push(line.join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="olive-admissions-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csvLines.join('\n'));
});

// GET /api/admissions/form/download - High-fidelity Official Printable PDF/HTML Admission Form
router.get('/form/download', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Official Admission Form - Olive Nursery and Primary School - Atapara</title>
<style>
  @page { size: A4 portrait; margin: 16mm; }
  body { font-family: 'Times New Roman', serif; color: #1a1a1a; margin: 0; padding: 20px; line-height: 1.35; font-size: 13px; }
  .header { text-align: center; border-bottom: 2px solid #8B1E2B; padding-bottom: 12px; margin-bottom: 16px; position: relative; }
  .crest { width: 75px; height: 75px; margin: 0 auto 6px; display: block; }
  h1 { margin: 0; font-size: 20px; color: #8B1E2B; text-transform: uppercase; letter-spacing: 0.5px; }
  h2 { margin: 3px 0; font-size: 13px; color: #333; font-weight: normal; }
  .motto { font-style: italic; font-weight: bold; color: #B38600; font-size: 14px; margin-top: 4px; }
  .meta { font-size: 11px; color: #555; margin-top: 4px; }
  .badge-photo { position: absolute; right: 0; top: 0; width: 100px; height: 115px; border: 1px dashed #666; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; color: #777; padding: 4px; box-sizing: border-box; }
  .section-title { background: #8B1E2B; color: #fff; padding: 4px 10px; font-weight: bold; font-size: 12px; text-transform: uppercase; margin: 14px 0 8px; border-radius: 2px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .field { margin-bottom: 8px; }
  .field label { display: block; font-size: 11px; font-weight: bold; color: #444; margin-bottom: 2px; }
  .line { border-bottom: 1px solid #333; min-height: 20px; display: block; }
  .checkbox-group { display: flex; gap: 16px; align-items: center; height: 22px; }
  .box { display: inline-block; width: 12px; height: 12px; border: 1px solid #333; vertical-align: middle; margin-right: 4px; }
  .checklist { font-size: 11px; margin: 8px 0; padding-left: 18px; }
  .checklist li { margin-bottom: 4px; }
  .official-box { border: 2px solid #8B1E2B; padding: 10px; margin-top: 14px; background: #faf8f5; }
  .print-btn { display: block; margin: 0 auto 20px; padding: 10px 24px; background: #8B1E2B; color: #fff; font-size: 14px; font-weight: bold; border: 0; border-radius: 4px; cursor: pointer; }
  @media print { .print-btn { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF Form</button>

<div class="header">
  <img src="/images/logo/crest.webp" onerror="this.src='/images/logo/crest.jpg'" class="crest" alt="School Crest">
  <h1>Olive Nursery and Primary School - Atapara</h1>
  <h2>Awaimunga Village, Ocini Parish, Kamdini Sub-county, Oyam District, Uganda</h2>
  <div class="motto">"TOIL TO GAIN"</div>
  <div class="meta">Registered & Licensed by Ministry of Education & Sports • Licence: <b>ME/P/10412</b> • EMIS: <b>800048</b></div>
  <div class="meta">Admissions Office: 0774496507 / 0773782383 • Email: olivepri21@gmail.com</div>
  <div class="badge-photo">Affix Child’s Recent Passport Photo Here</div>
</div>

<div class="section-title">Section A: Pupil Personal Information</div>
<div class="grid-2">
  <div class="field"><label>1. Child’s Full Name (As per birth certificate):</label><span class="line"></span></div>
  <div class="field"><label>2. Class Applied For (Nursery K-1, K-2, K-3 / Primary P.1 to P.7):</label><span class="line"></span></div>
</div>
<div class="grid-3">
  <div class="field"><label>3. Date of Birth (DD/MM/YYYY):</label><span class="line"></span></div>
  <div class="field"><label>4. Gender:</label><div class="checkbox-group"><span class="box"></span> Male <span class="box"></span> Female</div></div>
  <div class="field"><label>5. Nationality & Home District:</label><span class="line"></span></div>
</div>
<div class="grid-2">
  <div class="field"><label>6. Religious Affiliation:</label><span class="line"></span></div>
  <div class="field"><label>7. Status Requested:</label><div class="checkbox-group"><span class="box"></span> Day Scholar <span class="box"></span> Boarding Section</div></div>
</div>

<div class="section-title">Section B: Parent / Legal Guardian Information</div>
<div class="grid-2">
  <div class="field"><label>8. Father’s / Guardian’s Full Name:</label><span class="line"></span></div>
  <div class="field"><label>9. Occupation / Place of Work:</label><span class="line"></span></div>
</div>
<div class="grid-2">
  <div class="field"><label>10. Mother’s / Guardian’s Full Name:</label><span class="line"></span></div>
  <div class="field"><label>11. Occupation / Place of Work:</label><span class="line"></span></div>
</div>
<div class="grid-3">
  <div class="field"><label>12. Primary Mobile Telephone:</label><span class="line"></span></div>
  <div class="field"><label>13. WhatsApp / Alternate Telephone:</label><span class="line"></span></div>
  <div class="field"><label>14. Email Address (if any):</label><span class="line"></span></div>
</div>
<div class="field"><label>15. Physical Home Residence (Village, Parish, Sub-county, District, Landmark):</label><span class="line"></span></div>

<div class="section-title">Section C: Medical History & Emergency Contact</div>
<div class="grid-2">
  <div class="field"><label>16. Any Known Medical Conditions / Allergies / Dietary Needs:</label><span class="line"></span></div>
  <div class="field"><label>17. Emergency Alternate Contact Person & Telephone:</label><span class="line"></span></div>
</div>

<div class="section-title">Section D: Academic History</div>
<div class="grid-2">
  <div class="field"><label>18. Previous School Attended (if applicable):</label><span class="line"></span></div>
  <div class="field"><label>19. Last Class Completed & Performance Level:</label><span class="line"></span></div>
</div>

<div class="section-title">Section E: Parent / Guardian Undertaking</div>
<p style="font-size:11px; margin: 4px 0 10px;">
  I, the undersigned parent/guardian, hereby apply for admission of the above-named child to Olive Nursery and Primary School - Atapara. I agree to abide by the school rules, pay prescribed term fees punctually, and support the school’s academic and moral standards.
</p>
<div class="grid-2">
  <div class="field"><label>Parent / Guardian Signature:</label><span class="line"></span></div>
  <div class="field"><label>Date:</label><span class="line"></span></div>
</div>

<div class="section-title">Required Documents Checklist</div>
<ul class="checklist">
  <li>☑ Duly completed admission form</li>
  <li>☑ Photocopy of Child’s Birth Certificate or Church Baptism Card</li>
  <li>☑ Two (2) passport-sized color photos of the child</li>
  <li>☑ Previous school report card / progress record (P.1 and above)</li>
  <li>☑ Child’s immunization / health record card</li>
</ul>

<div class="official-box">
  <div style="font-weight:bold; color:#8B1E2B; text-transform:uppercase; margin-bottom:6px; font-size:11px;">Section F: For Official School Administration Use Only</div>
  <div class="grid-3">
    <div class="field"><label>Admission Status:</label><div class="checkbox-group"><span class="box"></span> Admitted <span class="box"></span> Waiting List <span class="box"></span> Declined</div></div>
    <div class="field"><label>Admission Number Assigned:</label><span class="line"></span></div>
    <div class="field"><label>Assigned Class Stream:</label><span class="line"></span></div>
  </div>
  <div class="grid-3" style="margin-top:6px;">
    <div class="field"><label>Head Teacher / Director Signature:</label><span class="line"></span></div>
    <div class="field"><label>Official Stamp & Date:</label><span class="line"></span></div>
    <div class="field"><label>Fee Receipt Number:</label><span class="line"></span></div>
  </div>
</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

module.exports = router;
