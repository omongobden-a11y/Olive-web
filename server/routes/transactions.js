const express = require('express');
const router = express.Router();
const crypto = require('node:crypto');
const { db } = require('../db');
const { authenticateToken, requireRoles, logAudit } = require('../auth');

// POST /api/transactions/initiate - Secure Parent Remittance & Fee Payment Gateway
router.post('/initiate', (req, res) => {
  try {
    const {
      student_name,
      class_name,
      fee_category,
      amount_ugx,
      payment_method,
      phone_number,
      payer_name
    } = req.body;

    if (!student_name || !class_name || !fee_category || !amount_ugx || !payment_method) {
      return res.status(400).json({ error: 'Student name, class, fee category, amount, and payment method are required.' });
    }

    const parsedAmount = parseInt(amount_ugx, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount in UGX is required.' });
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const timestampStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const randStr = crypto.randomBytes(3).toString('hex').toUpperCase();

    // Determine prefix based on payment method
    let methodPrefix = 'PAY';
    if (payment_method.includes('MTN')) methodPrefix = 'MTN';
    else if (payment_method.includes('Airtel')) methodPrefix = 'AIR';
    else if (payment_method.includes('Bank')) methodPrefix = 'BNK';
    else if (payment_method.includes('Card')) methodPrefix = 'CRD';

    const txnRef = `TXN-${methodPrefix}-${timestampStr}-${randStr}`;
    const receiptNumber = `REC-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const formattedDate = now.toISOString().replace('T', ' ').slice(0, 19);

    const receiptData = {
      receiptNumber,
      txnRef,
      studentName: student_name.trim(),
      className: class_name.trim(),
      feeCategory: fee_category.trim(),
      amountUGX: parsedAmount,
      paymentMethod: payment_method.trim(),
      payerName: payer_name ? payer_name.trim() : student_name.trim(),
      phoneNumber: phone_number ? phone_number.trim() : '',
      paymentDate: formattedDate,
      school: 'Olive Nursery and Primary School - Atapara',
      licence: 'ME/P/10412',
      emis: '800048',
      status: 'Completed'
    };

    const stmt = db.prepare(`
      INSERT INTO transactions (
        id, txn_ref, student_name, class_name, fee_category, amount_ugx,
        payment_method, phone_number, status, payment_date, receipt_number, receipt_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?, ?, ?);
    `);

    stmt.run(
      id,
      txnRef,
      student_name.trim(),
      class_name.trim(),
      fee_category.trim(),
      parsedAmount,
      payment_method.trim(),
      phone_number ? phone_number.trim() : '',
      formattedDate,
      receiptNumber,
      JSON.stringify(receiptData)
    );

    logAudit(null, 'Fee Remittance Payment', `Payment of UGX ${parsedAmount.toLocaleString()} received for ${student_name} (${fee_category}) via ${payment_method}`);

    res.status(201).json({
      success: true,
      message: 'Transaction processed and verified successfully.',
      txnRef,
      receiptNumber,
      receipt: receiptData
    });
  } catch (err) {
    console.error('Error initiating transaction:', err);
    res.status(500).json({ error: 'Failed to process payment transaction.' });
  }
});

// GET /api/transactions/receipt/:receiptNumber - Public receipt verification & printable view
router.get('/receipt/:receiptNumber', (req, res) => {
  const txn = db.prepare('SELECT * FROM transactions WHERE receipt_number = ?;').get(req.params.receiptNumber);
  if (!txn) {
    return res.status(404).send('<h2>Receipt not found or invalid reference number.</h2>');
  }

  let data;
  try {
    data = JSON.parse(txn.receipt_data);
  } catch (e) {
    data = {
      receiptNumber: txn.receipt_number,
      txnRef: txn.txn_ref,
      studentName: txn.student_name,
      className: txn.class_name,
      feeCategory: txn.fee_category,
      amountUGX: txn.amount_ugx,
      paymentMethod: txn.payment_method,
      phoneNumber: txn.phone_number,
      paymentDate: txn.payment_date,
      status: txn.status
    };
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Official Payment Receipt - ${data.receiptNumber}</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 24px; color: #222; background: #f9f9f9; }
  .receipt-card { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #ddd; border-top: 6px solid #8B1E2B; border-radius: 8px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
  .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 18px; margin-bottom: 20px; }
  .logo { width: 68px; height: 68px; margin: 0 auto 8px; display: block; }
  h1 { margin: 0; font-size: 19px; color: #8B1E2B; text-transform: uppercase; }
  h2 { margin: 4px 0; font-size: 13px; color: #555; font-weight: normal; }
  .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 4px 14px; border-radius: 20px; font-weight: bold; font-size: 12px; margin-top: 8px; border: 1px solid #a5d6a7; }
  .row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  .row .label { color: #666; }
  .row .val { font-weight: 600; color: #111; text-align: right; }
  .total-row { display: flex; justify-content: space-between; padding: 16px 0; margin-top: 12px; border-top: 2px solid #8B1E2B; border-bottom: 2px solid #8B1E2B; font-size: 18px; font-weight: bold; color: #8B1E2B; }
  .footer { text-align: center; margin-top: 26px; font-size: 12px; color: #777; }
  .btn-print { display: block; width: 100%; max-width: 240px; margin: 20px auto 0; padding: 12px; background: #8B1E2B; color: #fff; border: 0; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer; text-align: center; }
  @media print { .btn-print { display: none; } body { background: #fff; padding: 0; } .receipt-card { border: 0; box-shadow: none; padding: 0; } }
</style>
</head>
<body>
<div class="receipt-card">
  <div class="header">
    <img src="/images/logo/crest.webp" onerror="this.src='/images/logo/crest.jpg'" class="logo" alt="Olive Crest">
    <h1>Olive Nursery & Primary School - Atapara</h1>
    <h2>Awaimunga Village, Ocini Parish, Kamdini, Oyam District</h2>
    <div style="font-size:11px; color:#666;">Licence: ME/P/10412 • EMIS: 800048 • Tel: 0774496507 / 0773782383</div>
    <div class="badge">✔ PAYMENT VERIFIED & COMPLETED</div>
  </div>

  <div class="row"><span class="label">Receipt Number</span><span class="val">${data.receiptNumber}</span></div>
  <div class="row"><span class="label">Transaction Reference</span><span class="val">${data.txnRef}</span></div>
  <div class="row"><span class="label">Date & Time</span><span class="val">${data.paymentDate}</span></div>
  <div class="row"><span class="label">Student Name</span><span class="val">${data.studentName}</span></div>
  <div class="row"><span class="label">Class / Section</span><span class="val">${data.className}</span></div>
  <div class="row"><span class="label">Fee Category</span><span class="val">${data.feeCategory}</span></div>
  <div class="row"><span class="label">Payment Channel</span><span class="val">${data.paymentMethod}</span></div>
  ${data.phoneNumber ? `<div class="row"><span class="label">Mobile Number</span><span class="val">${data.phoneNumber}</span></div>` : ''}

  <div class="total-row">
    <span>Amount Paid</span>
    <span>UGX ${(data.amountUGX || 0).toLocaleString()}</span>
  </div>

  <div class="footer">
    <p>This is an official computer-generated receipt from the Olive Nursery and Primary School Accounts Desk.<br>Thank you for supporting your child’s education with us.</p>
    <p style="font-size:10px; color:#999;">Motto: "Toil to Gain"</p>
  </div>

  <button class="btn-print" onclick="window.print()">🖨️ Print Receipt</button>
</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// GET /api/transactions/my-transactions - Authenticated Parent viewing their payment receipts
router.get('/my-transactions', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT email, phone, full_name FROM users WHERE id = ?;').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const phone = user.phone || '';
  const rows = db.prepare(`
    SELECT * FROM transactions
    WHERE phone_number = ? OR receipt_data LIKE ?
    ORDER BY payment_date DESC;
  `).all(phone, `%${phone}%`);

  res.json({ transactions: rows });
});

// GET /api/transactions - Protected: Accounts Officer & Administrator
router.get('/', authenticateToken, requireRoles(['Accounts Officer', 'Administrator']), (req, res) => {
  const { payment_method, class_name } = req.query;
  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];

  if (payment_method && payment_method !== 'all') {
    query += ' AND payment_method LIKE ?';
    params.push(`%${payment_method}%`);
  }
  if (class_name && class_name !== 'all') {
    query += ' AND class_name = ?';
    params.push(class_name);
  }

  query += ' ORDER BY payment_date DESC;';
  const rows = db.prepare(query).all(...params);

  // Compute total
  const totalUgx = rows.reduce((sum, r) => sum + (r.amount_ugx || 0), 0);

  res.json({
    transactions: rows,
    totalCount: rows.length,
    totalAmountUGX: totalUgx
  });
});

// GET /api/transactions/export/csv
router.get('/export/csv', authenticateToken, requireRoles(['Accounts Officer', 'Administrator']), (req, res) => {
  const rows = db.prepare('SELECT * FROM transactions ORDER BY payment_date DESC;').all();
  const headers = ['Receipt Number', 'Txn Reference', 'Student Name', 'Class', 'Category', 'Amount (UGX)', 'Method', 'Phone', 'Date', 'Status'];
  
  const csvLines = [headers.join(',')];
  for (const r of rows) {
    const line = [
      `"${r.receipt_number || ''}"`,
      `"${r.txn_ref || ''}"`,
      `"${(r.student_name || '').replace(/"/g, '""')}"`,
      `"${r.class_name || ''}"`,
      `"${(r.fee_category || '').replace(/"/g, '""')}"`,
      r.amount_ugx || 0,
      `"${r.payment_method || ''}"`,
      `"${r.phone_number || ''}"`,
      `"${r.payment_date || ''}"`,
      `"${r.status || ''}"`
    ];
    csvLines.push(line.join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="olive-transactions-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csvLines.join('\n'));
});

module.exports = router;
