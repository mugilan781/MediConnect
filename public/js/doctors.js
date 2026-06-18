const Doctors = {
  currentPage: 1,
  searchDebounce: null,
  selectedDoctorId: null,
  allDoctors: [],
  cmsData: null,

  // ── INIT ──
  async init() {
    await this.loadCMS();
    this.bindEvents();
    await this.loadDoctors();
    await this.loadFeatured();
    this.initScrollAnimations();
  },

  // ── CMS ──
  async loadCMS() {
    try {
      const r = await fetch(`${CONFIG.API_BASE_URL}/cms/page/doctors`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const res = await r.json();
      if (res.success && res.data) {
        this.cmsData = res.data;
        this.renderCMS();
      }
    } catch (e) {
      console.warn('Doctors CMS: Using static fallback.', e.message);
    }
  },

  renderCMS() {
    const d = this.cmsData;
    if (!d) return;
    const { page, sections } = d;
    if (page && typeof UI !== 'undefined' && UI.injectSEO) UI.injectSEO(page);

    if (!sections) return;
    const setText = (sel, val) => { const el = document.querySelector(sel); if (el && val) el.textContent = val; };
    const setHTML = (sel, val) => { const el = document.querySelector(sel); if (el && val) el.innerHTML = val; };

    if (sections.hero) {
      setHTML('.doctors-hero h1', sections.hero.title);
      setText('.doctors-hero p', sections.hero.subtitle);
    }
    if (sections.cta) {
      setText('.doctors-cta h2', sections.cta.title);
      setText('.doctors-cta p', sections.cta.subtitle);
      const btn = document.querySelector('.doctors-cta .btn');
      if (btn && sections.cta.button_text) btn.textContent = sections.cta.button_text;
      if (btn && sections.cta.button_link) btn.href = sections.cta.button_link;
    }
    if (sections.faq && sections.faq.length) {
      const list = document.getElementById('doctors-faq-list');
      if (list) {
        list.innerHTML = sections.faq.map((item, i) => `
          <div class="faq-preview-item">
            <button class="faq-preview-question" onclick="toggleFaq(this)">
              ${item.question}
              <span class="faq-chevron">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </button>
            <div class="faq-preview-answer">
              <div class="faq-preview-answer-inner">${item.answer}</div>
            </div>
          </div>
        `).join('');
      }
    }
    if (sections.process && sections.process.length) {
      const container = document.querySelector('.process-steps');
      if (container) {
        container.innerHTML = sections.process.map((step, i) => `
          <div class="process-step">
            <div class="process-step__icon">${MediIcons.getIconHtml(step.icon || 'star')}</div>
            <h3>${step.title || ''}</h3>
            <p>${step.description || ''}</p>
          </div>
        `).join('');
      }
    }
  },

  // ── EVENTS ──
  bindEvents() {
    const searchInput = document.getElementById('search-doctors');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(this.searchDebounce);
        this.searchDebounce = setTimeout(() => {
          this.currentPage = 1;
          this.loadDoctors();
        }, 400);
      });
    }

    ['filter-specialization', 'filter-experience', 'filter-availability'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          this.currentPage = 1;
          this.loadDoctors();
        });
      }
    });
  },

  // ── LOAD DOCTORS ──
  async loadDoctors() {
    try {
      const search = document.getElementById('search-doctors')?.value || '';
      const specFilter = document.getElementById('filter-specialization')?.value || '';
      const expFilter = document.getElementById('filter-experience')?.value || '';
      const availFilter = document.getElementById('filter-availability')?.value || '';

      let url = `/doctors?page=${this.currentPage}&limit=12&is_available=1`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (specFilter) url += `&specialization=${encodeURIComponent(specFilter)}`;

      const grid = document.getElementById('doctors-grid');
      if (!grid) return;
      grid.innerHTML = Array(3).fill('<div class="skeleton skeleton-doc-card"></div>').join('');

      const response = await Api.get(url);
      if (!response.success) {
        grid.innerHTML = `<div class="doctors-empty"><div class="doctors-empty__icon">${MediIcons.icon('search')}</div><h3>Failed to Load</h3><p>Could not fetch doctor data. Please try again.</p></div>`;
        return;
      }

      let doctors = response.data || [];
      const pag = response.pagination;

      // Client-side filters
      if (expFilter) {
        const [minS, maxS] = expFilter.includes('+') ? [parseInt(expFilter), Infinity] : expFilter.split('-').map(Number);
        doctors = doctors.filter(d => d.experience_years >= minS && d.experience_years <= maxS);
      }
      if (availFilter === 'today') {
        const todayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
        doctors = doctors.filter(d => d.available_days && d.available_days.includes(todayName));
      } else if (availFilter === 'week') {
        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const todayIdx = new Date().getDay();
        const weekDays = [...dayNames.slice(todayIdx), ...dayNames.slice(0, todayIdx)];
        doctors = doctors.filter(d => d.available_days && weekDays.some(day => d.available_days.includes(day)));
      }

      this.allDoctors = doctors;

      const countEl = document.getElementById('results-count');
      if (countEl) countEl.textContent = doctors.length;

      if (!doctors.length) {
        grid.innerHTML = `<div class="doctors-empty"><div class="doctors-empty__icon">${MediIcons.icon('search')}</div><h3>No Doctors Found</h3><p>Try expanding your search or selecting a different specialization.</p><button class="btn btn--secondary" onclick="Doctors.resetFilters()">Clear Filters</button></div>`;
        document.getElementById('doctors-pagination').innerHTML = '';
        return;
      }

      grid.innerHTML = doctors.map(doc => this.renderCard(doc)).join('');

      if (pag) {
        const pagContainer = document.getElementById('doctors-pagination');
        if (pagContainer) {
          // Simple pagination
          let phtml = '';
          const total = pag.totalPages || 1;
          const page = pag.page || 1;
          if (page > 1) phtml += `<button class="btn btn--sm btn--ghost" onclick="Doctors.goToPage(${page - 1})">← Prev</button>`;
          for (let i = 1; i <= total; i++) {
            if (i === page) phtml += `<button class="btn btn--sm btn--primary" disabled style="opacity:0.8">${i}</button>`;
            else if (Math.abs(i - page) <= 2 || i === 1 || i === total)
              phtml += `<button class="btn btn--sm btn--ghost" onclick="Doctors.goToPage(${i})">${i}</button>`;
            else if (Math.abs(i - page) === 3)
              phtml += `<span style="padding:0 var(--space-1);color:var(--color-text-light)">...</span>`;
          }
          if (page < total) phtml += `<button class="btn btn--sm btn--ghost" onclick="Doctors.goToPage(${page + 1})">Next →</button>`;
          pagContainer.innerHTML = phtml;
        }
      }
    } catch (e) {
      console.error('Failed to load doctors:', e);
      const grid = document.getElementById('doctors-grid');
      if (grid) grid.innerHTML = `<div class="doctors-empty"><div class="doctors-empty__icon">${MediIcons.icon('alert')}</div><h3>Error</h3><p>Something went wrong. Please refresh the page.</p></div>`;
    }
  },

  // ── RENDER CARD ──
  renderCard(doc) {
    const initial = doc.full_name ? doc.full_name.charAt(0).toUpperCase() : 'D';
    const rating = this.calcRating(doc.experience_years);
    const stars = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
    const avail = this.getAvailability(doc.available_days, doc.is_available);
    const fee = parseFloat(doc.consultation_fee || 0).toFixed(2);
    return `
      <div class="doc-card">
        <div class="doc-card__top">
          <div class="doc-card__avatar">${initial}</div>
          <div class="doc-card__info">
            <div class="doc-card__name">${doc.full_name}</div>
            <div class="doc-card__spec">${doc.specialization}</div>
            <div class="doc-card__dept">${doc.department || doc.specialization}</div>
            <div class="doc-card__rating">
              <span class="doc-card__stars">${stars}</span>
              <span class="doc-card__rating-text">${rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div class="doc-card__body">
          <div class="doc-card__meta">
            <div class="doc-card__meta-row"><span class="icon">${MediIcons.icon('clipboard')}</span> ${doc.qualification}</div>
            <div class="doc-card__meta-row"><span class="icon">${MediIcons.icon('file')}</span> ${doc.experience_years} years experience</div>
            <div class="doc-card__meta-row"><span class="icon">${MediIcons.icon('clipboard')}</span> License: ${doc.license_number || 'Verified'}</div>
          </div>
          <div class="doc-card__badges">
            <span class="badge-availability badge-availability--${avail.class}">${avail.label}</span>
            <span class="badge-fee">₹${fee}</span>
          </div>
        </div>
        <div class="doc-card__footer">
          <button class="btn btn--primary btn--sm" onclick="Doctors.goBookAppointment(${doc.id})">Book Appointment</button>
          <button class="btn btn--secondary btn--sm" onclick="Doctors.openProfile(${doc.id})">View Profile</button>
        </div>
      </div>
    `;
  },

  // ── RATING ──
  calcRating(exp) {
    if (exp >= 15) return 5.0;
    if (exp >= 10) return 4.5;
    if (exp >= 5) return 4.0;
    if (exp >= 2) return 3.5;
    return 3.0;
  },

  // ── AVAILABILITY ──
  getAvailability(availableDays, isAvailable) {
    if (!isAvailable) return { label: 'Currently Unavailable', class: 'unavailable' };
    if (!availableDays) return { label: 'Schedule TBD', class: 'week' };
    const todayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
    if (availableDays.includes(todayName)) return { label: 'Available Today', class: 'today' };
    return { label: 'Available This Week', class: 'week' };
  },

  // ── PROFILE MODAL (Read-only — no booking form) ──
  async openProfile(doctorId) {
    const overlay = document.getElementById('doctor-profile-overlay');
    const body = document.getElementById('doctor-profile-body');
    if (!overlay || !body) return;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="spinner"></div>';

    try {
      const response = await Api.get(`/doctors/${doctorId}`);
      if (!response.success) {
        body.innerHTML = '<p style="text-align:center;padding:var(--space-8);color:var(--color-text-light)">Failed to load profile.</p>';
        return;
      }
      const doc = response.data;
      this.selectedDoctorId = doctorId;
      const initial = doc.full_name ? doc.full_name.charAt(0).toUpperCase() : 'D';
      const rating = this.calcRating(doc.experience_years);
      const stars = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
      const fee = parseFloat(doc.consultation_fee || 0).toFixed(2);
      const bio = doc.bio || 'Experienced healthcare professional dedicated to providing compassionate, evidence-based medical care to patients.';
      const avail = doc.is_available ? '<span class="badge badge--success" style="font-size:var(--font-size-sm)">Available</span>' : '<span class="badge badge--danger" style="font-size:var(--font-size-sm)">Unavailable</span>';

      body.innerHTML = `
        <div class="doc-profile-header">
          <div class="doc-profile-avatar">${initial}</div>
          <div class="doc-profile-info">
            <h3>${doc.full_name}</h3>
            <div class="spec">${doc.specialization}</div>
            <div class="qual">${doc.qualification}</div>
            <div class="doc-card__rating" style="margin-top:var(--space-1)">
              <span class="doc-card__stars">${stars}</span>
              <span class="doc-card__rating-text">${rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div class="doc-profile-stats">
          <div class="doc-profile-stat"><div class="doc-profile-stat-value">${doc.experience_years} yrs</div><div class="doc-profile-stat-label">Experience</div></div>
          <div class="doc-profile-stat"><div class="doc-profile-stat-value">₹${fee}</div><div class="doc-profile-stat-label">Consultation Fee</div></div>
          <div class="doc-profile-stat"><div class="doc-profile-stat-value">${doc.available_days || 'Mon–Fri'}</div><div class="doc-profile-stat-label">Working Days</div></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-3);margin:var(--space-5) 0;">
          <div style="display:flex;justify-content:space-between;padding:var(--space-3) var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-md);">
            <span style="font-size:var(--font-size-sm);color:var(--color-text-light)">License Number</span>
            <span style="font-size:var(--font-size-sm);font-weight:600">${doc.license_number || 'Verified'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:var(--space-3) var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-md);">
            <span style="font-size:var(--font-size-sm);color:var(--color-text-light)">Availability</span>
            ${avail}
          </div>
          <div style="display:flex;justify-content:space-between;padding:var(--space-3) var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-md);">
            <span style="font-size:var(--font-size-sm);color:var(--color-text-light)">Department</span>
            <span style="font-size:var(--font-size-sm);font-weight:600">${doc.department || doc.specialization}</span>
          </div>
        </div>
        <div class="doc-profile-bio">${bio}</div>
        <div class="doc-profile-actions">
          <button class="btn btn--secondary" onclick="Doctors.closeProfile()">Close</button>
          <button class="btn btn--primary" onclick="Doctors.closeProfile(); Doctors.goBookAppointment(${doctorId})">Book Appointment</button>
        </div>
      `;
    } catch (e) {
      console.error('Profile load failed:', e);
      body.innerHTML = '<p style="text-align:center;padding:var(--space-8);color:var(--color-text-light)">Error loading profile. Please try again.</p>';
    }
  },

  closeProfile() {
    const overlay = document.getElementById('doctor-profile-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
    this.selectedDoctorId = null;
  },

  // ── BOOK APPOINTMENT — Auto demo-login + redirect to dashboard ──
  goBookAppointment(doctorId) {
    // Auto-activate demo patient session if not authenticated
    if (typeof DemoAuth !== 'undefined') {
      DemoAuth.activateDemoMode();
    }
    // Redirect to patient dashboard with doctor pre-selected
    window.location.href = `/patient-dashboard.html?tab=doctors&doctor_id=${doctorId}&action=book`;
  },

  // ── FEATURED SPECIALISTS ──
  async loadFeatured() {
    try {
      const response = await Api.get('/doctors?limit=8&is_available=1');
      if (!response.success || !response.data) return;
      const docs = response.data
        .sort((a, b) => b.experience_years - a.experience_years)
        .slice(0, 4);

      const grid = document.getElementById('featured-grid');
      if (!grid) return;

      grid.innerHTML = docs.map(doc => {
        const initial = doc.full_name ? doc.full_name.charAt(0).toUpperCase() : 'D';
        const rating = this.calcRating(doc.experience_years);
        const stars = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
        return `
          <div class="featured-card">
            <div class="featured-card__avatar">${initial}</div>
            <div class="featured-card__name">${doc.full_name}</div>
            <div class="featured-card__spec">${doc.specialization}</div>
            <div class="featured-card__exp">${doc.experience_years} years · ${doc.qualification}</div>
            <div class="featured-card__rating">${stars}</div>
            <button class="btn btn--primary btn--sm" onclick="Doctors.goBookAppointment(${doc.id})">Book Appointment</button>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.warn('Featured load failed:', e);
    }
  },

  // ── FILTER BY DEPARTMENT ──
  filterByDept(spec) {
    const select = document.getElementById('filter-specialization');
    if (select) select.value = spec;
    this.currentPage = 1;
    this.loadDoctors();
    // Scroll to directory
    document.querySelector('.directory-section')?.scrollIntoView({ behavior: 'smooth' });
    return false;
  },

  // ── RESET FILTERS ──
  resetFilters() {
    ['search-doctors', 'filter-specialization', 'filter-experience', 'filter-availability'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this.currentPage = 1;
    this.loadDoctors();
  },

  // ── PAGINATION ──
  goToPage(page) {
    this.currentPage = page;
    this.loadDoctors();
    document.querySelector('.directory-section')?.scrollIntoView({ behavior: 'smooth' });
  },


  // ── SCROLL ANIMATIONS ──
  initScrollAnimations() {
    const els = document.querySelectorAll('.animate-on-scroll');
    if (!els.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    els.forEach(el => observer.observe(el));
  },

  // ── FORMAT TIME ──
  formatTime(time) {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  Doctors.init();
});
