// ==========================================================================
// Olive Nursery and Primary School - Atapara Client Application Controller
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initMobileMenu();
  initAboutTabs();
  initHeroSlider();
  initContent();
  initGallery();
  initCalendarFilter();
  initModals();
  initUserAuthModal();
  initContactForm();
  initPWA();
  if (window.initFeeCalculator) {
    window.initFeeCalculator();
  }
});

// Theme Management (Light / Dark)
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle');
  const storedTheme = localStorage.getItem('olive_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');

  document.documentElement.setAttribute('data-theme', initialTheme);
  updateThemeIcon(initialTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('olive_theme', nextTheme);
      updateThemeIcon(nextTheme);
    });
  }
}

function updateThemeIcon(theme) {
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = theme === 'dark' ? '??' : '??';
    toggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }
}

// Mobile Menu Navigation
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-toggle');
  const nav = document.getElementById('main-nav');
  if (!menuBtn || !nav) return;

  menuBtn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close nav when clicking a link
  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
}

// Hero Slider
function initHeroSlider() {
  const slides = document.querySelectorAll('.slide');
  const dotsContainer = document.getElementById('slider-dots');
  const prevBtn = document.getElementById('slider-prev');
  const nextBtn = document.getElementById('slider-next');
  if (!slides.length) return;

  let currentIdx = 0;
  let timer = null;
  const slideCount = slides.length;

  // Build dots
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    slides.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.className = `slider-dot ${idx === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Slide ${idx + 1}`);
      dot.addEventListener('click', () => {
        goToSlide(idx);
        restartTimer();
      });
      dotsContainer.appendChild(dot);
    });
  }

  function goToSlide(idx) {
    currentIdx = (idx + slideCount) % slideCount;
    slides.forEach((s, i) => s.classList.toggle('active', i === currentIdx));
    if (dotsContainer) {
      dotsContainer.querySelectorAll('.slider-dot').forEach((d, i) => {
        d.classList.toggle('active', i === currentIdx);
      });
    }
  }

  function nextSlide() {
    goToSlide(currentIdx + 1);
  }

  function prevSlide() {
    goToSlide(currentIdx - 1);
  }

  function startTimer() {
    timer = setInterval(nextSlide, 7500);
  }

  function restartTimer() {
    clearInterval(timer);
    startTimer();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); restartTimer(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); restartTimer(); });

  const heroSection = document.getElementById('hero-slider');
  if (heroSection) {
    heroSection.addEventListener('mouseenter', () => clearInterval(timer));
    heroSection.addEventListener('mouseleave', startTimer);

    // Touch swipe support
    let touchStartX = 0;
    heroSection.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    heroSection.addEventListener('touchend', e => {
      const touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) {
        nextSlide();
        restartTimer();
      } else if (touchEndX - touchStartX > 50) {
        prevSlide();
        restartTimer();
      }
    }, { passive: true });
  }

  startTimer();
}

