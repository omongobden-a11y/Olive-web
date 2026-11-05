// ==========================================================================
// Olive Nursery and Primary School - Atapara Staff CMS Controller
// ==========================================================================

let currentUser = null;
let currentTab = 'dashboard';
let authToken = localStorage.getItem('olive_staff_token');
let tempLoginToken = null;

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initNav();
});

// Authentication Handling
async function initAuth() {
  const loginContainer = document.getElementById('login-container');
  const adminShell = document.getElementById('admin-shell');

  if (!authToken) {
    showLogin();
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!res.ok) throw new Error('Session invalid');
    const data = await res.json();
    currentUser = data.user;

    // Render User Info in Sidebar
    document.getElementById('user-display-name').textContent = currentUser.name;
    document.getElementById('user-display-role').textContent = currentUser.role;

    loginContainer.style.display = 'none';
    adminShell.style.display = 'flex';

    // Apply role-based menu restrictions
    applyRoleVisibility();

    // Load active tab
    loadTab(currentTab);

  } catch (err) {
    localStorage.removeItem('olive_staff_token');
    authToken = null;
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-container').style.display = 'flex';
  document.getElementById('admin-shell').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('mfa-login-form').style.display = 'none';

  const loginForm = document.getElementById('login-form');
  loginForm.onsubmit = handleLoginSubmit;

  const mfaForm = document.getElementById('mfa-login-form');
  mfaForm.onsubmit = handleMfaLoginSubmit;

  const mfaBack = document.getElementById('mfa-back-btn');
  if (mfaBack) {
    mfaBack.onclick = () => {
      document.getElementById('mfa-login-form').style.display = 'none';
      document.getElementById('login-form').style.display = 'block';
    };
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const alertEl = document.getElementById('login-alert');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Login failed');

    // If MFA is required
    if (data.mfaRequired) {
      tempLoginToken = data.tempToken;
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('mfa-login-form').style.display = 'block';
      document.getElementById('login-mfa-code').focus();
      return;
    }

    // Direct Login Successful
    authToken = data.token;
    localStorage.setItem('olive_staff_token', authToken);
    currentUser = data.user;
    initAuth();

  } catch (err) {
    alertEl.innerHTML = `<div style="background:#fee2e2; border:1px solid #f87171; color:#b91c1c; padding:12px; border-radius:6px; margin-bottom:16px; font-size:0.9rem;">${escapeHtml(err.message)}</div>`;
  }
}

async function handleMfaLoginSubmit(e) {
  e.preventDefault();
  const mfaCode = document.getElementById('login-mfa-code').value;
  const alertEl = document.getElementById('login-alert');

  try {
    const res = await fetch('/api/auth/mfa/verify-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken: tempLoginToken, mfaCode })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'MFA verification failed');

    authToken = data.token;
    localStorage.setItem('olive_staff_token', authToken);
    currentUser = data.user;
    initAuth();

  } catch (err) {
    alertEl.innerHTML = `<div style="background:#fee2e2; border:1px solid #f87171; color:#b91c1c; padding:12px; border-radius:6px; margin-bottom:16px; font-size:0.9rem;">${escapeHtml(err.message)}</div>`;
  }
}

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('olive_staff_token');
  authToken = null;
  currentUser = null;
  showLogin();
});

// Role-Based Access Control Visibility in Navigation
// Every role sees only what is relevant to their function
const ROLE_TAB_ACCESS = {
  'Administrator':      ['dashboard', 'alert', 'notices', 'events', 'news', 'fees', 'staff', 'gallery', 'admissions', 'enquiries', 'transactions', 'users', 'mfa', 'audit', 'backup'],
  'Admissions Officer': ['dashboard', 'admissions', 'enquiries', 'fees', 'events', 'mfa'],
  'Accounts Officer':   ['dashboard', 'transactions', 'fees', 'enquiries', 'mfa'],
  'Content Editor':     ['dashboard', 'alert', 'notices', 'events', 'news', 'fees', 'staff', 'gallery', 'mfa'],
  'Teacher':            ['dashboard', 'events', 'news', 'admissions', 'mfa'],
  'Welfare Officer':    ['dashboard', 'admissions', 'events', 'mfa'],
  'Support Staff':      ['dashboard', 'events', 'mfa'],
  'Parent':             ['dashboard', 'mfa'],
  'Student':            ['dashboard', 'mfa']
};

function applyRoleVisibility() {
  if (!currentUser) return;
  const role = currentUser.role;
  const allowed = ROLE_TAB_ACCESS[role] || ['dashboard', 'mfa'];

  document.querySelectorAll('.admin-nav-item').forEach(item => {
    const tab = item.dataset.tab;
    item.style.display = allowed.includes(tab) ? 'flex' : 'none';
  });

  // Update sidebar role badge colour
  const roleBadge = document.getElementById('user-display-role');
  if (roleBadge) {
    const colours = {
      'Administrator': '#7c2d12',
      'Admissions Officer': '#1e40af',
      'Accounts Officer': '#065f46',
      'Content Editor': '#713f12',
      'Teacher': '#312e81',
      'Welfare Officer': '#be185d',
      'Support Staff': '#374151',
      'Parent': '#0369a1',
      'Student': '#0e7490'
    };
    roleBadge.style.color = colours[role] || '#6b7280';
    roleBadge.style.fontWeight = '700';
  }
}

// Navigation Tabs
function initNav() {
  document.querySelectorAll('.admin-nav-item').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-item').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const tab = link.dataset.tab;
      loadTab(tab);
    });
  });
}

