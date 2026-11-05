# Olive Nursery and Primary School - Atapara
## Comprehensive Full-Stack Web Platform & School Management System

> **Motto:** *"Toil to Gain"*  
> **Licence:** ME/P/10412 · **EMIS No:** 800048  
> **Location:** Awaimunga Village, Ocini Parish, Kamdini Sub-county, Oyam District, Northern Uganda  
> **Target Deployment:** Q1 2027  

---

### Executive Overview & Alignment with Project Requirements

This digital web infrastructure was developed to fulfill all requirements specified in the **Website Design & Development Services Proposal** for **Olive Nursery and Primary School - Atapara**:

1. **Vibrant Marketing Brochure & Admissions Hub:**
   - Highlights school heritage, Christian moral grounding, vision, mission, and the 7 core values (*Teamwork, Perseverance, Trust, Respect, Empathy, Care, Integrity*).
   - Showcases leadership profiles (Mr. Bennard Atoo, Madam Eveline, Mr. Denish Odyek, Madam Sarah, and Directors of Studies).
   - Provides an **Interactive Fee Estimator** tailored to Ugandan Shillings (UGX) with Day vs. Boarding sections, uniforms, meals, and scholastic materials.
   - Provides both a digital **Online Admission Application** (with document uploads) and a downloadable **Print-Ready Official PDF Admission Form** with school seal.

2. **Operational Informational Hub & CMS:**
   - **Emergency Announcement Ticker & Banner:** Allows administrators to broadcast unscheduled closures, weather alerts, or general notices with instant toggle.
   - **Dynamic Events Calendar:** Interactive categories (*Term Dates, Parents Assemblies, Exams, Sports & Co-Curriculars*) and live **RFC 5545 iCalendar feed** (`/api/calendar/feed.ics`) for synchronization with Android/iOS/Google calendars.
   - **Automated Contextual Routing:** Inquiries are cleanly dispatched to *Admissions*, *Accounts*, *Sports*, or *Administration* channels with automated ticket generation (`TKT-2026-XXXX`).
   - **Secure Parent Remittance Gateway:** Remittance processor supporting MTN Mobile Money, Airtel Money, Bank Deposit, and Credit/Debit Card payments with instant digital receipt generation (`REC-2026-XXXXX`) and printable verification.

3. **Maximum Performance & Low-Bandwidth Mobile Optimization:**
   - Curated and transformed 81 authentic school photographs (195 MB) into responsive **WebP** and compressed JPEG formats (~25 KB thumbnails, ~140 KB high-res lightbox views).
   - Integrated **PWA Service Worker** (`sw.js`) and **Web Manifest** (`manifest.json`) providing offline reading of contact numbers, fee tables, and admission guidelines for parents in low-connectivity areas.
   - Enabled HTTP Gzip/Brotli compression, browser caching, and responsive layouts conforming to **WCAG 2.1 AA** visual contrast and keyboard navigation.

4. **Security & Role-Based Access Control (RBAC):**
   - **Node.js Native SQLite Database** (`node:sqlite`) with WAL mode, foreign keys, and ACID transactions.
   - **Mandatory Multi-Factor Authentication (MFA):** RFC 6238 TOTP authenticator app support (Google Authenticator, Microsoft Authenticator) with 5 emergency recovery backup codes.
   - **Role-Based Permissions:** Isolates marketing content updates from financial configurations and confidential student admission records.
   - **Security Headers:** Strict Content Security Policy (CSP), HSTS, X-Content-Type-Options, Frame protection, and minor student privacy safeguards.

---

### Technology Stack

- **Backend:** Node.js (v24+ Native SQLite `node:sqlite`), Express.js 5, Helmet, Compression, Multer, Crypto (PBKDF2 & HMAC-SHA256).
- **Frontend:** Semantic HTML5, Vanilla JavaScript (ES2022, zero heavy client framework bloat), Modern CSS Design System (Custom Properties, Flexbox, CSS Grid).
- **Asset Processing:** Python Pillow Image Pipeline (Lanczos multi-resolution WebP + JPEG generation).
- **Interoperability:** RESTful JSON APIs, RFC 5545 iCalendar (`.ics`), RFC 4180 CSV Export, JSON Schema Backup & Restore.

---

### Project File Hierarchy

