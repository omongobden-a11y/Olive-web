const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const DB_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, 'olive_school.db');

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrent read performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const check = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
}

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      mfa_enabled INTEGER NOT NULL DEFAULT 0,
      mfa_secret TEXT,
      mfa_backup_codes TEXT,
      last_login TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notices (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      priority INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      date_str TEXT NOT NULL,
      title TEXT NOT NULL,
      details TEXT,
      category TEXT NOT NULL,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS term_dates (
      id TEXT PRIMARY KEY,
      term_name TEXT NOT NULL,
      opens_date TEXT NOT NULL,
      closes_date TEXT NOT NULL,
      school_days INTEGER NOT NULL,
      academic_year TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      date_str TEXT NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT,
      content TEXT,
      image_slug TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staff_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      initials TEXT,
      category TEXT NOT NULL DEFAULT 'teaching',
      image_slug TEXT,
      contact TEXT,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS fee_structures (
      id TEXT PRIMARY KEY,
      class_category TEXT NOT NULL,
      day_fees_ugx INTEGER NOT NULL,
      boarding_fees_ugx INTEGER NOT NULL,
      uniform_ugx INTEGER NOT NULL,
      meals_ugx INTEGER NOT NULL,
      scholastic_ugx INTEGER NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS admission_requirements (
      id TEXT PRIMARY KEY,
      requirement_text TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS key_dates (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      value_str TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS admissions_applications (
      id TEXT PRIMARY KEY,
      app_number TEXT UNIQUE NOT NULL,
      child_name TEXT NOT NULL,
      class_applied TEXT NOT NULL,
      date_of_birth TEXT,
      gender TEXT,
      boarding_status TEXT NOT NULL DEFAULT 'Day',
      guardian_name TEXT NOT NULL,
      guardian_phone TEXT NOT NULL,
      guardian_email TEXT,
      address TEXT,
      previous_school TEXT,
      health_notes TEXT,
      document_path TEXT,
      status TEXT NOT NULL DEFAULT 'Received',
      interviewer_notes TEXT,
      received_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id TEXT PRIMARY KEY,
      ticket_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      department TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'New',
      response_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      txn_ref TEXT UNIQUE NOT NULL,
      student_name TEXT NOT NULL,
      class_name TEXT NOT NULL,
      fee_category TEXT NOT NULL,
      amount_ugx INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      phone_number TEXT,
      status TEXT NOT NULL DEFAULT 'Completed',
      payment_date TEXT NOT NULL,
      receipt_number TEXT UNIQUE NOT NULL,
      receipt_data TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      user_email TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT
    );
  `);

  // Schema migrations for existing databases
  try {
    db.exec('ALTER TABLE users ADD COLUMN phone TEXT;');
  } catch (e) {
    // Column already exists
  }

  // Pre-seed and synchronize all school login accounts across all roles:
  // (Leadership, Admissions, Accounts, Academics, Welfare, Support, Parents, Students)
  console.log('Synchronizing user accounts with role-based access control...');
  
  const allInitialUsers = [
    // 1. Leadership & Systems
    {
      email: 'admin@oliveatapara.ac.ug',
      phone: '0782053937',
      pass: 'AdminOlive2027!',
      name: 'Mr. Bennard Atoo (Principal Director)',
      role: 'Administrator',
      mfa: 0
    },
    {
      email: 'eveline@oliveatapara.ac.ug',
      phone: '0773782383',
      pass: 'EvelineOlive2027!',
      name: 'Madam Eveline (Managing Director & Bursar)',
      role: 'Administrator',
      mfa: 0
    },
    {
      email: 'it@oliveatapara.ac.ug',
      phone: '0782667788',
      pass: 'ITOlive2027!',
      name: 'Mr. Denis Omongo (IT Systems Administrator)',
      role: 'Administrator',
      mfa: 0
    },

    // 2. Admissions & Head Teacher
    {
      email: 'admissions@oliveatapara.ac.ug',
      phone: '0774496507',
      pass: 'AdmitOlive2027!',
      name: 'Mr. Denish Odyek (Head Teacher / Admissions)',
      role: 'Admissions Officer',
      mfa: 0
    },
    {
      email: 'headteacher@oliveatapara.ac.ug',
      phone: '0774496507',
      pass: 'HeadTeacher2027!',
      name: 'Mr. Denish Odyek (Head Teacher)',
      role: 'Admissions Officer',
      mfa: 0
    },

    // 3. Accounts & Bursar Desk
    {
      email: 'accounts@oliveatapara.ac.ug',
      phone: '0773782383',
      pass: 'BursarOlive2027!',
      name: 'Accounts & Bursar Desk',
      role: 'Accounts Officer',
      mfa: 0
    },

    // 4. Content & Communications
    {
      email: 'editor@oliveatapara.ac.ug',
      phone: '0782053937',
      pass: 'EditorOlive2027!',
      name: 'Content & Media Team',
      role: 'Content Editor',
      mfa: 0
    },

    // 5. Academic Faculty & Teaching Staff
    {
      email: 'gloria@oliveatapara.ac.ug',
      phone: '0772101010',
      pass: 'GloriaOlive2027!',
      name: 'Madam Gloria (Deputy Head Teacher)',
      role: 'Teacher',
      mfa: 0
    },
    {
      email: 'dos.okullu@oliveatapara.ac.ug',
      phone: '0782112233',
      pass: 'DosOkullu2027!',
      name: 'Mr. Daniel Okullu (DOS & Senior Man Teacher)',
      role: 'Teacher',
      mfa: 0
    },
    {
      email: 'dos.onanga@oliveatapara.ac.ug',
      phone: '0782223344',
      pass: 'DosOnanga2027!',
      name: 'Mr. Raimond Onanga (Director of Studies - DOS)',
      role: 'Teacher',
      mfa: 0
    },
    {
      email: 'sarah@oliveatapara.ac.ug',
      phone: '0774334455',
      pass: 'SarahOlive2027!',
      name: 'Madam Sarah (Headmistress Nursery Section & Senior Woman Teacher)',
      role: 'Teacher',
      mfa: 0
    },
    {
      email: 'teacher@oliveatapara.ac.ug',
      phone: '0774496507',
      pass: 'TeacherOlive2027!',
      name: 'Staff Teaching Portal',
      role: 'Teacher',
      mfa: 0
    },
    {
      email: 'raymond@oliveatapara.ac.ug',
      phone: '0782778899',
      pass: 'RaymondOlive2027!',
      name: 'Tr. Raymond (Debate Patron & Teacher)',
      role: 'Teacher',
      mfa: 0
    },
    {
      email: 'monica@oliveatapara.ac.ug',
      phone: '0773889900',
      pass: 'MonicaOlive2027!',
      name: 'Tr. Monica (Literary Patron & Teacher)',
      role: 'Teacher',
      mfa: 0
    },

    // 6. Student Welfare & Boarding Section (Matrons)
    {
      email: 'matron.boys@oliveatapara.ac.ug',
      phone: '0782445566',
      pass: 'MatronBoys2027!',
      name: 'Madam Awor Catherine (Matron - Boys Wing)',
      role: 'Welfare Officer',
      mfa: 0
    },
    {
      email: 'matron.girls@oliveatapara.ac.ug',
      phone: '0773556677',
      pass: 'MatronGirls2027!',
      name: 'Madam Adong Stella (Matron - Girls Wing)',
      role: 'Welfare Officer',
      mfa: 0
    },

    // 7. Support Staff (Kitchen & Security)
    {
      email: 'kitchen@oliveatapara.ac.ug',
      phone: '0782990011',
      pass: 'KitchenOlive2027!',
      name: 'Okello Moses (Head Cook & Catering)',
      role: 'Support Staff',
      mfa: 0
    },
    {
      email: 'security@oliveatapara.ac.ug',
      phone: '0774001122',
      pass: 'SecurityOlive2027!',
      name: 'Odongo Morish (School Security & Safety Officer)',
      role: 'Support Staff',
      mfa: 0
    },

    // 8. Parents & Guardians
    {
      email: 'denisogwal@gmail.com',
      phone: '0772987654',
      pass: 'ParentOgwal2027!',
      name: 'Mr. Denis Ogwal (Parent of Brenda Alum, P.1)',
      role: 'Parent',
      mfa: 0
    },
    {
      email: 'okello.patrick@gmail.com',
      phone: '0774496507',
      pass: 'ParentOkello2027!',
      name: 'Mr. Patrick Okello (Parent of Joshua Okello, P.7)',
      role: 'Parent',
      mfa: 0
    },
    {
      email: 'beatrice.akello@gmail.com',
      phone: '0752123456',
      pass: 'ParentAkello2027!',
      name: 'Madam Beatrice Akello (Parent of Sarah Auma, P.3)',
      role: 'Parent',
      mfa: 0
    },

    // 9. Students / Pupils (Candidate & Class Access)
    {
      email: 'student.joshua@oliveatapara.ac.ug',
      phone: 'STU-2026-0042',
      pass: 'CandidateJoshua2027!',
      name: 'Okello Joshua (Primary Seven Candidate - P.7)',
      role: 'Student',
      mfa: 0
    },
    {
      email: 'student.sarah@oliveatapara.ac.ug',
      phone: 'STU-2026-0043',
      pass: 'PupilSarah2027!',
      name: 'Auma Sarah (Primary Three Pupil - P.3)',
      role: 'Student',
      mfa: 0
    },
    {
      email: 'student.brenda@oliveatapara.ac.ug',
      phone: 'STU-2026-0101',
      pass: 'PupilBrenda2027!',
      name: 'Alum Brenda (Primary One Pupil - P.1)',
      role: 'Student',
      mfa: 0
    }
  ];

  const findUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?;');
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, phone, password_hash, salt, full_name, role, status, mfa_enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?);
  `);
  const updateUser = db.prepare(`
    UPDATE users
    SET phone = ?, full_name = ?, role = ?, password_hash = ?, salt = ?
    WHERE id = ?;
  `);

  for (const u of allInitialUsers) {
    const existing = findUser.get(u.email.toLowerCase());
    const { hash, salt } = hashPassword(u.pass);
    if (!existing) {
      insertUser.run(
        crypto.randomUUID(),
        u.email.toLowerCase(),
        u.phone || null,
        hash,
        salt,
        u.name,
        u.role,
        u.mfa || 0,
        new Date().toISOString()
      );
    } else {
      updateUser.run(u.phone || null, u.name, u.role, hash, salt, existing.id);
    }
  }

  // Seed default settings & alert banner
  const checkSettings = db.prepare('SELECT COUNT(*) as count FROM site_settings;').get();
  if (checkSettings.count === 0) {
    const insertSetting = db.prepare('INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?);');
    const now = new Date().toISOString();
    
    insertSetting.run('alert_banner', JSON.stringify({
      enabled: true,
      type: 'announcement',
      message: 'New Admissions for Academic Year 2027 are officially open for Nursery (K-1 to K-3) and Primary (P.1 to P.7). Call 0774496507 or apply online today.'
    }), now);

    insertSetting.run('school_info', JSON.stringify({
      name: 'Olive Nursery and Primary School - Atapara',
      motto: 'Toil to Gain',
      licence: 'ME/P/10412',
      emis: '800048',
      location: 'Awaimunga Village, Ocini Parish, Kamdini Sub-county, Oyam District, Uganda',
      phone_pd: '0782053937',
      phone_md: '0773782383',
      phone_ht: '0774496507',
      bank_name: 'Opportunity Bank, Kamdini branch',
      bank_account: '120396591117',
      bank_account_name: 'Olive Nursery and Primary School - Atapara',
      email: 'olivepri21@gmail.com',
      enrolment: { boys: 179, girls: 188, total: 367 },
      year: 2026
    }), now);
  }

  // Seed notices
  const checkNotices = db.prepare('SELECT COUNT(*) as count FROM notices;').get();
  if (checkNotices.count === 0) {
    const insertNotice = db.prepare('INSERT INTO notices (id, text, is_active, priority, created_at) VALUES (?, ?, ?, ?, ?);');
    const now = new Date().toISOString();
    insertNotice.run(crypto.randomUUID(), 'New admissions open for Academic Year 2027', 1, 1, now);
    insertNotice.run(crypto.randomUUID(), 'Motto: Toil to Gain', 1, 2, now);
    insertNotice.run(crypto.randomUUID(), 'Quality Education from Nursery (K-1 to K-3) to Primary Seven (P.1 to P.7)', 1, 3, now);
    insertNotice.run(crypto.randomUUID(), 'Inquiries & Admissions Hotline: 0774496507 / 0782053937', 1, 4, now);
    insertNotice.run(crypto.randomUUID(), 'Safe, Secure Boarding & Day Facilities in Kamdini, Oyam District', 1, 5, now);
  }

  // Seed events
  const checkEvents = db.prepare('SELECT COUNT(*) as count FROM events;').get();
  if (checkEvents.count === 0) {
    const insertEvent = db.prepare('INSERT INTO events (id, date_str, title, details, category, is_published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);');
    const now = new Date().toISOString();
    insertEvent.run(crypto.randomUUID(), '2026-09-14', 'Term III Opens', 'Third term of the 2026 academic year commences (82 instructional school days).', 'term', 1, now);
    insertEvent.run(crypto.randomUUID(), '2026-10-18', 'P.7 Candidate Dedication Day', 'Special dedication prayer service with parents, staff, and community religious leaders.', 'parents', 1, now);
    insertEvent.run(crypto.randomUUID(), '2026-10-28', 'Mid-Term Competency Assessments', 'Mid-term continuous assessment tests across all classes from Nursery to P.7.', 'exams', 1, now);
    insertEvent.run(crypto.randomUUID(), '2026-11-12', 'Inter-School Athletics & Games Gala', 'Football, netball, track events, and music competition at Atapara Sports Grounds.', 'sports', 1, now);
    insertEvent.run(crypto.randomUUID(), '2026-11-23', 'End of Year Examinations', 'Final promotional examinations for lower and upper primary sections.', 'exams', 1, now);
    insertEvent.run(crypto.randomUUID(), '2026-12-04', 'Term III Closes & Speech Day', 'Official close of 2026 school year, report card distribution, and awards assembly.', 'term', 1, now);
    insertEvent.run(crypto.randomUUID(), '2027-02-01', 'Term I 2027 Opens', 'Beginning of the 2027 academic year. Reporting of all new and continuing pupils.', 'term', 1, now);
  }

  // Seed term dates
  const checkTerms = db.prepare('SELECT COUNT(*) as count FROM term_dates;').get();
  if (checkTerms.count === 0) {
    const insertTerm = db.prepare('INSERT INTO term_dates (id, term_name, opens_date, closes_date, school_days, academic_year, display_order) VALUES (?, ?, ?, ?, ?, ?, ?);');
    insertTerm.run(crypto.randomUUID(), 'Term I 2026', 'Mon 2 Feb 2026', 'Fri 1 May 2026', 89, '2026', 1);
    insertTerm.run(crypto.randomUUID(), 'Term II 2026', 'Mon 25 May 2026', 'Fri 21 Aug 2026', 89, '2026', 2);
    insertTerm.run(crypto.randomUUID(), 'Term III 2026', 'Mon 14 Sep 2026', 'Fri 4 Dec 2026', 82, '2026', 3);
    insertTerm.run(crypto.randomUUID(), 'Term I 2027 (Projected)', 'Mon 1 Feb 2027', 'Fri 30 Apr 2027', 89, '2027', 4);
  }

  // Seed news
  const checkNews = db.prepare('SELECT COUNT(*) as count FROM news;').get();
  if (checkNews.count === 0) {
    const insertNews = db.prepare('INSERT INTO news (id, date_str, title, excerpt, content, image_slug, is_published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);');
    const now = new Date().toISOString();
    insertNews.run(
      crypto.randomUUID(),
      'October 2026',
      'P.7 Candidates Dedication Prayer Service',
      'Our Primary Seven candidates were dedicated in earnest prayer with parents, staff, and clergy gathered to impart blessings.',
      'Olive Nursery and Primary School hosted an inspiring spiritual dedication assembly for all Primary Seven candidates in preparation for their upcoming national Primary Leaving Examinations (PLE). Clergy from the local parishes, the Managing Director Madam Eveline, Head Teacher Mr. Denish Odyek, and devoted parents gathered at the school compound to impart blessings, wisdom, and encouragement. Candidates received personalized blessed scholastic packs and prayer cards.',
      'hero-dedication-prayer',
      1,
      now
    );
    insertNews.run(
      crypto.randomUUID(),
      'November 2026',
      'Admissions Open for Academic Year 2027',
      'Nursery (K-1 to K-3) and Primary (P.1 to P.7) admission positions are officially open for the upcoming year.',
      'Olive Nursery and Primary School - Atapara announces open registration for the 2027 academic session. Parents seeking an academically rigorous, God-fearing, disciplined, and nurturing environment for their children are invited to obtain application forms online or directly from the school administration office in Awaimunga village, Ocini Parish, Kamdini.',
      'hero-teachers-staff',
      1,
      now
    );
    insertNews.run(
      crypto.randomUUID(),
      'September 2026',
      'Annual Parents Consultative General Meeting',
      'Deliberations on student academic progression, school building upgrades, and term schedules.',
      'The school management held a fruitful consultative assembly with our valued parents and guardians. Key resolutions included continuing the modernization of science demonstration kits, enhancing co-curricular sports resources, and maintaining transparent, affordable school fee structures for our community.',
      'hero-campus-entrance',
      1,
      now
    );
  }

  // Seed staff members
  const checkStaff = db.prepare('SELECT COUNT(*) as count FROM staff_members;').get();
  if (checkStaff.count === 0) {
    const insertStaff = db.prepare('INSERT INTO staff_members (id, name, role, initials, category, image_slug, contact, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?);');
    const staffList = [
      { name: 'Mr. Bennard Atoo', role: 'Principal Director', initials: 'PA', cat: 'leadership', img: 'mr-bennard-atoo', ord: 1, contact: '0782053937' },
      { name: 'Madam Eveline', role: 'Managing Director & Bursar', initials: 'MD', cat: 'leadership', img: 'madam-eveline', ord: 2, contact: '0773782383' },
      { name: 'Mr. Denish Odyek', role: 'Head Teacher', initials: 'HT', cat: 'leadership', img: 'mr-denish-odyek', ord: 3, contact: '0774496507' },
      { name: 'Madam Gloria', role: 'Deputy Head Teacher', initials: 'DH', cat: 'leadership', img: '', ord: 4, contact: '' },
      { name: 'Mr. Daniel Okullu & Mr. Raimond Onanga', role: 'Directors of Studies (DOS)', initials: 'DOS', cat: 'administration', img: '', ord: 5, contact: '' },
      { name: 'Madam Sarah', role: 'Headmistress, Nursery Section & Senior Woman Teacher', initials: 'NT', cat: 'leadership', img: 'madam-sarah', ord: 6, contact: '' },
      { name: 'Mr. Daniel Okullu', role: 'Senior Man Teacher', initials: 'SMT', cat: 'teaching', img: '', ord: 7, contact: '' },
      { name: 'Madam Awor Catherine', role: 'Matron (Boys Wing)', initials: 'MB', cat: 'welfare', img: '', ord: 8, contact: '' },
      { name: 'Madam Adong Stella', role: 'Matron (Girls Wing)', initials: 'MG', cat: 'welfare', img: '', ord: 9, contact: '' },
      { name: 'Mr. Denis Omongo', role: 'IT Personnel & Systems Administrator', initials: 'IT', cat: 'administration', img: '', ord: 10, contact: '' },
      { name: 'Tr. Raymond & Tr. Monica', role: 'Debate & Literary Patrons', initials: 'DL', cat: 'teaching', img: '', ord: 11, contact: '' },
      { name: 'Okello Moses', role: 'Head Cook', initials: 'OM', cat: 'support', img: '', ord: 12, contact: '' },
      { name: 'Okii Ivan', role: 'Kitchen & Catering Staff', initials: 'OI', cat: 'support', img: '', ord: 13, contact: '' },
      { name: 'Amongi Susan', role: 'Kitchen & Catering Staff', initials: 'AS', cat: 'support', img: '', ord: 14, contact: '' },
      { name: 'Auma Eunice', role: 'Kitchen & Catering Staff', initials: 'AE', cat: 'support', img: '', ord: 15, contact: '' },
      { name: 'Odongo Morish', role: 'School Security & Safety Officer', initials: 'OM', cat: 'support', img: '', ord: 16, contact: '' }
    ];

    for (const s of staffList) {
      insertStaff.run(crypto.randomUUID(), s.name, s.role, s.initials, s.cat, s.img || '', s.contact || '', s.ord);
    }
  }

  // Seed fee structures
  const checkFees = db.prepare('SELECT COUNT(*) as count FROM fee_structures;').get();
  if (checkFees.count === 0) {
    const insertFee = db.prepare('INSERT INTO fee_structures (id, class_category, day_fees_ugx, boarding_fees_ugx, uniform_ugx, meals_ugx, scholastic_ugx, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?);');
    insertFee.run(
      crypto.randomUUID(),
      'Nursery (Baby K-1, Middle K-2, Top K-3)',
      78000,
      158500,
      85000,
      0,
      35000,
      'Installment / part payment is accepted. Compulsory Holiday Package: UGX 10,000 each term.'
    );
    insertFee.run(
      crypto.randomUUID(),
      'Lower Primary (P.1 – P.3)',
      88500,
      158500,
      95000,
      0,
      35000,
      'Installment / part payment is accepted. Compulsory Holiday Package: UGX 10,000 each term.'
    );
    insertFee.run(
      crypto.randomUUID(),
      'Primary Four (P.4)',
      108500,
      168500,
      105000,
      0,
      35000,
      'Installment / part payment is accepted. Compulsory Holiday Package: UGX 10,000 each term.'
    );
    insertFee.run(
      crypto.randomUUID(),
      'Primary Five (P.5)',
      0,
      168500,
      105000,
      0,
      35000,
      'Boarding is compulsory for P.5, P.6 and P.7. Installment / part payment is accepted. Compulsory Holiday Package: UGX 10,000 each term.'
    );
    insertFee.run(
      crypto.randomUUID(),
      'Primary Six (P.6)',
      0,
      178500,
      105000,
      0,
      35000,
      'Boarding is compulsory for P.5, P.6 and P.7. Installment / part payment is accepted. Compulsory Holiday Package: UGX 10,000 each term.'
    );
    insertFee.run(
      crypto.randomUUID(),
      'Primary Seven (P.7 - Candidate)',
      0,
      188500,
      105000,
      0,
      35000,
      'Boarding is compulsory for P.5, P.6 and P.7. Installment / part payment is accepted. Compulsory Holiday Package: UGX 10,000 each term.'
    );
  }

  // Seed admission requirements
  const checkReqs = db.prepare('SELECT COUNT(*) as count FROM admission_requirements;').get();
  if (checkReqs.count === 0) {
    const insertReq = db.prepare('INSERT INTO admission_requirements (id, requirement_text, display_order) VALUES (?, ?, ?);');
    const reqs = [
      'Duly completed and signed Official Admission Application Form',
      'Photocopy of Child’s Birth Certificate or Church Baptismal Card',
      'Two (2) recent passport-sized color photographs of the child',
      'Previous school report cards/progress transcripts (for Primary P.1 to P.7 applicants)',
      'Medical emergency contact details and immunization/vaccination verification card',
      'One passport-sized photograph of each parent/authorized guardian'
    ];
    reqs.forEach((r, idx) => insertReq.run(crypto.randomUUID(), r, idx + 1));
  }

  // Seed sample transactions for realistic accounts ledger verification
  const checkTxns = db.prepare('SELECT COUNT(*) as count FROM transactions;').get();
  if (checkTxns.count === 0) {
    const insertTxn = db.prepare('INSERT INTO transactions (id, txn_ref, student_name, class_name, fee_category, amount_ugx, payment_method, phone_number, status, payment_date, receipt_number, receipt_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);');
    const now = new Date().toISOString();
    insertTxn.run(
      crypto.randomUUID(),
      'TXN-MTN-20261028-001',
      'Okello Joshua',
      'P.7',
      'Term III Tuition & Exam Fees',
      280000,
      'MTN Mobile Money',
      '0774496507',
      'Completed',
      '2026-10-28 14:22:10',
      'REC-2026-0042',
      JSON.stringify({ payer: 'Mr. Okello Patrick', student: 'Okello Joshua', class: 'P.7', amount: 280000, method: 'MTN Mobile Money' })
    );
    insertTxn.run(
      crypto.randomUUID(),
      'TXN-AIR-20261029-002',
      'Auma Sarah',
      'P.3',
      'Uniform & Scholastic Package',
      140000,
      'Airtel Money',
      '0752123456',
      'Completed',
      '2026-10-29 09:15:44',
      'REC-2026-0043',
      JSON.stringify({ payer: 'Madam Akello Beatrice', student: 'Auma Sarah', class: 'P.3', amount: 140000, method: 'Airtel Money' })
    );
  }

  // Seed sample admissions application for demonstration in the admissions hub
  const checkApps = db.prepare('SELECT COUNT(*) as count FROM admissions_applications;').get();
  if (checkApps.count === 0) {
    const insertApp = db.prepare('INSERT INTO admissions_applications (id, app_number, child_name, class_applied, date_of_birth, gender, boarding_status, guardian_name, guardian_phone, guardian_email, address, previous_school, health_notes, document_path, status, interviewer_notes, received_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);');
    const now = new Date().toISOString();
    insertApp.run(
      crypto.randomUUID(),
      'APP-2027-0101',
      'Alum Brenda',
      'P.1',
      '2020-04-12',
      'Female',
      'Day',
      'Mr. Denis Ogwal',
      '0772987654',
      'denisogwal@gmail.com',
      'Kamdini Trading Centre, Oyam District',
      'Olive Nursery Section (Graduated K-3)',
      'None reported',
      '',
      'Interview',
      'Candidate demonstrated outstanding numeracy and reading readiness during the pre-admission interaction.',
      '2026-10-25',
      now,
      now
    );
  }

  console.log('Database initialized and pre-seeded successfully.');
}

// Initialize tables on require
initDatabase();

module.exports = {
  db,
  hashPassword,
  verifyPassword
};