function loadTab(tab) {
  currentTab = tab;
  const contentArea = document.getElementById('admin-content-area');
  const titleEl = document.getElementById('current-tab-title');

  const titles = {
    dashboard: 'Overview Dashboard',
    alert: 'Emergency Announcement Banner',
    notices: 'Marquee Notice Board',
    events: 'Events & Term Dates',
    news: 'News Articles',
    fees: 'School Fees Structure',
    staff: 'Teachers & Staff Management',
    gallery: 'School Photos & Captions',
    admissions: 'Admissions Applications',
    enquiries: 'School Inquiries & Messages',
    transactions: 'School Fees Payments Ledger',
    users: 'Staff User Access (RBAC)',
    mfa: 'Two-Factor Authentication (MFA)',
    audit: 'System Activity Audit Log',
    backup: 'System Backup & Recovery'
  };

  titleEl.textContent = titles[tab] || 'Administration';

  switch (tab) {
    case 'dashboard': renderDashboard(contentArea); break;
    case 'alert': renderAlertBannerTab(contentArea); break;
    case 'notices': renderNoticesTab(contentArea); break;
    case 'events': renderEventsTab(contentArea); break;
    case 'news': renderNewsTab(contentArea); break;
    case 'fees': renderFeesTab(contentArea); break;
    case 'staff': renderStaffTab(contentArea); break;
    case 'gallery': renderGalleryTab(contentArea); break;
    case 'admissions': renderAdmissionsTab(contentArea); break;
    case 'enquiries': renderEnquiriesTab(contentArea); break;
    case 'transactions': renderTransactionsTab(contentArea); break;
    case 'users': renderUsersTab(contentArea); break;
    case 'mfa': renderMfaTab(contentArea); break;
    case 'audit': renderAuditTab(contentArea); break;
    case 'backup': renderBackupTab(contentArea); break;
    default: contentArea.innerHTML = '<p>Select an option from the menu.</p>';
  }
}