// About Section Sub-Tabs & Anthem Controller
function initAboutTabs() {
  const buttons = document.querySelectorAll('.about-tab-btn');
  const panels = document.querySelectorAll('.about-tab-panel');
  if (!buttons.length) return;

  function activateTab(tabId) {
    buttons.forEach(btn => {
      const isActive = btn.dataset.tabTarget === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
    panels.forEach(panel => {
      panel.classList.toggle('active', panel.id === tabId);
    });
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      activateTab(btn.dataset.tabTarget);
    });
  });

  const listenBtn = document.getElementById('btn-listen-anthem');
  if (listenBtn) {
    listenBtn.addEventListener('click', () => {
      activateTab('about-anthem');
      const target = document.getElementById('about');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Handle URL hash routing (e.g. #anthem or #values)
  function handleHash() {
    const hash = window.location.hash;
    if (hash === '#anthem') {
      activateTab('about-anthem');
      const target = document.getElementById('about');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    } else if (hash === '#values') {
      activateTab('about-values');
      const target = document.getElementById('about');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    } else if (hash === '#about') {
      activateTab('about-story');
    }
  }

  window.addEventListener('hashchange', handleHash);
  if (window.location.hash === '#anthem' || window.location.hash === '#values') {
    handleHash();
  }
}

// Load dynamic content from Backend API
async function initContent() {
  try {
    const res = await fetch('/api/content/all');
    if (!res.ok) throw new Error('Network response error');
    const data = await res.json();

    // 1. Alert Banner
    const bannerEl = document.getElementById('alert-banner');
    if (bannerEl && data.alert && data.alert.enabled && data.alert.message) {
      const msgEl = document.getElementById('alert-banner-text');
      if (msgEl) msgEl.textContent = data.alert.message;
      bannerEl.hidden = false;
      bannerEl.className = `emergency-banner banner-${data.alert.type || 'announcement'}`;
      bannerEl.style.cursor = 'pointer';
      bannerEl.title = 'Tap anywhere to dismiss this notice';
      const dismissBanner = () => { bannerEl.hidden = true; bannerEl.style.display = 'none'; };
      bannerEl.onclick = dismissBanner;
      bannerEl.addEventListener('touchend', (e) => { e.preventDefault(); dismissBanner(); }, { passive: false });

      const closeBtn = document.getElementById('alert-banner-close');
      if (closeBtn) {
        closeBtn.onclick = (e) => { e.stopPropagation(); dismissBanner(); };
        closeBtn.addEventListener('touchend', (e) => { e.stopPropagation(); e.preventDefault(); dismissBanner(); }, { passive: false });
      }
    }

    // 2. Ticker notices
    const trackEl = document.getElementById('ticker-track');
    if (trackEl && data.notices && data.notices.length) {
      const items = data.notices.map(n => `<span class="ticker-item">${escapeHtml(n.text)}</span>`).join('');
      // Duplicate for smooth infinite loop
      trackEl.innerHTML = items + items;
    }

    // 3. Events List
    const eventsList = document.getElementById('events-container');
    if (eventsList && data.events) {
      renderEvents(data.events);
    }

    // 4. News Articles
    const newsContainer = document.getElementById('news-container');
    if (newsContainer && data.news) {
      renderNews(data.news);
    }

    // 5. Staff Directory
    const staffContainer = document.getElementById('staff-container');
    if (staffContainer && data.staff) {
      renderStaff(data.staff);
    }

  } catch (err) {
    console.warn('Using embedded fallbacks for site content:', err);
  }
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

function renderEvents(events) {
  const container = document.getElementById('events-container');
  if (!container) return;
  const cats = {
    term: { name: 'Term Dates', class: 'tag-term' },
    parents: { name: 'Parents Meeting', class: 'tag-parents' },
    exams: { name: 'Examinations', class: 'tag-exams' },
    sports: { name: 'Sports & Co-Curricular', class: 'tag-sports' }
  };

  container.innerHTML = events.map(ev => {
    const meta = cats[ev.c] || { name: ev.c, class: 'tag-term' };
    return `
      <li class="event-item" data-category="${escapeHtml(ev.c)}">
        <div class="event-date">?? ${escapeHtml(ev.d)}</div>
        <div class="event-info">
          <h4>${escapeHtml(ev.t)}</h4>
          <p>${escapeHtml(ev.p)}</p>
        </div>
        <span class="event-tag ${meta.class}">${meta.name}</span>
      </li>
    `;
  }).join('');
}

function renderNews(newsItems) {
  const container = document.getElementById('news-container');
  if (!container) return;
  container.innerHTML = newsItems.map(item => `
    <article class="news-card">
      <div class="news-img" style="background-image: url('${item.img ? `/images/hero/${item.img}.webp` : '/images/hero/hero-campus-entrance.webp'}')"></div>
      <div class="news-body">
        <span class="news-date">?? ${escapeHtml(item.d)}</span>
        <h3>${escapeHtml(item.t)}</h3>
        <p>${escapeHtml(item.excerpt || item.p)}</p>
      </div>
    </article>
  `).join('');
}

function renderStaff(staffList) {
  const container = document.getElementById('staff-container');
  if (!container) return;
  // Filter for leadership & teaching staff
  const displayStaff = staffList.filter(s => s.cat !== 'support');
  container.innerHTML = displayStaff.map(s => {
    const imgSrc = s.img ? `/images/staff/${s.img}.webp` : `/images/logo/crest.webp`;
    return `
      <div class="staff-card">
        <img src="${imgSrc}" alt="${escapeHtml(s.n)}" class="staff-avatar" loading="lazy">
        <h3>${escapeHtml(s.n)}</h3>
        <div class="staff-role">${escapeHtml(s.r)}</div>
      </div>
    `;
  }).join('');
}

// Calendar Filter Chips
function initCalendarFilter() {
  const chips = document.querySelectorAll('.filter-chips .chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const cat = chip.dataset.category;
      const items = document.querySelectorAll('.events-list .event-item');
      items.forEach(it => {
        if (cat === 'all' || it.dataset.category === cat) {
          it.hidden = false;
        } else {
          it.hidden = true;
        }
      });
    });
  });
}

// Gallery & Lightbox
let galleryItems = [];
let currentLightboxIdx = 0;

async function initGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  try {
    const res = await fetch('/api/content/gallery?limit=40');
    galleryItems = await res.json();
    renderGallery(galleryItems);
  } catch (err) {
    console.error('Gallery loading failed:', err);
  }

  // Gallery category tabs
  const tabs = document.querySelectorAll('.gallery-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.dataset.category;
      if (cat === 'all') {
        renderGallery(galleryItems);
      } else {
        renderGallery(galleryItems.filter(item => item.category === cat));
      }
    });
  });
}