```
Olive-web/
├── server/
│   ├── index.js               # Express application with security middleware & routing
│   ├── db.js                  # Native SQLite connection, schema tables & seed data
│   ├── auth.js                # PBKDF2 hashing, JWT/HMAC sessions, TOTP MFA & RBAC
│   └── routes/
│       ├── auth.js            # Login, MFA verify/setup/enable, password changes
│       ├── content.js         # Notices, events, news, terms, staff, fees, gallery, banner
│       ├── admissions.js      # Applications, document upload, printable PDF form, CSV
│       ├── enquiries.js       # Contact messages with departmental routing, CSV
│       ├── transactions.js    # MoMo/Airtel/Card payment gateway & receipt verification
│       ├── users.js           # Staff account management (Administrator only)
│       ├── audit.js           # System activity audit trail (Administrator only)
│       ├── backup.js          # Full system JSON database backup & restore
│       └── calendar.js        # RFC 5545 iCalendar subscription feed (.ics)
├── public/
│   ├── index.html             # Main public school website & Admissions Hub
│   ├── admin.html             # Staff Administrative CMS Portal
│   ├── manifest.json          # Progressive Web App manifest
│   ├── sw.js                  # Service Worker for offline asset caching
│   ├── robots.txt             # Search engine crawling rules
│   ├── sitemap.xml            # SEO sitemap with schema annotations
│   ├── css/
│   │   ├── main.css           # Public website design system (Crimson/Gold/Burgundy)
│   │   └── admin.css          # Staff CMS dashboard styling
│   ├── js/
│   │   ├── app.js             # Public SPA controller (slider, gallery, modals, forms)
│   │   ├── admin.js           # Admin CMS controller (tabs, metrics, CRUD, MFA, backup)
│   │   └── fee-calculator.js  # Interactive fee estimator with UGX formatting
│   ├── data/
│   │   └── gallery.json       # Index of 80 optimized school photos
│   └── images/
│       ├── logo/              # School crest (WebP & JPG)
│       ├── staff/             # Head teacher, MD, and faculty portraits
│       ├── hero/              # High-impact campus slider images
│       └── gallery/           # Optimized WebP/JPG (thumb/ and large/)
├── data/
│   └── olive_school.db        # Relational SQLite database file
├── scripts/
│   └── process_images.py      # Automated image optimization pipeline
├── tests/
│   └── api.test.js            # Automated verification test suite (33 tests)
├── package.json
└── README.md
```

---

### Getting Started

#### 1. Prerequisites
- **Node.js** v22.x or v24.x (with native `node:sqlite` support)
- **npm** v10+ or v11+
- **Python 3** (with `Pillow` for image optimization)

#### 2. Installation & Running
From the project root:

```powershell
# Install Node dependencies
npm install

# Start the web platform
npm start
```