// Generic Authenticated API Helper
async function apiFetch(url, options = {}) {
  options.headers = options.headers || {};
  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(url, options);
  if (res.status === 401) {
    localStorage.removeItem('olive_staff_token');
    showLogin();
    throw new Error('Session expired. Please log in again.');
  }
  return res;
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

// 1. DASHBOARD VIEW
async function renderDashboard(container) {
  container.innerHTML = '<p>Loading system metrics…</p>';
  try {
    const [contentRes, appsRes, enqRes, txnRes] = await Promise.all([
      fetch('/api/content/all'),
      apiFetch('/api/admissions/applications'),
      apiFetch('/api/enquiries'),
      apiFetch('/api/transactions')
    ]);

    const content = await contentRes.json();
    const apps = appsRes.ok ? await appsRes.json() : [];
    const enqs = enqRes.ok ? await enqRes.json() : [];
    const txns = txnRes.ok ? await txnRes.json() : { transactions: [], totalAmountUGX: 0 };

    const admittedCount = apps.filter(a => a.status === 'Admitted').length;
    const newEnquiriesCount = enqs.filter(e => e.status === 'New').length;

    container.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">New Enquiries</div>
          <div class="kpi-value">${newEnquiriesCount}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Applications</div>
          <div class="kpi-value">${apps.length}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Admitted Pupils</div>
          <div class="kpi-value">${admittedCount}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Fees Paid (UGX)</div>
          <div class="kpi-value" style="font-size:1.5rem; color:#15803d;">UGX ${(txns.totalAmountUGX || 0).toLocaleString()}</div>
        </div>
      </div>

      <div class="admin-panel">
        <div class="panel-header">
          <h3>Emergency Announcement Banner Status</h3>
          <span class="badge ${content.alert && content.alert.enabled ? 'badge-red' : 'badge-yellow'}">
            ${content.alert && content.alert.enabled ? 'ACTIVE ON WEBSITE' : 'BANNER DISABLED'}
          </span>
        </div>
        <p style="color:var(--admin-muted); font-size:0.95rem;">
          ${content.alert && content.alert.enabled ? escapeHtml(content.alert.message) : 'No critical banner is currently broadcast to parents.'}
        </p>
        <button class="btn btn-secondary btn-sm" onclick="loadTab('alert')" style="margin-top:10px;">
          Adjust Announcement Banner ➔
        </button>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
        <div class="admin-panel">
          <div class="panel-header">
            <h3>Recent Admission Applications</h3>
            <button class="btn btn-secondary btn-sm" onclick="loadTab('admissions')">View All</button>
          </div>
          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr><th>Ref</th><th>Pupil</th><th>Class</th><th>Status</th></tr>
              </thead>
              <tbody>
                ${apps.slice(0, 5).map(a => `
                  <tr>
                    <td><b>${escapeHtml(a.app_number)}</b></td>
                    <td>${escapeHtml(a.child_name)}</td>
                    <td>${escapeHtml(a.class_applied)}</td>
                    <td><span class="badge badge-blue">${escapeHtml(a.status)}</span></td>
                  </tr>
                `).join('') || '<tr><td colspan="4">No applications received yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="admin-panel">
          <div class="panel-header">
            <h3>Recent Incoming Enquiries</h3>
            <button class="btn btn-secondary btn-sm" onclick="loadTab('enquiries')">View All</button>
          </div>
          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr><th>Ticket</th><th>Sender</th><th>Dept</th><th>Status</th></tr>
              </thead>
              <tbody>
                ${enqs.slice(0, 5).map(e => `
                  <tr>
                    <td><b>${escapeHtml(e.ticket_number)}</b></td>
                    <td>${escapeHtml(e.name)}</td>
                    <td>${escapeHtml(e.department)}</td>
                    <td><span class="badge ${e.status === 'New' ? 'badge-red' : 'badge-green'}">${escapeHtml(e.status)}</span></td>
                  </tr>
                `).join('') || '<tr><td colspan="4">No messages received yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error loading dashboard: ${escapeHtml(err.message)}</p>`;
  }
}

// 2. ALERT BANNER TAB
async function renderAlertBannerTab(container) {
  container.innerHTML = '<p>Loading banner settings…</p>';
  try {
    const res = await fetch('/api/content/all');
    const data = await res.json();
    const alert = data.alert || { enabled: false, type: 'announcement', message: '' };

    container.innerHTML = `
      <div class="admin-panel" style="max-width:700px;">
        <div class="panel-header">
          <h3>Emergency Announcement Banner Configuration</h3>
        </div>
        <form id="alert-banner-form">
          <div class="form-group">
            <label>
              <input type="checkbox" id="alert-enabled" ${alert.enabled ? 'checked' : ''}>
              <span style="font-weight:700; font-size:1rem; margin-left:6px;">Display Banner at the Very Top of Website</span>
            </label>
          </div>

          <div class="form-group">
            <label for="alert-type">Banner Urgency Level</label>
            <select id="alert-type" class="form-control">
              <option value="announcement" ${alert.type === 'announcement' ? 'selected' : ''}>Announcement (Standard Crimson)</option>
              <option value="warning" ${alert.type === 'warning' ? 'selected' : ''}>Notice / Important (Warm Amber)</option>
              <option value="emergency" ${alert.type === 'emergency' ? 'selected' : ''}>Emergency / Unscheduled Closure (Bright Red)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="alert-message">Banner Message Text</label>
            <textarea id="alert-message" class="form-control" rows="3" required placeholder="e.g. Due to regional staff development, school will dismiss at 1:00 PM on Friday.">${escapeHtml(alert.message)}</textarea>
          </div>

          <button type="submit" class="btn btn-primary">Save &amp; Update Website Banner</button>
          <div id="alert-save-status" style="margin-top:12px;"></div>
        </form>
      </div>
    `;

    document.getElementById('alert-banner-form').onsubmit = async e => {
      e.preventDefault();
      const statusEl = document.getElementById('alert-save-status');
      statusEl.innerHTML = '<span style="color:var(--admin-muted);">Saving banner…</span>';

      const payload = {
        enabled: document.getElementById('alert-enabled').checked,
        type: document.getElementById('alert-type').value,
        message: document.getElementById('alert-message').value
      };

      try {
        const updateRes = await apiFetch('/api/content/alert-banner', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!updateRes.ok) throw new Error('Save failed');
        statusEl.innerHTML = '<span style="color:#15803d; font-weight:700;">✔ Banner updated and live!</span>';
      } catch (err) {
        statusEl.innerHTML = `<span style="color:#b91c1c;">Error: ${escapeHtml(err.message)}</span>`;
      }
    };
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

// 3. NOTICES TAB
async function renderNoticesTab(container) {
  container.innerHTML = '<p>Loading notices…</p>';
  try {
    const res = await fetch('/api/content/all');
    const data = await res.json();
    const notices = data.notices || [];

    container.innerHTML = `
      <div class="admin-panel">
        <div class="panel-header">
          <h3>Active Marquee Notices</h3>
        </div>
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr><th>Notice Text</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${notices.map(n => `
                <tr>
                  <td><b>${escapeHtml(n.text)}</b></td>
                  <td><span class="badge badge-green">Active</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

// 4. EVENTS TAB
async function renderEventsTab(container) {
  container.innerHTML = '<p>Loading events…</p>';
  try {
    const res = await fetch('/api/content/all');
    const data = await res.json();
    const events = data.events || [];

    container.innerHTML = `
      <div class="admin-panel">
        <div class="panel-header">
          <h3>Calendar Events</h3>
        </div>
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr><th>Date</th><th>Title</th><th>Category</th><th>Details</th></tr>
            </thead>
            <tbody>
              ${events.map(ev => `
                <tr>
                  <td><b>${escapeHtml(ev.d)}</b></td>
                  <td>${escapeHtml(ev.t)}</td>
                  <td><span class="badge badge-blue">${escapeHtml(ev.c)}</span></td>
                  <td>${escapeHtml(ev.p)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

// 5. NEWS TAB
async function renderNewsTab(container) {
  container.innerHTML = '<p>Loading news…</p>';
  try {
    const res = await fetch('/api/content/all');
    const data = await res.json();
    const news = data.news || [];

    container.innerHTML = `
      <div class="admin-panel">
        <div class="panel-header">
          <h3>Published News &amp; Articles</h3>
        </div>
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr><th>Date</th><th>Headline</th><th>Excerpt</th></tr>
            </thead>
            <tbody>
              ${news.map(nw => `
                <tr>
                  <td><b>${escapeHtml(nw.d)}</b></td>
                  <td>${escapeHtml(nw.t)}</td>
                  <td>${escapeHtml(nw.excerpt || nw.p)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

// 6. FEES TAB
async function renderFeesTab(container) {
  container.innerHTML = '<p>Loading fees structure…</p>';
  try {
    const res = await fetch('/api/content/all');
    const data = await res.json();
    const fees = data.fees || [];

    container.innerHTML = `
      <div class="admin-panel">
        <div class="panel-header">
          <h3>School Fees Structure</h3>
        </div>
        <form id="fees-update-form">
          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Class Level</th>
                  <th>Day Fees (UGX)</th>
                  <th>Boarding (UGX)</th>
                  <th>Uniform (UGX)</th>
                  <th>Meals (UGX)</th>
                  <th>Books &amp; Materials (UGX)</th>
                </tr>
              </thead>
              <tbody>
                ${fees.map((f, i) => `
                  <tr>
                    <td><b>${escapeHtml(f.c)}</b><input type="hidden" name="id_${i}" value="${f.id}"></td>
                    <td><input type="number" class="form-control" name="day_${i}" value="${f.day_fees_ugx}" style="width:130px;"></td>
                    <td><input type="number" class="form-control" name="boarding_${i}" value="${f.boarding_fees_ugx}" style="width:130px;"></td>
                    <td><input type="number" class="form-control" name="uniform_${i}" value="${f.uniform_ugx}" style="width:110px;"></td>
                    <td><input type="number" class="form-control" name="meals_${i}" value="${f.meals_ugx}" style="width:110px;"></td>
                    <td><input type="number" class="form-control" name="scholastic_${i}" value="${f.scholastic_ugx}" style="width:110px;"></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top:20px;">Save Updated Fees Structure</button>
          <div id="fees-save-status" style="margin-top:10px;"></div>
        </form>
      </div>
    `;

    document.getElementById('fees-update-form').onsubmit = async e => {
      e.preventDefault();
      const statusEl = document.getElementById('fees-save-status');
      statusEl.innerHTML = '<span style="color:var(--admin-muted);">Saving fees…</span>';

      const updated = fees.map((f, i) => ({
        id: f.id,
        day_fees_ugx: document.querySelector(`[name="day_${i}"]`).value,
        boarding_fees_ugx: document.querySelector(`[name="boarding_${i}"]`).value,
        uniform_ugx: document.querySelector(`[name="uniform_${i}"]`).value,
        meals_ugx: document.querySelector(`[name="meals_${i}"]`).value,
        scholastic_ugx: document.querySelector(`[name="scholastic_${i}"]`).value
      }));

      try {
        const updateRes = await apiFetch('/api/content/fees', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fees: updated })
        });
        if (!updateRes.ok) throw new Error('Save failed');
        statusEl.innerHTML = '<span style="color:#15803d; font-weight:700;">✔ Fees updated successfully!</span>';
      } catch (err) {
        statusEl.innerHTML = `<span style="color:#b91c1c;">Error: ${escapeHtml(err.message)}</span>`;
      }
    };
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

// 7. STAFF TAB
async function renderStaffTab(container) {
  container.innerHTML = '<p>Loading teachers &amp; staff…</p>';
  try {
    const res = await fetch('/api/content/all');
    const data = await res.json();
    const staff = data.staff || [];

    container.innerHTML = `
      <div class="admin-panel">
        <div class="panel-header">
          <h3>Staff &amp; Leadership Directory</h3>
        </div>
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr><th>Name</th><th>Role</th><th>Category</th><th>Initials</th></tr>
            </thead>
            <tbody>
              ${staff.map(s => `
                <tr>
                  <td><b>${escapeHtml(s.n)}</b></td>
                  <td>${escapeHtml(s.r)}</td>
                  <td><span class="badge badge-blue">${escapeHtml(s.cat)}</span></td>
                  <td>${escapeHtml(s.i)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

// 8. ADMISSIONS PIPELINE TAB
async function renderAdmissionsTab(container) {
  container.innerHTML = '<p>Loading applications…</p>';
  try {
    const res = await apiFetch('/api/admissions/applications');
    const apps = await res.json();

    container.innerHTML = `
      <div class="admin-panel">
        <div class="panel-header">
          <h3>Admissions Pipeline (${apps.length} Applications)</h3>
          <div>
            <a href="/api/admissions/export/csv" class="btn btn-secondary btn-sm" download>📥 Download CSV</a>
          </div>
        </div>

        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>App Number</th>
                <th>Child Name</th>
                <th>Class</th>
                <th>Type</th>
                <th>Guardian</th>
                <th>Phone</th>
                <th>Document</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${apps.map(a => `
                <tr>
                  <td><b>${escapeHtml(a.app_number)}</b></td>
                  <td>${escapeHtml(a.child_name)}</td>
                  <td>${escapeHtml(a.class_applied)}</td>
                  <td>${escapeHtml(a.boarding_status)}</td>
                  <td>${escapeHtml(a.guardian_name)}</td>
                  <td><a href="tel:${escapeHtml(a.guardian_phone)}">${escapeHtml(a.guardian_phone)}</a></td>
                  <td>
                    ${a.document_path ? `<a href="${escapeHtml(a.document_path)}" target="_blank" class="btn btn-secondary btn-sm">📄 View Doc</a>` : 'None'}
                  </td>
                  <td>
                    <select class="form-control" style="width:130px; padding:4px;" onchange="updateAppStatus('${a.id}', this.value)">
                      <option value="Received" ${a.status === 'Received' ? 'selected' : ''}>Received</option>
                      <option value="Interview" ${a.status === 'Interview' ? 'selected' : ''}>Interview</option>
                      <option value="Admitted" ${a.status === 'Admitted' ? 'selected' : ''}>Admitted</option>
                      <option value="Waiting list" ${a.status === 'Waiting list' ? 'selected' : ''}>Waiting list</option>
                      <option value="Declined" ${a.status === 'Declined' ? 'selected' : ''}>Declined</option>
                    </select>
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-sm" onclick="editAppNotes('${a.id}', '${escapeHtml(a.interviewer_notes || '')}')">Notes</button>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="9">No applications recorded.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

window.updateAppStatus = async function(id, status) {
  try {
    await apiFetch(`/api/admissions/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  } catch (e) {
    alert('Failed to update status');
  }
};

window.editAppNotes = async function(id, currentNotes) {
  const notes = prompt('Enter candidate / interviewer notes:', currentNotes);
  if (notes !== null) {
    try {
      await apiFetch(`/api/admissions/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewer_notes: notes })
      });
      loadTab('admissions');
    } catch (e) {
      alert('Failed to update notes');
    }
  }
};

// 9. ENQUIRIES TAB
async function renderEnquiriesTab(container) {
  container.innerHTML = '<p>Loading enquiries…</p>';
  try {
    const res = await apiFetch('/api/enquiries');
    const enqs = await res.json();

    container.innerHTML = `
      <div class="admin-panel">
        <div class="panel-header">
          <h3>Inquiries Inbox (${enqs.length} Messages)</h3>
          <div>
            <a href="/api/enquiries/export/csv" class="btn btn-secondary btn-sm" download>📥 Download CSV</a>
          </div>
        </div>

        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Department</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${enqs.map(e => `
                <tr>
                  <td><b>${escapeHtml(e.ticket_number)}</b></td>
                  <td>${escapeHtml(e.name)}</td>
                  <td><a href="tel:${escapeHtml(e.phone)}">${escapeHtml(e.phone)}</a></td>
                  <td><span class="badge badge-blue">${escapeHtml(e.department)}</span></td>
                  <td>${escapeHtml(e.message)}</td>
                  <td>
                    <select class="form-control" style="width:120px; padding:4px;" onchange="updateEnquiryStatus('${e.id}', this.value)">
                      <option value="New" ${e.status === 'New' ? 'selected' : ''}>New</option>
                      <option value="Contacted" ${e.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                      <option value="In Progress" ${e.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                      <option value="Closed" ${e.status === 'Closed' ? 'selected' : ''}>Closed</option>
                    </select>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="6">No enquiries logged.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

window.updateEnquiryStatus = async function(id, status) {
  try {
    await apiFetch(`/api/enquiries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  } catch (e) {
    alert('Failed to update status');
  }
};

// 10. TRANSACTIONS TAB
async function renderTransactionsTab(container) {
  container.innerHTML = '<p>Loading payments…</p>';
  try {
    const res = await apiFetch('/api/transactions');
    const data = await res.json();
    const txns = data.transactions || [];

    container.innerHTML = `
      <div class="admin-panel">
        <div class="panel-header">
          <div>
            <h3>School Fees Payments Ledger</h3>
            <p style="color:#15803d; font-weight:700; margin-top:4px;">Total Collected: UGX ${(data.totalAmountUGX || 0).toLocaleString()}</p>
          </div>
          <div>
            <a href="/api/transactions/export/csv" class="btn btn-secondary btn-sm" download>📥 Download CSV</a>
          </div>
        </div>

        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Txn Ref</th>
                <th>Student</th>
                <th>Class</th>
                <th>Category</th>
                <th>Amount (UGX)</th>
                <th>Method</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${txns.map(t => `
                <tr>
                  <td><b>${escapeHtml(t.receipt_number)}</b></td>
                  <td><code>${escapeHtml(t.txn_ref)}</code></td>
                  <td>${escapeHtml(t.student_name)}</td>
                  <td>${escapeHtml(t.class_name)}</td>
                  <td>${escapeHtml(t.fee_category)}</td>
                  <td style="font-weight:700; color:#15803d;">UGX ${(t.amount_ugx || 0).toLocaleString()}</td>
                  <td>${escapeHtml(t.payment_method)}</td>
                  <td>${escapeHtml(t.payment_date)}</td>
                  <td>
                    <a href="/api/transactions/receipt/${t.receipt_number}" target="_blank" class="btn btn-secondary btn-sm">Receipt</a>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="9">No payments recorded.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

// 11. USERS TAB (Administrator only)
// 11. USER ACCESS & RBAC MANAGEMENT TAB
async function renderUsersTab(container) {
  if (currentUser.role !== 'Administrator') {
    container.innerHTML = '<p>Access restricted to Administrators.</p>';
    return;
  }

  container.innerHTML = '<p>Loading user access register…</p>';
  try {
    const res = await apiFetch('/api/users');
    const users = await res.json();

    container.innerHTML = `
      <div class="admin-panel">
        <div class="panel-header">
          <div>
            <h3 style="margin:0;">User Accounts &amp; Access Control (RBAC)</h3>
            <small style="color:var(--admin-muted);">Add, edit access, change roles, and remove system users.</small>
          </div>
          <span class="badge badge-blue">${users.length} Users Registered</span>
        </div>

        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email / Username</th>
                <th>Phone Number</th>
                <th>Assigned Role</th>
                <th>Account Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td><b>${escapeHtml(u.full_name)}</b></td>
                  <td>${escapeHtml(u.email)}</td>
                  <td>${u.phone ? escapeHtml(u.phone) : '<span style="color:var(--admin-muted);">N/A</span>'}</td>
                  <td><span class="badge ${
                    u.role === 'Administrator' ? 'badge-yellow' :
                    u.role === 'Accounts Officer' ? 'badge-green' :
                    u.role === 'Admissions Officer' ? 'badge-blue' :
                    u.role === 'Content Editor' ? 'badge-yellow' :
                    u.role === 'Teacher' ? 'badge-blue' :
                    u.role === 'Welfare Officer' ? 'badge-green' :
                    u.role === 'Support Staff' ? 'badge-green' :
                    u.role === 'Parent' ? 'badge-blue' :
                    u.role === 'Student' ? 'badge-blue' : 'badge-green'
                  }">${escapeHtml(u.role)}</span></td>
                  <td><span class="badge ${u.status === 'Active' ? 'badge-green' : 'badge-yellow'}">${escapeHtml(u.status)}</span></td>
                  <td style="white-space:nowrap;">
                    <button class="btn btn-secondary btn-sm" onclick="editUserRole('${u.id}', '${escapeHtml(u.full_name)}', '${u.role}', '${u.status}')" style="padding:4px 8px; font-size:0.78rem;">
                      ✏️ Edit Access
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="resetUserPassword('${u.id}', '${escapeHtml(u.full_name)}')" style="padding:4px 8px; font-size:0.78rem;">
                      🔑 Reset Pass
                    </button>
                    ${u.id !== currentUser.id ? `
                      <button class="btn btn-danger btn-sm" onclick="deleteUserAccount('${u.id}', '${escapeHtml(u.full_name)}')" style="padding:4px 8px; font-size:0.78rem;">
                        🗑️ Remove
                      </button>
                    ` : '<span style="font-size:0.78rem; color:var(--admin-muted);">(You)</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-top:32px; border-top:1px solid var(--admin-border); padding-top:24px; max-width:600px;">
          <h4 style="margin:0 0 12px; color:var(--admin-crimson);">Add New User Account</h4>
          <form id="create-user-form">
            <div class="form-group">
              <label>Full Name *</label>
              <input type="text" id="nu-name" class="form-control" required placeholder="e.g. Patrick Ogwal or Madam Gloria">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div class="form-group">
                <label>Email Address *</label>
                <input type="email" id="nu-email" class="form-control" required placeholder="user@oliveatapara.ac.ug">
              </div>
              <div class="form-group">
                <label>Mobile Phone Number</label>
                <input type="tel" id="nu-phone" class="form-control" placeholder="0774496507">
              </div>
            </div>
            <div class="form-group">
              <label>System Access Role *</label>
            <select id="nu-role" class="form-control" required>
                <option value="Administrator">Administrator (Full Access &amp; User Control)</option>
                <option value="Accounts Officer">Accounts Officer (Fees &amp; Payments)</option>
                <option value="Admissions Officer">Admissions Officer (Applications &amp; Inquiries)</option>
                <option value="Content Editor">Content Editor (Events, News &amp; Photos)</option>
                <option value="Teacher">Teacher (Academic Schedules &amp; Admissions View)</option>
                <option value="Welfare Officer">Welfare Officer (Boarding &amp; Matron Access)</option>
                <option value="Support Staff">Support Staff (Kitchen &amp; Security)</option>
                <option value="Parent" selected>Parent / Guardian</option>
                <option value="Student">Student / Pupil</option>
              </select>
            </div>
            <div class="form-group">
              <label>Initial Password (At least 6 characters) *</label>
              <input type="password" id="nu-pass" class="form-control" required minlength="6" placeholder="••••••••">
            </div>
            <button type="submit" class="btn btn-primary">Create User Account ➔</button>
            <div id="nu-status" style="margin-top:10px;"></div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('create-user-form').onsubmit = async e => {
      e.preventDefault();
      const statusEl = document.getElementById('nu-status');
      try {
        const payload = {
          full_name: document.getElementById('nu-name').value,
          email: document.getElementById('nu-email').value,
          phone: document.getElementById('nu-phone').value,
          role: document.getElementById('nu-role').value,
          password: document.getElementById('nu-pass').value
        };
        const createRes = await apiFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const d = await createRes.json();
        if (!createRes.ok) throw new Error(d.error || 'Failed to create user');
        alert('User account created successfully!');
        loadTab('users');
      } catch (err) {
        statusEl.innerHTML = `<span style="color:red;">Error: ${escapeHtml(err.message)}</span>`;
      }
    };
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

// Global user management actions
window.editUserRole = async function(id, name, currentRole, currentStatus) {
  const roles = [
    'Administrator',
    'Accounts Officer',
    'Admissions Officer',
    'Content Editor',
    'Teacher',
    'Welfare Officer',
    'Support Staff',
    'Parent',
    'Student'
  ];
  const newRole = prompt(`Change Role for ${name}:\nOptions:\n${roles.map((r, i) => `${i + 1}. ${r}`).join('\n')}`, currentRole);
  if (!newRole || !roles.includes(newRole)) {
    if (newRole) alert('Invalid role entered. Must match exactly one of:\n' + roles.join(', '));
    return;
  }
  const newStatus = confirm(`Set account status to ACTIVE? (Click OK for Active, Cancel for Inactive)`) ? 'Active' : 'Inactive';

  try {
    const res = await apiFetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole, status: newStatus })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed to update access');
    alert('User access updated successfully!');
    loadTab('users');
  } catch (err) {
    alert(err.message);
  }
};

window.resetUserPassword = async function(id, name) {
  const newPass = prompt(`Enter new password for ${name} (minimum 6 characters):`);
  if (!newPass) return;
  if (newPass.length < 6) {
    alert('Password must be at least 6 characters long.');
    return;
  }

  try {
    const res = await apiFetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_password: newPass })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed to reset password');
    alert(`Password reset successfully for ${name}!`);
  } catch (err) {
    alert(err.message);
  }
};

window.deleteUserAccount = async function(id, name) {
  if (!confirm(`Are you sure you want to permanently remove user account: ${name}?`)) return;

  try {
    const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed to delete user');
    alert(`User ${name} removed.`);
    loadTab('users');
  } catch (err) {
    alert(err.message);
  }
};

// 11B. PHOTO GALLERY & CAPTIONS MANAGEMENT TAB (Major Admin)
async function renderGalleryTab(container) {
  if (currentUser.role !== 'Administrator' && currentUser.role !== 'Content Editor') {
    container.innerHTML = '<p>Access restricted.</p>';
    return;
  }

  container.innerHTML = '<p>Loading photo gallery…</p>';
  try {
    const res = await fetch('/api/content/gallery?limit=60');
    const items = await res.json();

    container.innerHTML = `
      <div class="admin-panel">
        <div class="panel-header">
          <div>
            <h3 style="margin:0;">School Photos &amp; Captions Management</h3>
            <small style="color:var(--admin-muted);">Upload clear, high-resolution school photos with optional captions, or remove outdated photos.</small>
          </div>
          <span class="badge badge-green">${items.length} Photos in Gallery</span>
        </div>

        <!-- Photo Upload Box -->
        <div style="background:#fdfbf7; border:2px dashed var(--admin-border); border-radius:8px; padding:24px; margin-bottom:32px;">
          <h4 style="color:var(--admin-crimson); margin:0 0 14px;">📤 Upload New School Photo</h4>
          <form id="upload-photo-form">
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:16px;">
              <div class="form-group">
                <label>Select Image File (JPG, PNG, WebP) *</label>
                <input type="file" id="up-file" class="form-control" accept="image/*" required>
              </div>
              <div class="form-group">
                <label>Photo Category</label>
                <select id="up-category" class="form-control">
                  <option value="grounds">School Grounds &amp; Campus</option>
                  <option value="learning">Classrooms &amp; Learning</option>
                  <option value="community">School Community &amp; Assemblies</option>
                  <option value="sports">Sports, Games &amp; MDD</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Photo Caption (Optional)</label>
              <input type="text" id="up-caption" class="form-control" placeholder="e.g. Primary Seven candidates receiving scholastic gifts">
            </div>
            <button type="submit" class="btn btn-primary" id="btn-upload-photo">Upload Photo to Gallery ➔</button>
            <div id="upload-status" style="margin-top:10px;"></div>
          </form>
        </div>

        <!-- Current Gallery Visual Grid -->
        <h4 style="margin:0 0 16px;">Current Published Photos (${items.length})</h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:20px;">
          ${items.map(item => `
            <div style="background:#fff; border:1px solid var(--admin-border); border-radius:8px; overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.05); display:flex; flex-direction:column;">
              <div style="height:170px; background:#f4f4f4; overflow:hidden; position:relative;">
                <img src="${item.thumb}" alt="School photo" style="width:100%; height:100%; object-fit:cover;">
                <span class="badge badge-blue" style="position:absolute; top:8px; left:8px; font-size:0.75rem; text-transform:uppercase;">${escapeHtml(item.category)}</span>
              </div>
              <div style="padding:14px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                <p style="font-size:0.86rem; color:var(--text-main); margin:0 0 12px; min-height:36px; line-height:1.4;">
                  ${item.caption ? `<b>Caption:</b> ${escapeHtml(item.caption)}` : '<i style="color:var(--admin-muted);">No caption set</i>'}
                </p>
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; border-top:1px solid var(--admin-border); padding-top:10px;">
                  <button class="btn btn-secondary btn-sm" onclick="editPhotoCaption('${item.id}', '${escapeHtml(item.caption || '')}', '${escapeHtml(item.category)}')" style="font-size:0.78rem; padding:4px 8px;">
                    ✏️ Edit
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="deletePhotoFromGallery('${item.id}')" style="font-size:0.78rem; padding:4px 8px;">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('upload-photo-form').onsubmit = async e => {
      e.preventDefault();
      const fileInput = document.getElementById('up-file');
      const category = document.getElementById('up-category').value;
      const caption = document.getElementById('up-caption').value;
      const statusEl = document.getElementById('upload-status');
      const submitBtn = document.getElementById('btn-upload-photo');

      if (!fileInput.files || !fileInput.files[0]) {
        alert('Please choose an image file to upload');
        return;
      }

      const formData = new FormData();
      formData.append('photo', fileInput.files[0]);
      formData.append('category', category);
      formData.append('caption', caption);

      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading Photo…';

      try {
        const upRes = await apiFetch('/api/content/gallery/upload', {
          method: 'POST',
          body: formData
        });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || 'Upload failed');

        alert('Photo uploaded to gallery successfully!');
        loadTab('gallery');
      } catch (err) {
        statusEl.innerHTML = `<span style="color:red;">Error: ${escapeHtml(err.message)}</span>`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload Photo to Gallery ➔';
      }
    };
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

window.editPhotoCaption = async function(id, currentCaption, currentCategory) {
  const newCaption = prompt('Edit Caption for this photo:', currentCaption);
  if (newCaption === null) return;
  const newCat = prompt('Edit Category (grounds, learning, community, sports):', currentCategory) || currentCategory;

  try {
    const res = await apiFetch(`/api/content/gallery/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption: newCaption, category: newCat })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed to update caption');
    alert('Photo details updated!');
    loadTab('gallery');
  } catch (err) {
    alert(err.message);
  }
};

window.deletePhotoFromGallery = async function(id) {
  if (!confirm('Are you sure you want to permanently delete this photo from the school gallery?')) return;

  try {
    const res = await apiFetch(`/api/content/gallery/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed to delete photo');
    alert('Photo removed from gallery.');
    loadTab('gallery');
  } catch (err) {
    alert(err.message);
  }
};

// 12. MFA SECURITY TAB
async function renderMfaTab(container) {
  container.innerHTML = '<p>Loading security configuration…</p>';
  try {
    const res = await apiFetch('/api/auth/me');
    const data = await res.json();
    const isMfa = data.user.mfaEnabled;

    container.innerHTML = `
      <div class="admin-panel" style="max-width:650px;">
        <div class="panel-header">
          <h3>Two-Factor Authentication (MFA) Security</h3>
          <span class="badge ${isMfa ? 'badge-green' : 'badge-yellow'}">
            ${isMfa ? 'MFA ACTIVE' : 'MFA DISABLED'}
          </span>
        </div>

        <p style="color:var(--admin-muted); font-size:0.95rem;">
          Mandatory secondary verification protocols ensure that institutional administrative backend logins are protected from unauthorized access via RFC 6238 Time-based One-Time Passwords (TOTP).
        </p>

        ${isMfa ? `
          <div style="background:#e8f5e9; border:1px solid #81c784; padding:18px; border-radius:6px; margin:20px 0;">
            <h4 style="color:#2e7d32; margin:0 0 6px;">✔ Your Account is Protected with Two-Factor Authentication</h4>
            <p style="margin:0; font-size:0.9rem;">Whenever you log in, you will be prompted for a 6-digit verification code from your authenticator app.</p>
          </div>
          <button class="btn btn-danger btn-sm" onclick="disableMfa()">Disable Two-Factor Authentication</button>
        ` : `
          <div class="mfa-box">
            <h4>Setup Authenticator App</h4>
            <p style="font-size:0.9rem; color:var(--admin-muted); margin-bottom:14px;">
              Compatible with <b>Google Authenticator</b>, <b>Microsoft Authenticator</b>, or <b>Authy</b>.
            </p>
            <button class="btn btn-primary btn-sm" id="btn-init-mfa">Generate Setup Key ➔</button>
            <div id="mfa-setup-details" style="display:none; margin-top:16px;"></div>
          </div>
        `}
      </div>
    `;

    const initBtn = document.getElementById('btn-init-mfa');
    if (initBtn) {
      initBtn.onclick = async () => {
        const detailsEl = document.getElementById('mfa-setup-details');
        initBtn.disabled = true;
        try {
          const setupRes = await apiFetch('/api/auth/mfa/setup', { method: 'POST' });
          const setupData = await setupRes.json();

          detailsEl.style.display = 'block';
          detailsEl.innerHTML = `
            <div style="background:#fff; border:1px solid var(--admin-border); padding:16px; border-radius:6px;">
              <p style="font-size:0.9rem; margin-bottom:8px;">1. Enter this Secret Key manually into your authenticator app:</p>
              <code style="display:block; background:#f4efe8; padding:8px 12px; font-size:1.1rem; font-weight:700; letter-spacing:2px; text-align:center; margin-bottom:14px;">
                ${setupData.secret}
              </code>
              <p style="font-size:0.9rem; margin-bottom:8px;">2. Enter the 6-digit code generated by your app to verify and activate:</p>
              <form id="verify-mfa-form" style="display:flex; gap:10px;">
                <input type="text" id="mfa-verify-code" class="form-control" placeholder="000000" maxlength="6" style="width:160px; font-size:1.2rem; text-align:center;" required>
                <button type="submit" class="btn btn-primary btn-sm">Confirm &amp; Enable MFA</button>
              </form>
              <div id="mfa-activate-status" style="margin-top:10px;"></div>
            </div>
          `;

          document.getElementById('verify-mfa-form').onsubmit = async ev => {
            ev.preventDefault();
            const code = document.getElementById('mfa-verify-code').value;
            const statusEl = document.getElementById('mfa-activate-status');
            try {
              const enableRes = await apiFetch('/api/auth/mfa/enable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
              });
              const enableData = await enableRes.json();
              if (!enableRes.ok) throw new Error(enableData.error || 'Activation failed');

              alert('Two-Factor Authentication is now enabled!\nYour emergency recovery backup codes:\n' + enableData.backupCodes.join('\n'));
              loadTab('mfa');
            } catch (err) {
              statusEl.innerHTML = `<span style="color:red;">${escapeHtml(err.message)}</span>`;
            }
          };
        } catch (e) {
          alert('Failed to initialize MFA setup');
        }
      };
    }
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

window.disableMfa = async function() {
  const password = prompt('Enter your current password to disable Two-Factor Authentication:');
  if (password) {
    try {
      const res = await apiFetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('MFA disabled');
      loadTab('mfa');
    } catch (e) {
      alert(e.message || 'Failed to disable MFA');
    }
  }
};

// 13. AUDIT ACTIVITY LOG TAB
async function renderAuditTab(container) {
  if (currentUser.role !== 'Administrator') {
    container.innerHTML = '<p>Access restricted to Administrators.</p>';
    return;
  }

  container.innerHTML = '<p>Loading audit trail…</p>';
  try {
    const res = await apiFetch('/api/audit');
    const logs = await res.json();

    container.innerHTML = `
      <div class="admin-panel">
        <div class="panel-header">
          <h3>System Activity Audit Trail</h3>
        </div>
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Details</th><th>IP Address</th></tr>
            </thead>
            <tbody>
              ${logs.map(l => `
                <tr>
                  <td><small>${escapeHtml(l.timestamp.replace('T', ' ').slice(0, 19))}</small></td>
                  <td><b>${escapeHtml(l.user_name)}</b><br><small style="color:var(--admin-muted);">${escapeHtml(l.user_email)}</small></td>
                  <td><span class="badge badge-blue">${escapeHtml(l.action)}</span></td>
                  <td>${escapeHtml(l.details)}</td>
                  <td><small>${escapeHtml(l.ip_address)}</small></td>
                </tr>
              `).join('') || '<tr><td colspan="5">No audit entries found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

// 14. BACKUP & RESTORE TAB
async function renderBackupTab(container) {
  if (currentUser.role !== 'Administrator') {
    container.innerHTML = '<p>Access restricted to Administrators.</p>';
    return;
  }

  container.innerHTML = `
    <div class="admin-panel" style="max-width:650px;">
      <div class="panel-header">
        <h3>System Backup &amp; Recovery</h3>
      </div>
      <p style="color:var(--admin-muted); font-size:0.95rem; margin-bottom:20px;">
        Download a complete, encrypted JSON copy of the school website database containing all notices, calendar events, news articles, staff directories, fee tables, student admissions, inquiries, and ledger transactions.
      </p>

      <div style="background:#f4efe8; border:1px solid var(--admin-border); padding:20px; border-radius:6px; margin-bottom:24px;">
        <h4>📥 Export Complete System Database</h4>
        <p style="font-size:0.88rem; color:var(--admin-muted); margin:6px 0 14px;">Generates a timestamped JSON backup file for secure off-site archival.</p>
        <button class="btn btn-primary" onclick="downloadBackup()">Download Database JSON Backup ➔</button>
      </div>

      <div style="border-top:1px solid var(--admin-border); padding-top:20px;">
        <h4>📤 Restore System from Backup</h4>
        <p style="font-size:0.88rem; color:var(--admin-muted); margin:6px 0 14px;">Select an exported JSON backup file to restore website content and schedules.</p>
        <input type="file" id="restore-file-input" class="form-control" accept=".json" style="margin-bottom:12px;">
        <button class="btn btn-danger" onclick="restoreBackup()">Restore Database from File</button>
        <div id="restore-status" style="margin-top:10px;"></div>
      </div>
    </div>
  `;
}

window.downloadBackup = async function() {
  try {
    const res = await apiFetch('/api/backup/export');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `olive-school-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    alert('Failed to download backup');
  }
};

window.restoreBackup = async function() {
  const fileInput = document.getElementById('restore-file-input');
  const statusEl = document.getElementById('restore-status');
  if (!fileInput.files.length) {
    alert('Please select a JSON backup file first.');
    return;
  }
  if (!confirm('WARNING: Restoring will overwrite existing content with the backup file data. Do you wish to proceed?')) {
    return;
  }

  statusEl.innerHTML = '<span style="color:var(--admin-muted);">Restoring system…</span>';
  try {
    const file = fileInput.files[0];
    const text = await file.text();
    const backupData = JSON.parse(text);

    const res = await apiFetch('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backupData })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);

    statusEl.innerHTML = '<span style="color:#15803d; font-weight:700;">✔ System state restored successfully!</span>';
  } catch (err) {
    statusEl.innerHTML = `<span style="color:#b91c1c;">Restore error: ${escapeHtml(err.message)}</span>`;
  }
};