function renderGallery(items) {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  grid.innerHTML = items.map((item, idx) => `
    <div class="gallery-item" data-idx="${idx}" tabindex="0" role="button" aria-label="View photo ${idx + 1}">
      <picture>
        <source srcset="${item.thumb}" type="image/webp">
        <img src="${item.thumbJpg || item.thumb}" alt="Olive Nursery &amp; Primary School - Atapara school grounds" loading="lazy" decoding="async" width="280" height="270">
      </picture>
      <div class="gallery-overlay">
        <h4>${escapeHtml(item.categoryLabel || "School Photo")}</h4>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.gallery-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx, 10);
      openLightbox(items, idx);
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const idx = parseInt(el.dataset.idx, 10);
        openLightbox(items, idx);
      }
    });
  });
}

function openLightbox(list, idx) {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');
  if (!modal || !img || !list[idx]) return;

  currentLightboxIdx = idx;
  const item = list[idx];
  img.src = item.large;
  if (caption) caption.textContent = ''; // Removed caption per instruction
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  if (prevBtn) prevBtn.onclick = () => openLightbox(list, (currentLightboxIdx - 1 + list.length) % list.length);
  if (nextBtn) nextBtn.onclick = () => openLightbox(list, (currentLightboxIdx + 1) % list.length);
}

function closeLightbox() {
  const modal = document.getElementById('lightbox-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Modals: Application & Remittances
function initModals() {
  // Lightbox close
  const lbClose = document.getElementById('lightbox-close');
  if (lbClose) lbClose.onclick = closeLightbox;
  const lbModal = document.getElementById('lightbox-modal');
  if (lbModal) {
    lbModal.addEventListener('click', e => {
      if (e.target === lbModal) closeLightbox();
    });
  }

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeLightbox();
      closeApplicationModal();
      closeAdmissionDateNoticeModal();
      closePaymentModal();
      const authModal = document.getElementById('user-auth-modal');
      if (authModal) authModal.classList.remove('active');
    }
  });

  // Admission application modal with date lock
  // Applications begin 4th January 2027 and end 14th February 2027
  const openAppBtns = document.querySelectorAll('[data-open-admission]');
  openAppBtns.forEach(b => b.addEventListener('click', handleAdmissionClick));
  const closeAppBtn = document.getElementById('admission-modal-close');
  if (closeAppBtn) closeAppBtn.onclick = closeApplicationModal;

  const dateNoticeClose = document.getElementById('admission-date-modal-close');
  if (dateNoticeClose) dateNoticeClose.onclick = closeAdmissionDateNoticeModal;
  const dateNoticeOk = document.getElementById('admission-date-modal-ok');
  if (dateNoticeOk) dateNoticeOk.onclick = closeAdmissionDateNoticeModal;
  const dateModal = document.getElementById('admission-date-modal');
  if (dateModal) {
    dateModal.addEventListener('click', e => { if (e.target === dateModal) closeAdmissionDateNoticeModal(); });
  }

  const appForm = document.getElementById('online-admission-form');
  if (appForm) {
    appForm.addEventListener('submit', handleApplicationSubmit);
  }

  // Payment remittance modal
  const openPayBtns = document.querySelectorAll('[data-open-payment]');
  openPayBtns.forEach(b => b.addEventListener('click', () => window.openPaymentModal()));
  const closePayBtn = document.getElementById('payment-modal-close');
  if (closePayBtn) closePayBtn.onclick = closePaymentModal;

  const payForm = document.getElementById('remittance-payment-form');
  if (payForm) {
    payForm.addEventListener('submit', handlePaymentSubmit);
  }
}

function handleAdmissionClick(e) {
  if (e) e.preventDefault();
  const now = new Date();
  const startDate = new Date('2027-01-04T00:00:00');
  const endDate = new Date('2027-02-14T23:59:59');

  // Application only active starting 4th Jan 2027 to 14th Feb 2027
  if (now < startDate || now > endDate) {
    openAdmissionDateNoticeModal();
  } else {
    openApplicationModal();
  }
}

function openAdmissionDateNoticeModal() {
  const modal = document.getElementById('admission-date-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeAdmissionDateNoticeModal() {
  const modal = document.getElementById('admission-date-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function openApplicationModal() {
  const modal = document.getElementById('admission-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeApplicationModal() {
  const modal = document.getElementById('admission-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

async function handleApplicationSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const alertEl = document.getElementById('admission-form-alert');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Application…';
  }

  try {
    const formData = new FormData(form);
    const res = await fetch('/api/admissions/apply', {
      method: 'POST',
      body: formData
    });
    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Failed to submit application');
    }

    if (alertEl) {
      alertEl.innerHTML = `
        <div style="background:#e8f5e9; border:1px solid #81c784; color:#2e7d32; padding:16px; border-radius:6px; margin-bottom:16px;">
          <h4 style="margin:0 0 6px;">?? Application Submitted Successfully!</h4>
          <p style="margin:0;">Reference Number: <b>${result.appNumber}</b></p>
          <p style="margin:4px 0 0; font-size:0.9rem;">Thank you, ${escapeHtml(result.details.guardianName)}. We have received your application and the Head Teacher will contact you shortly.</p>
        </div>
      `;
    }
    form.reset();
  } catch (err) {
    if (alertEl) {
      alertEl.innerHTML = `
        <div style="background:#ffebee; border:1px solid #e57373; color:#c62828; padding:14px; border-radius:6px; margin-bottom:16px;">
          <b>Error:</b> ${escapeHtml(err.message)}
        </div>
      `;
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application';
    }
  }
}

// Payment Modal
window.openPaymentModal = function(defaults = {}) {
  const modal = document.getElementById('payment-modal');
  if (!modal) return;

  if (defaults.className) {
    const classInput = document.getElementById('pay-class');
    if (classInput) {
      for (const opt of classInput.options) {
        if (opt.value === defaults.className || opt.text.includes(defaults.className)) {
          classInput.value = opt.value;
          break;
        }
      }
    }
  }
  if (defaults.feeCategory) {
    const catInput = document.getElementById('pay-category');
    if (catInput) {
      for (const opt of catInput.options) {
        if (opt.value === defaults.feeCategory || opt.text.includes(defaults.feeCategory)) {
          catInput.value = opt.value;
          break;
        }
      }
    }
  }
  if (defaults.amount) {
    const amtInput = document.getElementById('pay-amount');
    if (amtInput) amtInput.value = defaults.amount;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

function closePaymentModal() {
  const modal = document.getElementById('payment-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

async function handlePaymentSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const alertEl = document.getElementById('payment-form-alert');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing Payment…';
  }

  try {
    const payload = {
      student_name: document.getElementById('pay-student').value,
      class_name: document.getElementById('pay-class').value,
      fee_category: document.getElementById('pay-category').value,
      amount_ugx: document.getElementById('pay-amount').value,
      payment_method: document.getElementById('pay-method').value,
      phone_number: document.getElementById('pay-phone').value,
      payer_name: document.getElementById('pay-payer').value
    };

    const res = await fetch('/api/transactions/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (!res.ok) throw new Error(result.error || 'Payment processing failed');

    if (alertEl) {
      alertEl.innerHTML = `
        <div style="background:#e8f5e9; border:1px solid #81c784; color:#2e7d32; padding:18px; border-radius:6px; margin-bottom:16px;">
          <h4 style="margin:0 0 6px;">? Payment Completed Successfully!</h4>
          <p style="margin:0;">Receipt Number: <b>${result.receiptNumber}</b></p>
          <p style="margin:0;">Transaction Reference: <b>${result.txnRef}</b></p>
          <p style="margin:12px 0 0;">
            <a href="/api/transactions/receipt/${result.receiptNumber}" target="_blank" class="btn btn-primary btn-sm">??? View &amp; Print Official School Receipt</a>
          </p>
        </div>
      `;
    }
    form.reset();
  } catch (err) {
    if (alertEl) {
      alertEl.innerHTML = `
        <div style="background:#ffebee; border:1px solid #e57373; color:#c62828; padding:14px; border-radius:6px; margin-bottom:16px;">
          <b>Transaction Error:</b> ${escapeHtml(err.message)}
        </div>
      `;
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete Payment & Get Receipt ?';
    }
  }
}

// Contact Form with Automated Departmental Routing
function initContactForm() {
  const form = document.getElementById('contact-routing-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const alertEl = document.getElementById('contact-form-alert');

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending message…';
    }

    try {
      const payload = {
        name: document.getElementById('contact-name').value,
        phone: document.getElementById('contact-phone').value,
        email: document.getElementById('contact-email').value,
        department: document.getElementById('contact-dept').value,
        message: document.getElementById('contact-message').value
      };

      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send enquiry');

      if (alertEl) {
        alertEl.innerHTML = `
          <div style="background:#e8f5e9; border:1px solid #81c784; color:#2e7d32; padding:16px; border-radius:6px; margin-top:16px;">
            <h4 style="margin:0 0 6px;">? Message Sent Successfully!</h4>
            <p style="margin:0;">Ticket Number: <b>${data.ticketNumber}</b></p>
            <p style="margin:4px 0 0; font-size:0.92rem;">${escapeHtml(data.message)}</p>
          </div>
        `;
      }
      form.reset();
    } catch (err) {
      if (alertEl) {
        alertEl.innerHTML = `
          <div style="background:#ffebee; border:1px solid #e57373; color:#c62828; padding:14px; border-radius:6px; margin-top:16px;">
            <b>Error:</b> ${escapeHtml(err.message)}
          </div>
        `;
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Send Message';
      }
    }
  });
}

// Register PWA Service Worker
function initPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('Service Worker registration skipped:', err);
      });
    });
  }
}

// Parent & Normal User Account Authentication Controller
function initUserAuthModal() {
  const loginBtn = document.getElementById('btn-login');
  const footerLoginBtn = document.getElementById('btn-login-footer');
  const modal = document.getElementById('user-auth-modal');
  const closeBtn = document.getElementById('user-auth-close');
  const tabLogin = document.getElementById('auth-tab-login');
  const tabRegister = document.getElementById('auth-tab-register');
  const tabForgot = document.getElementById('auth-tab-forgot');
  const linkForgot = document.getElementById('link-goto-forgot');

  const formLogin = document.getElementById('parent-login-form');
  const formRegister = document.getElementById('parent-register-form');
  const flowForgot = document.getElementById('parent-forgot-flow');
  const alertEl = document.getElementById('user-auth-alert');

  if (!modal) return;

  function openModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    showTab('login');
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (alertEl) alertEl.innerHTML = '';
  }

  if (loginBtn) {
    loginBtn.onclick = openModal;
    loginBtn.addEventListener('touchend', (e) => { e.preventDefault(); openModal(); }, { passive: false });
  }
  if (footerLoginBtn) {
    footerLoginBtn.onclick = openModal;
    footerLoginBtn.addEventListener('touchend', (e) => { e.preventDefault(); openModal(); }, { passive: false });
  }
  if (closeBtn) closeBtn.onclick = closeModal;
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  function showTab(tab) {
    if (alertEl) alertEl.innerHTML = '';
    [tabLogin, tabRegister, tabForgot].forEach(t => {
      if (t) {
        t.classList.remove('active');
        t.style.borderBottom = '';
      }
    });

    if (formLogin) formLogin.style.display = 'none';
    if (formRegister) formRegister.style.display = 'none';
    if (flowForgot) flowForgot.style.display = 'none';

    if (tab === 'login') {
      if (tabLogin) { tabLogin.classList.add('active'); tabLogin.style.borderBottom = ''; }
      if (formLogin) formLogin.style.display = 'block';
    } else if (tab === 'register') {
      if (tabRegister) { tabRegister.classList.add('active'); tabRegister.style.borderBottom = ''; }
      if (formRegister) formRegister.style.display = 'block';
    } else if (tab === 'forgot') {
      if (tabForgot) { tabForgot.classList.add('active'); tabForgot.style.borderBottom = ''; }
      if (flowForgot) flowForgot.style.display = 'block';
      const s1 = document.getElementById('forgot-step-1');
      const s2 = document.getElementById('forgot-step-2');
      if (s1) s1.style.display = 'block';
      if (s2) s2.style.display = 'none';
    }
  }

  if (tabLogin) tabLogin.onclick = () => showTab('login');
  if (tabRegister) tabRegister.onclick = () => showTab('register');
  if (tabForgot) tabForgot.onclick = () => showTab('forgot');
  if (linkForgot) linkForgot.onclick = () => showTab('forgot');

  // Handle Login
  if (formLogin) {
    formLogin.onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('plogin-id').value;
      const password = document.getElementById('plogin-password').value;
      const btn = formLogin.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: id, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        // Role-based routing: staff go to CMS, parents/students stay on main site
        const staffRoles = ['Administrator','Admissions Officer','Accounts Officer','Content Editor','Teacher','Welfare Officer','Support Staff'];
        const isStaff = staffRoles.includes(data.user.role);

        localStorage.setItem('olive_parent_token', data.token);
        localStorage.setItem('olive_parent_user', JSON.stringify(data.user));
        if (isStaff) {
          localStorage.setItem('olive_staff_token', data.token);
          localStorage.setItem('olive_staff_user', JSON.stringify(data.user));
        }

        if (alertEl) {
          alertEl.innerHTML = `<div style="background:#e8f5e9; border:1px solid #81c784; color:#2e7d32; padding:12px; border-radius:6px; margin-bottom:14px;">? Welcome, <b>${escapeHtml(data.user.name)}</b>! Login successful.</div>`;
        }
        const firstName = data.user.name.split(' ')[0];
        if (isStaff) { setTimeout(() => { window.location.href = '/admin'; }, 900); } else { if (loginBtn) loginBtn.textContent = '?? ' + firstName; if (footerLoginBtn) footerLoginBtn.textContent = '?? ' + firstName; setTimeout(closeModal, 1200); }
        // redirect/close handled above
      } catch (err) {
        if (alertEl) {
          alertEl.innerHTML = `<div style="background:#fee2e2; border:1px solid #f87171; color:#b91c1c; padding:12px; border-radius:6px; margin-bottom:14px;">${escapeHtml(err.message)}</div>`;
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    };
  }

  // Handle Register
  if (formRegister) {
    formRegister.onsubmit = async (e) => {
      e.preventDefault();
      const full_name = document.getElementById('preg-name').value;
      const phone = document.getElementById('preg-phone').value;
      const email = document.getElementById('preg-email').value;
      const password = document.getElementById('preg-pass').value;
      const btn = formRegister.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name, phone, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        // Role-based routing: staff go to CMS, parents/students stay on main site
        const staffRoles = ['Administrator','Admissions Officer','Accounts Officer','Content Editor','Teacher','Welfare Officer','Support Staff'];
        const isStaff = staffRoles.includes(data.user.role);

        localStorage.setItem('olive_parent_token', data.token);
        localStorage.setItem('olive_parent_user', JSON.stringify(data.user));
        if (isStaff) {
          localStorage.setItem('olive_staff_token', data.token);
          localStorage.setItem('olive_staff_user', JSON.stringify(data.user));
        }

        if (alertEl) {
          alertEl.innerHTML = `<div style="background:#e8f5e9; border:1px solid #81c784; color:#2e7d32; padding:12px; border-radius:6px; margin-bottom:14px;">?? Account created! Welcome, <b>${escapeHtml(data.user.name)}</b>.</div>`;
        }
        if (loginBtn) loginBtn.textContent = '?? ' + data.user.name.split(' ')[0];
        if (footerLoginBtn) footerLoginBtn.textContent = '?? ' + data.user.name.split(' ')[0];
        setTimeout(closeModal, 1400);
      } catch (err) {
        if (alertEl) {
          alertEl.innerHTML = `<div style="background:#fee2e2; border:1px solid #f87171; color:#b91c1c; padding:12px; border-radius:6px; margin-bottom:14px;">${escapeHtml(err.message)}</div>`;
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    };
  }

  // Handle Forgot Password - Step 1: Request Code
  let currentForgotIdentifier = '';
  const reqCodeBtn = document.getElementById('btn-request-code');
  if (reqCodeBtn) {
    reqCodeBtn.onclick = async () => {
      const id = document.getElementById('pforgot-id').value;
      if (!id) {
        if (alertEl) alertEl.innerHTML = `<div style="background:#fee2e2; color:#b91c1c; padding:10px; border-radius:6px;">Please enter your registered phone or email</div>`;
        return;
      }
      reqCodeBtn.disabled = true;
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate recovery code');

        currentForgotIdentifier = data.identifier;
        document.getElementById('forgot-step-1').style.display = 'none';
        const step2 = document.getElementById('forgot-step-2');
        step2.style.display = 'block';

        const codeBanner = document.getElementById('forgot-code-banner');
        if (codeBanner) {
          codeBanner.innerHTML = `
            ?? <b>Your 6-Digit Recovery Code:</b> <code style="font-size:1.35rem; font-weight:800; letter-spacing:4px; background:#fff; padding:3px 10px; border-radius:4px; color:#0369a1;">${data.code}</code><br>
            <span style="font-size:0.85rem; color:#0c4a6e; margin-top:4px; display:inline-block;">Enter this 6-digit code below along with your new password to restore your account.</span>
          `;
        }
        const codeInput = document.getElementById('preset-code');
        if (codeInput) codeInput.value = data.code;
      } catch (err) {
        if (alertEl) {
          alertEl.innerHTML = `<div style="background:#fee2e2; border:1px solid #f87171; color:#b91c1c; padding:12px; border-radius:6px;">${escapeHtml(err.message)}</div>`;
        }
      } finally {
        reqCodeBtn.disabled = false;
      }
    };
  }

  // Handle Forgot Password - Step 2: Reset Password
  const submitResetBtn = document.getElementById('btn-submit-reset');
  if (submitResetBtn) {
    submitResetBtn.onclick = async () => {
      const code = document.getElementById('preset-code').value;
      const newPassword = document.getElementById('preset-newpass').value;
      if (!code || !newPassword) {
        if (alertEl) alertEl.innerHTML = `<div style="background:#fee2e2; color:#b91c1c; padding:10px; border-radius:6px;">Please enter the 6-digit code and a new password</div>`;
        return;
      }
      submitResetBtn.disabled = true;
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: currentForgotIdentifier, code, newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Reset failed');

        if (alertEl) {
          alertEl.innerHTML = `<div style="background:#e8f5e9; border:1px solid #81c784; color:#2e7d32; padding:12px; border-radius:6px; margin-bottom:14px;">? ${escapeHtml(data.message)}</div>`;
        }
        setTimeout(() => {
          showTab('login');
          const loginInput = document.getElementById('plogin-id');
          if (loginInput) loginInput.value = currentForgotIdentifier;
        }, 1500);
      } catch (err) {
        if (alertEl) {
          alertEl.innerHTML = `<div style="background:#fee2e2; border:1px solid #f87171; color:#b91c1c; padding:12px; border-radius:6px;">${escapeHtml(err.message)}</div>`;
        }
      } finally {
        submitResetBtn.disabled = false;
      }
    };
  }

  // Check if user is already logged in
  const storedUser = localStorage.getItem('olive_parent_user');
  if (storedUser && parentLoginBtn) {
    try {
      const u = JSON.parse(storedUser);
      if (u && u.name && loginBtn) { loginBtn.textContent = '?? ' + u.name.split(' ')[0]; }
    } catch (e) {}
  }
}