Once started, access the application in your browser:
- **Public Website:** [http://localhost:3000](http://localhost:3000)
- **Staff CMS Portal:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **Health Check:** [http://localhost:3000/api/health](http://localhost:3000/api/health)
- **Printable Admission Form:** [http://localhost:3000/api/admissions/form/download](http://localhost:3000/api/admissions/form/download)
- **iCalendar Calendar Feed:** [http://localhost:3000/api/calendar/feed.ics](http://localhost:3000/api/calendar/feed.ics)

#### 3. Running the Test Suite
To execute the automated API and security test suite:

```powershell
npm test
```
All 33 test assertions verify endpoints, authentication, RBAC, input sanitization, receipt generation, and backup exports.

---

### Staff CMS Default Accounts & Roles

The system provisions **25 login accounts** across **9 role categories** at startup. Every role is strictly separated by access control — users only see tabs and API data relevant to their function.

#### Leadership & Administration (Full Access)
| Email Address | Role | Default Password |
|---|---|---|
| `admin@oliveatapara.ac.ug` | **Administrator** | `AdminOlive2027!` |
| `eveline@oliveatapara.ac.ug` | **Administrator** | `EvelineOlive2027!` |
| `it@oliveatapara.ac.ug` | **Administrator** | `ITOlive2027!` |

#### Admissions Office
| Email Address | Role | Default Password |
|---|---|---|
| `admissions@oliveatapara.ac.ug` | **Admissions Officer** | `AdmitOlive2027!` |
| `headteacher@oliveatapara.ac.ug` | **Admissions Officer** | `HeadTeacher2027!` |

#### Accounts & Bursar
| Email Address | Role | Default Password |
|---|---|---|
| `accounts@oliveatapara.ac.ug` | **Accounts Officer** | `BursarOlive2027!` |

#### Content & Communications
| Email Address | Role | Default Password |
|---|---|---|
| `editor@oliveatapara.ac.ug` | **Content Editor** | `EditorOlive2027!` |

#### Academic Faculty
| Email Address | Role | Default Password |
|---|---|---|
| `gloria@oliveatapara.ac.ug` | **Teacher** | `GloriaOlive2027!` |
| `dos.okullu@oliveatapara.ac.ug` | **Teacher** | `DosOkullu2027!` |
| `dos.onanga@oliveatapara.ac.ug` | **Teacher** | `DosOnanga2027!` |
| `sarah@oliveatapara.ac.ug` | **Teacher** | `SarahOlive2027!` |
| `teacher@oliveatapara.ac.ug` | **Teacher** | `TeacherOlive2027!` |
| `raymond@oliveatapara.ac.ug` | **Teacher** | `RaymondOlive2027!` |
| `monica@oliveatapara.ac.ug` | **Teacher** | `MonicaOlive2027!` |

#### Welfare & Boarding
| Email Address | Role | Default Password |
|---|---|---|
| `matron.boys@oliveatapara.ac.ug` | **Welfare Officer** | `MatronBoys2027!` |
| `matron.girls@oliveatapara.ac.ug` | **Welfare Officer** | `MatronGirls2027!` |

#### Support Staff
| Email Address | Role | Default Password |
|---|---|---|
| `kitchen@oliveatapara.ac.ug` | **Support Staff** | `KitchenOlive2027!` |
| `security@oliveatapara.ac.ug` | **Support Staff** | `SecurityOlive2027!` |

#### Parents (also self-register via the public website)
| Email Address | Role | Default Password |
|---|---|---|
| `denisogwal@gmail.com` | **Parent** | `ParentOgwal2027!` |
| `okello.patrick@gmail.com` | **Parent** | `ParentOkello2027!` |
| `beatrice.akello@gmail.com` | **Parent** | `ParentAkello2027!` |

#### Students / Pupils
| Email Address | Student ID | Role | Default Password |
|---|---|---|---|
| `student.joshua@oliveatapara.ac.ug` | STU-2026-0042 | **Student** | `CandidateJoshua2027!` |
| `student.sarah@oliveatapara.ac.ug` | STU-2026-0043 | **Student** | `PupilSarah2027!` |
| `student.brenda@oliveatapara.ac.ug` | STU-2026-0101 | **Student** | `PupilBrenda2027!` |

---

### Two-Factor Authentication (MFA) Setup Guide

1. Log into the Staff CMS at `/admin`.
2. Navigate to **Two-Factor Authentication (MFA)** in the sidebar.
3. Click **Generate Setup Key**.
4. Enter the base32 secret key into **Google Authenticator**, **Microsoft Authenticator**, or **Authy**.
5. Input the generated 6-digit TOTP code into the verification box to activate.
6. Store the **5 Emergency Backup Recovery Codes** provided upon activation in a secure location.
7. Subsequent administrative logins will require the secondary 6-digit verification code.

---

### Key Operational Features

#### 1. Interactive Fee Estimator & Remittances Gateway
- Parents can interactively calculate term fees by selecting their child's grade (Nursery, Lower Primary, Upper Primary), attendance mode (Day Scholar vs. Boarder), and optional uniform, meal, and scholastic packages.
- Clicking **Pay Online** opens the Remittance Gateway modal with options for **MTN Mobile Money**, **Airtel Money**, **Bank Deposit**, or **Visa/Mastercard**.
- Upon submission, an official computer-generated receipt is generated and registered in the accounts ledger with a unique reference (`REC-2026-XXXXX`).

#### 2. Automated Contact Routing
Inquiries submitted via the public contact form are automatically categorized and routed to:
- **Admissions Desk:** Entry criteria, vacancies, and interview bookings.
- **Accounts Desk:** Bank deposit inquiries, tuition balance verifications.
- **Sports & Activities:** Fixtures, MDD, debating society, games gala.
- **General Administration:** Head Teacher correspondence.

#### 3. Data Privacy & Audit Trail
- Minor student data is strictly segregated from public API responses.
- All administrative actions (user logins, status updates, content modifications, banner changes) are recorded in the immutable `audit_logs` table with timestamps, user identities, and IP addresses.
- Administrators can export full system backups with one click as structured JSON files for disaster recovery.
