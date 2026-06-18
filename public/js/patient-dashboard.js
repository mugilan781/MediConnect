// ============================================================
// MediConnect – public/js/patient-dashboard.js
// Client-side SPA controller for Patient Dashboard
// Each tab is strictly isolated to its own feature domain
// ============================================================

const PatientDashboard = {
  _loadedTabs: {},
  _doctorPage: 1,
  _apptPage: 1,
  _consultPage: 1,
  _reportPage: 1,
  _historyPage: 1,
  _notifPage: 1,
  _samplePage: 1,
  _searchDebounce: null,

  // ══════════════════════════════════════
  // INIT
  // ══════════════════════════════════════
  async init() {
    const user = Auth.getUser();
    const isDemo = !user || user.role !== 'patient';
    if (isDemo && typeof DemoAuth === 'undefined') {
      window.location.href = '/login.html';
      return;
    }
    this.setupTabs();
    this.bindGlobalEvents();
    const params = new URLSearchParams(window.location.search);
    const initialTab = params.get('tab') || 'overview';
    this.switchTab(initialTab);

    // Auto-open modals from URL params (used by public page redirects)
    const action = params.get('action');
    const doctorId = params.get('doctor_id');
    const testId = params.get('test_id');
    if (action) {
      // Small delay to let the tab content render first
      setTimeout(() => this._handleAutoAction(action, doctorId, testId), 600);
    }
  },

  /**
   * Handle auto-open actions from URL params.
   * Called after redirect from public pages (Doctors, Lab Tests, etc.)
   */
  _handleAutoAction(action, doctorId, testId) {
    switch (action) {
      case 'book':
        if (doctorId) {
          this.bookDoctorAppointment(parseInt(doctorId, 10));
        } else if (testId) {
          this._autoBookLabTest(parseInt(testId, 10));
        }
        break;
      case 'request':
        // Auto-open request modals for consultations / sample collection
        const tab = new URLSearchParams(window.location.search).get('tab');
        if (tab === 'consultations') {
          this._autoRequestConsultation(doctorId ? parseInt(doctorId, 10) : null);
        } else if (tab === 'sample-collection') {
          this._autoRequestSampleCollection();
        }
        break;
    }
    // Clean the URL params after handling (keep only tab)
    const cleanUrl = `${window.location.pathname}?tab=${new URLSearchParams(window.location.search).get('tab') || 'overview'}`;
    window.history.replaceState(null, '', cleanUrl);
  },

  /** Auto-open lab booking modal with a specific test pre-selected */
  async _autoBookLabTest(testId) {
    try {
      const response = await Api.get(`/lab-tests/${testId}`);
      if (response.success && response.data) {
        const test = response.data;
        document.getElementById('pd-book-lab-test-id').value = test.id;
        document.getElementById('pd-book-lab-test-name').textContent = test.test_name;
        const dateInput = document.getElementById('pd-book-lab-date');
        if (dateInput) { dateInput.value = ''; dateInput.setAttribute('min', new Date().toISOString().split('T')[0]); }
        UI.openModal('pd-book-lab-modal');
      }
    } catch (e) { console.warn('Auto-book lab test failed:', e); }
  },

  /** Auto-open consultation request modal with optional doctor pre-selected */
  async _autoRequestConsultation(doctorId) {
    // Load doctors dropdown first
    try {
      const response = await Api.get('/doctors?limit=100&is_available=1');
      if (response.success) {
        const select = document.getElementById('pd-request-doctor');
        if (select) {
          select.innerHTML = '<option value="">Select a doctor...</option>' +
            response.data.map(d => `<option value="${d.id}">${d.full_name} — ${d.specialization}</option>`).join('');
          if (doctorId) select.value = doctorId;
        }
      }
    } catch (e) { /* ignore */ }
    const dateInput = document.getElementById('pd-request-date');
    if (dateInput) { dateInput.value = ''; dateInput.setAttribute('min', new Date().toISOString().split('T')[0]); }
    UI.openModal('pd-request-consultation-modal');
  },

  /** Auto-open sample collection request modal */
  _autoRequestSampleCollection() {
    // The loadSampleCollectionTab already loads eligible bookings
    // Just open the modal
    UI.openModal('pd-sample-collection-modal');
  },

  // ══════════════════════════════════════
  // TAB SYSTEM
  // ══════════════════════════════════════
  setupTabs() {
    document.querySelectorAll('.sidebar__link[data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); this.switchTab(btn.dataset.tab); });
    });
    document.addEventListener('click', (e) => {
      const tabLink = e.target.closest('[data-tab]');
      if (tabLink && !tabLink.classList.contains('sidebar__link')) {
        e.preventDefault();
        this.switchTab(tabLink.dataset.tab);
      }
    });
  },

  switchTab(tabName) {
    document.querySelectorAll('.sidebar__link[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(el => {
      el.style.display = el.id === `tab-${tabName}` ? 'block' : 'none';
    });
    window.history.replaceState(null, '', `${window.location.pathname}?tab=${tabName}`);

    switch (tabName) {
      case 'overview':          this.loadOverview(); break;
      case 'doctors':           this.loadDoctorsTab(); break;
      case 'appointments':      this.loadAppointmentsTab(); break;
      case 'consultations':     this.loadConsultationsTab(); break;
      case 'lab-tests':         this.loadLabTestsTab(); break;
      case 'sample-collection': this.loadSampleCollectionTab(); break;
      case 'reports':           this.loadReportsTab(); break;
      case 'history':           this.loadHistoryTab(); break;
      case 'notifications':     this.loadNotificationsTab(); break;
      case 'profile':           this.loadProfileTab(); break;
    }
  },

  bindGlobalEvents() {
    document.getElementById('pd-reschedule-form')?.addEventListener('submit', async (e) => { e.preventDefault(); await this.submitReschedule(); });
    document.getElementById('pd-request-consultation-form')?.addEventListener('submit', async (e) => { e.preventDefault(); await this.submitConsultationRequest(); });
    document.getElementById('pd-book-lab-form')?.addEventListener('submit', async (e) => { e.preventDefault(); await this.submitLabBooking(); });
    document.getElementById('pd-sample-collection-form')?.addEventListener('submit', async (e) => { e.preventDefault(); await this.submitSampleCollection(); });
    document.getElementById('pd-profile-form')?.addEventListener('submit', async (e) => { e.preventDefault(); await this.submitProfile(); });
    document.getElementById('pd-btn-mark-all-read')?.addEventListener('click', async () => { await this.markAllNotificationsRead(); });

    // ESC key to close any active modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
          activeModal.classList.remove('active');
          document.body.style.overflow = '';
        }
      }
    });
  },


  // ══════════════════════════════════════════════════════════════
  // TAB: OVERVIEW — Stats + summaries only. NO booking forms.
  // ══════════════════════════════════════════════════════════════
  loadOverview() {
    if (!this._loadedTabs.overview) {
      Dashboard.initPatient();
      this._loadedTabs.overview = true;
    }
  },


  // ══════════════════════════════════════════════════════════════
  // TAB: FIND A DOCTOR
  // ONLY: search, filters, doctor cards, profile overlay, booking
  // ══════════════════════════════════════════════════════════════
  async loadDoctorsTab() {
    if (!this._loadedTabs.doctors_events) {
      document.getElementById('pd-search-doctors')?.addEventListener('input', () => {
        clearTimeout(this._searchDebounce);
        this._searchDebounce = setTimeout(() => { this._doctorPage = 1; this.fetchDoctors(); }, 400);
      });
      document.getElementById('pd-filter-specialization')?.addEventListener('change', () => { this._doctorPage = 1; this.fetchDoctors(); });
      document.getElementById('pd-filter-experience')?.addEventListener('change', () => { this._doctorPage = 1; this.fetchDoctors(); });
      this._loadedTabs.doctors_events = true;
    }
    await this.fetchDoctors();
  },

  async fetchDoctors() {
    const grid = document.getElementById('pd-doctors-grid');
    if (!grid) return;

    const search = document.getElementById('pd-search-doctors')?.value || '';
    const spec = document.getElementById('pd-filter-specialization')?.value || '';
    const expFilter = document.getElementById('pd-filter-experience')?.value || '';

    let url = `/doctors?page=${this._doctorPage}&limit=12&is_available=1`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (spec) url += `&specialization=${encodeURIComponent(spec)}`;

    grid.innerHTML = Array(3).fill('<div class="skeleton skeleton-doc-card"></div>').join('');

    try {
      const response = await Api.get(url);
      if (!response.success) {
        grid.innerHTML = '<div class="doctors-empty"><h3>Failed to Load</h3><p>Could not fetch doctor data.</p></div>';
        return;
      }

      let doctors = response.data || [];

      // Client-side experience filter (matches doctors.js)
      if (expFilter) {
        const [minS, maxS] = expFilter.includes('+') ? [parseInt(expFilter), Infinity] : expFilter.split('-').map(Number);
        doctors = doctors.filter(d => d.experience_years >= minS && d.experience_years <= maxS);
      }

      const countEl = document.getElementById('pd-results-count');
      if (countEl) countEl.textContent = doctors.length;

      if (!doctors.length) {
        grid.innerHTML = '<div class="doctors-empty"><h3>No Doctors Found</h3><p>Try expanding your search or selecting a different specialization.</p></div>';
        document.getElementById('pd-doctors-pagination').innerHTML = '';
        return;
      }

      // Render cards using same structure as Doctors.renderCard
      grid.innerHTML = doctors.map(doc => this._renderDoctorCard(doc)).join('');

      const pagEl = document.getElementById('pd-doctors-pagination');
      if (pagEl && response.pagination) pagEl.innerHTML = this._renderPagination(response.pagination, 'PatientDashboard.doctorsGoToPage');
    } catch (e) {
      grid.innerHTML = '<div class="doctors-empty"><h3>Error</h3><p>Something went wrong.</p></div>';
    }
  },

  _renderDoctorCard(doc) {
    const initial = doc.full_name ? doc.full_name.charAt(0).toUpperCase() : 'D';
    const exp = doc.experience_years || 0;
    const rating = exp >= 15 ? 5.0 : exp >= 10 ? 4.5 : exp >= 5 ? 4.0 : exp >= 2 ? 3.5 : 3.0;
    const stars = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
    const fee = parseFloat(doc.consultation_fee || 0).toFixed(2);

    const todayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()];
    let availClass = 'week', availLabel = 'This Week';
    if (!doc.is_available) { availClass = 'unavailable'; availLabel = 'Unavailable'; }
    else if (doc.available_days && doc.available_days.includes(todayName)) { availClass = 'today'; availLabel = 'Available Today'; }

    const iconFn = typeof MediIcons !== 'undefined' ? MediIcons.icon.bind(MediIcons) : () => '';

    return `
      <div class="doc-card">
        <div class="doc-card__top">
          <div class="doc-card__avatar">${initial}</div>
          <div class="doc-card__info">
            <div class="doc-card__name">${doc.full_name}</div>
            <div class="doc-card__spec">${doc.specialization}</div>
            <div class="doc-card__dept">${doc.department || doc.specialization}</div>
            <div class="doc-card__rating"><span class="doc-card__stars">${stars}</span> <span class="doc-card__rating-text">${rating.toFixed(1)}</span></div>
          </div>
        </div>
        <div class="doc-card__body">
          <div class="doc-card__meta">
            <div class="doc-card__meta-row"><span class="icon">${iconFn('clipboard')}</span> ${doc.qualification}</div>
            <div class="doc-card__meta-row"><span class="icon">${iconFn('file')}</span> ${exp} years experience</div>
            <div class="doc-card__meta-row"><span class="icon">${iconFn('clipboard')}</span> License: ${doc.license_number || 'Verified'}</div>
          </div>
          <div class="doc-card__badges">
            <span class="badge-availability badge-availability--${availClass}">${availLabel}</span>
            <span class="badge-fee">₹${fee}</span>
          </div>
        </div>
        <div class="doc-card__footer">
          <button class="btn btn--primary btn--sm" onclick="PatientDashboard.bookDoctorAppointment(${doc.id})">Book Appointment</button>
          <button class="btn btn--secondary btn--sm" onclick="PatientDashboard.viewDoctorProfile(${doc.id})">View Profile</button>
        </div>
      </div>
    `;
  },

  doctorsGoToPage(page) { this._doctorPage = page; this.fetchDoctors(); },


  // ──────────────────────────────────────────────────────────────
  // VIEW PROFILE MODAL — Read-only doctor info. No booking form.
  // ──────────────────────────────────────────────────────────────
  async viewDoctorProfile(doctorId) {
    const body = document.getElementById('pd-view-profile-body');
    if (!body) return;
    body.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
    UI.openModal('pd-view-profile-modal');

    try {
      const response = await Api.get(`/doctors/${doctorId}`);
      if (!response.success) { body.innerHTML = '<p style="text-align:center;padding:var(--space-8);">Failed to load profile.</p>'; return; }
      const doc = response.data;
      const initial = doc.full_name ? doc.full_name.charAt(0).toUpperCase() : 'D';
      const exp = doc.experience_years || 0;
      const rating = exp >= 15 ? 5.0 : exp >= 10 ? 4.5 : exp >= 5 ? 4.0 : exp >= 2 ? 3.5 : 3.0;
      const stars = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
      const fee = parseFloat(doc.consultation_fee || 0).toFixed(2);
      const bio = doc.bio || 'Experienced healthcare professional dedicated to patient care.';
      const avail = doc.is_available ? '<span class="badge badge--success">Available</span>' : '<span class="badge badge--danger">Unavailable</span>';

      body.innerHTML = `
        <div style="display:flex;align-items:center;gap:var(--space-5);margin-bottom:var(--space-6);">
          <div style="width:72px;height:72px;border-radius:50%;background:var(--gradient-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:var(--font-size-2xl);font-weight:700;flex-shrink:0;">${initial}</div>
          <div style="flex:1;">
            <h3 style="margin:0 0 var(--space-1);font-size:var(--font-size-xl);font-weight:var(--font-weight-bold);">${this._escapeHtml(doc.full_name)}</h3>
            <div style="color:var(--color-primary);font-weight:var(--font-weight-medium);margin-bottom:var(--space-1);">${this._escapeHtml(doc.specialization)}</div>
            <div style="color:var(--color-text-light);font-size:var(--font-size-sm);">${this._escapeHtml(doc.qualification)}</div>
            <div style="margin-top:var(--space-1);font-size:var(--font-size-sm);color:var(--color-warning);">${stars} <span style="color:var(--color-text-light);">${rating.toFixed(1)}</span></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3);margin-bottom:var(--space-5);">
          <div style="text-align:center;padding:var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-lg);">
            <div style="font-size:var(--font-size-lg);font-weight:var(--font-weight-bold);color:var(--color-primary);">${exp} yrs</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-light);margin-top:var(--space-1);">Experience</div>
          </div>
          <div style="text-align:center;padding:var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-lg);">
            <div style="font-size:var(--font-size-lg);font-weight:var(--font-weight-bold);color:var(--color-primary);">₹${fee}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-light);margin-top:var(--space-1);">Consultation Fee</div>
          </div>
          <div style="text-align:center;padding:var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-lg);">
            <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold);color:var(--color-gray-800);">${avail}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-light);margin-top:var(--space-1);">Availability</div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:var(--space-3);margin-bottom:var(--space-5);">
          <div style="display:flex;justify-content:space-between;padding:var(--space-3) var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-md);">
            <span style="font-size:var(--font-size-sm);color:var(--color-text-light);">License Number</span>
            <span style="font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold);">${this._escapeHtml(doc.license_number || 'Verified')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:var(--space-3) var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-md);">
            <span style="font-size:var(--font-size-sm);color:var(--color-text-light);">Working Days</span>
            <span style="font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold);">${this._escapeHtml(doc.available_days || 'Mon–Fri')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:var(--space-3) var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-md);">
            <span style="font-size:var(--font-size-sm);color:var(--color-text-light);">Department</span>
            <span style="font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold);">${this._escapeHtml(doc.department || doc.specialization)}</span>
          </div>
        </div>

        <div style="padding:var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-lg);margin-bottom:var(--space-5);">
          <div style="font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold);color:var(--color-gray-800);margin-bottom:var(--space-2);">About</div>
          <p style="font-size:var(--font-size-sm);color:var(--color-text-light);line-height:var(--line-height-relaxed);margin:0;">${this._escapeHtml(bio)}</p>
        </div>

        <div style="display:flex;gap:var(--space-3);justify-content:flex-end;">
          <button class="btn btn--secondary" onclick="UI.closeModal('pd-view-profile-modal')">Close</button>
          <button class="btn btn--primary" onclick="UI.closeModal('pd-view-profile-modal'); PatientDashboard.bookDoctorAppointment(${doctorId})">Book Appointment</button>
        </div>
      `;
    } catch (e) {
      body.innerHTML = '<p style="text-align:center;padding:var(--space-8);">Error loading profile.</p>';
    }
  },


  // ──────────────────────────────────────────────────────────────
  // BOOK APPOINTMENT MODAL — Booking form only. No full profile.
  // ──────────────────────────────────────────────────────────────
  async bookDoctorAppointment(doctorId) {
    const body = document.getElementById('pd-book-doctor-body');
    if (!body) return;
    body.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
    UI.openModal('pd-book-doctor-modal');

    try {
      const response = await Api.get(`/doctors/${doctorId}`);
      if (!response.success) { body.innerHTML = '<p style="text-align:center;padding:var(--space-8);">Failed to load doctor details.</p>'; return; }
      const doc = response.data;
      const fee = parseFloat(doc.consultation_fee || 0).toFixed(2);

      body.innerHTML = `
        <div style="display:flex;align-items:center;gap:var(--space-4);padding:var(--space-4);background:var(--color-gray-50);border-radius:var(--radius-lg);margin-bottom:var(--space-5);">
          <div style="width:48px;height:48px;border-radius:50%;background:var(--gradient-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:var(--font-size-lg);font-weight:700;flex-shrink:0;">${doc.full_name ? doc.full_name.charAt(0).toUpperCase() : 'D'}</div>
          <div style="flex:1;">
            <div style="font-weight:var(--font-weight-bold);font-size:var(--font-size-md);">${this._escapeHtml(doc.full_name)}</div>
            <div style="font-size:var(--font-size-sm);color:var(--color-text-light);">${this._escapeHtml(doc.specialization)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:var(--font-weight-bold);color:var(--color-primary);font-size:var(--font-size-md);">₹${fee}</div>
            <div style="font-size:var(--font-size-xs);color:var(--color-text-light);">Consultation Fee</div>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:var(--space-4);">
          <label class="form-label form-label--required" for="pd-book-doc-date">Select Date</label>
          <input type="date" id="pd-book-doc-date" class="form-input" onchange="PatientDashboard.loadBookingSlots(${doctorId})">
        </div>

        <div class="form-group" style="margin-bottom:var(--space-4);">
          <label class="form-label">Available Time Slots</label>
          <div id="pd-book-doc-slots" style="display:flex;flex-wrap:wrap;gap:var(--space-2);min-height:40px;align-items:center;">
            <p class="text-sm text-muted" style="margin:0;">Select a date to view available slots.</p>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:var(--space-4);">
          <label class="form-label" for="pd-book-doc-type">Consultation Type</label>
          <select id="pd-book-doc-type" class="form-select">
            <option value="in_person">In-Person Visit</option>
            <option value="teleconsult">Video Teleconsult</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom:var(--space-5);">
          <label class="form-label" for="pd-book-doc-reason">Reason for Visit</label>
          <textarea id="pd-book-doc-reason" class="form-textarea" rows="2" placeholder="Briefly describe your symptoms or reason for visit..."></textarea>
        </div>

        <input type="hidden" id="pd-book-doc-time" value="">

        <div style="display:flex;gap:var(--space-3);justify-content:flex-end;">
          <button class="btn btn--secondary" onclick="UI.closeModal('pd-book-doctor-modal')">Cancel</button>
          <button class="btn btn--primary" onclick="PatientDashboard.confirmBooking(${doctorId})">Confirm Booking</button>
        </div>
      `;

      const dateInput = document.getElementById('pd-book-doc-date');
      if (dateInput) dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
    } catch (e) {
      body.innerHTML = '<p style="text-align:center;padding:var(--space-8);">Error loading booking form.</p>';
    }
  },

  async loadBookingSlots(doctorId) {
    const dateVal = document.getElementById('pd-book-doc-date')?.value;
    const container = document.getElementById('pd-book-doc-slots');
    if (!dateVal || !container) return;
    container.innerHTML = '<div class="spinner spinner--sm"></div>';
    try {
      const response = await Api.get(`/doctors/${doctorId}/slots?date=${dateVal}`);
      if (!response.success) { container.innerHTML = '<p class="text-sm" style="color:var(--color-danger);margin:0;">Failed to load slots.</p>'; return; }
      const { availableSlots, bookedSlots } = response.data;
      if (!availableSlots || !availableSlots.length) { container.innerHTML = '<p class="text-sm text-muted" style="margin:0;">No available slots for this date.</p>'; return; }
      container.innerHTML = availableSlots.map(slot => {
        const isBooked = bookedSlots && bookedSlots.includes(slot);
        return `<button type="button" class="slot-btn ${isBooked ? 'slot-btn--booked' : ''}" data-time="${slot}" onclick="PatientDashboard.selectBookingSlot(this)" ${isBooked ? 'disabled' : ''}>${this._formatTime(slot)}</button>`;
      }).join('');
    } catch (e) { container.innerHTML = '<p class="text-sm" style="color:var(--color-danger);margin:0;">Error loading slots.</p>'; }
  },

  selectBookingSlot(btn) {
    document.querySelectorAll('#pd-book-doc-slots .slot-btn:not([disabled])').forEach(b => b.classList.remove('slot-btn--selected'));
    btn.classList.add('slot-btn--selected');
    document.getElementById('pd-book-doc-time').value = btn.dataset.time;
  },

  async confirmBooking(doctorId) {
    const date = document.getElementById('pd-book-doc-date')?.value;
    const time = document.getElementById('pd-book-doc-time')?.value;
    const type = document.getElementById('pd-book-doc-type')?.value || 'in_person';
    const reason = document.getElementById('pd-book-doc-reason')?.value || '';
    if (!date || !time) { UI.showToast('Please select a date and time slot.', 'warning'); return; }
    try {
      UI.showLoader();
      const response = await Api.post('/appointments', { doctor_id: doctorId, appointment_date: date, appointment_time: time, type, reason });
      if (response.success) { UI.showToast('Appointment booked successfully!', 'success'); UI.closeModal('pd-book-doctor-modal'); this.switchTab('appointments'); }
      else { UI.showToast(response.message || 'Failed to book.', 'error'); }
    } catch (e) { UI.showToast(e.message || 'Failed to book.', 'error'); }
    finally { UI.hideLoader(); }
  },


  // ══════════════════════════════════════════════════════════════
  // TAB: APPOINTMENTS
  // ONLY: appointment list, status filter, reschedule, cancel
  // ══════════════════════════════════════════════════════════════
  async loadAppointmentsTab() {
    if (!this._loadedTabs.appt_events) {
      document.getElementById('pd-appt-filter-status')?.addEventListener('change', () => { this._apptPage = 1; this.fetchAppointments(); });
      this._loadedTabs.appt_events = true;
    }
    await this.fetchAppointments();
  },

  async fetchAppointments() {
    const container = document.getElementById('pd-appts-list');
    if (!container) return;
    const status = document.getElementById('pd-appt-filter-status')?.value || '';
    let url = `/appointments?page=${this._apptPage}&limit=${CONFIG.DEFAULT_PAGE_SIZE || 10}`;
    if (status) url += `&status=${status}`;

    try {
      const response = await Api.get(url);
      if (!response.success) { container.innerHTML = '<div class="empty-state"><p>Failed to load appointments.</p></div>'; return; }
      if (!response.data.length) {
        container.innerHTML = UI.emptyState('calendar', 'No Appointments', 'You have no appointments yet. Find a doctor to book one!');
        document.getElementById('pd-appts-pagination').innerHTML = '';
        return;
      }
      container.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Date & Time</th><th>Doctor</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${response.data.map(a => `
              <tr>
                <td><strong>${UI.formatDate(a.appointment_date)}</strong><br><span class="text-muted text-sm">${UI.formatTime(a.appointment_time)}</span></td>
                <td><strong>${a.doctor_name || '—'}</strong><br><span class="text-muted text-sm">${a.specialization || ''}</span></td>
                <td><span class="badge badge--info">${(a.type || 'in_person').replace('_', ' ')}</span></td>
                <td>${UI.statusBadge(a.status)}</td>
                <td><div class="d-flex gap-2">
                  ${['scheduled','confirmed','rescheduled'].includes(a.status) ? `
                    <button class="btn btn--sm btn--ghost" onclick="PatientDashboard.openRescheduleModal(${a.id})">Reschedule</button>
                    <button class="btn btn--sm btn--danger" onclick="PatientDashboard.cancelAppointment(${a.id})">Cancel</button>
                  ` : ''}
                </div></td>
              </tr>
            `).join('')}</tbody>
          </table>
        </div>`;
      const pagEl = document.getElementById('pd-appts-pagination');
      if (pagEl && response.pagination) pagEl.innerHTML = this._renderPagination(response.pagination, 'PatientDashboard.apptsGoToPage');
    } catch (e) { container.innerHTML = '<div class="empty-state"><p>Error loading appointments.</p></div>'; }
  },

  apptsGoToPage(page) { this._apptPage = page; this.fetchAppointments(); },

  openRescheduleModal(apptId) {
    document.getElementById('pd-reschedule-appt-id').value = apptId;
    const dateInput = document.getElementById('pd-resched-date');
    if (dateInput) dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
    UI.openModal('pd-reschedule-modal');
  },

  async submitReschedule() {
    const id = document.getElementById('pd-reschedule-appt-id').value;
    const date = document.getElementById('pd-resched-date').value;
    const time = document.getElementById('pd-resched-time').value;
    if (!date || !time) { UI.showToast('Please provide a new date and time.', 'warning'); return; }
    try {
      UI.showLoader();
      const r = await Api.put(`/appointments/${id}/reschedule`, { appointment_date: date, appointment_time: time });
      if (r.success) { UI.showToast('Appointment rescheduled!', 'success'); UI.closeModal('pd-reschedule-modal'); await this.fetchAppointments(); }
      else { UI.showToast(r.message || 'Failed.', 'error'); }
    } catch (e) { UI.showToast(e.message || 'Failed.', 'error'); }
    finally { UI.hideLoader(); }
  },

  async cancelAppointment(id) {
    if (!confirm('Cancel this appointment?')) return;
    try { UI.showLoader(); const r = await Api.put(`/appointments/${id}/cancel`, {}); if (r.success) { UI.showToast('Cancelled.', 'success'); await this.fetchAppointments(); } }
    catch (e) { UI.showToast(e.message || 'Failed.', 'error'); } finally { UI.hideLoader(); }
  },


  // ══════════════════════════════════════════════════════════════
  // TAB: CONSULTATIONS
  // ONLY: request form, consultation list, status, detail modal
  // ══════════════════════════════════════════════════════════════
  async loadConsultationsTab() {
    if (!this._loadedTabs.consult_events) {
      document.getElementById('pd-consult-filter-status')?.addEventListener('change', () => { this._consultPage = 1; this.fetchConsultations(); });
      this._loadedTabs.consult_events = true;
    }
    await this.loadConsultDoctors();
    await this.fetchConsultations();
  },

  async loadConsultDoctors() {
    try {
      const r = await Api.get('/doctors?limit=100&is_available=1');
      const sel = document.getElementById('pd-request-doctor');
      if (!sel || !r.success) return;
      sel.innerHTML = '<option value="">Select a Doctor</option>' + r.data.map(d => `<option value="${d.id}">${d.full_name} — ${d.specialization}</option>`).join('');
    } catch (e) { /* silent */ }
  },

  async fetchConsultations() {
    const container = document.getElementById('pd-consults-list');
    if (!container) return;
    const status = document.getElementById('pd-consult-filter-status')?.value || '';
    let url = `/consultations?page=${this._consultPage}&limit=${CONFIG.DEFAULT_PAGE_SIZE || 10}`;
    if (status) url += `&status=${status}`;
    try {
      const response = await Api.get(url);
      if (!response.success) { container.innerHTML = '<div class="empty-state"><p>Failed to load consultations.</p></div>'; return; }
      if (!response.data.length) {
        container.innerHTML = UI.emptyState('clipboard', 'No Consultations', 'No consultation records found.');
        document.getElementById('pd-consults-pagination').innerHTML = '';
        return;
      }
      container.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Doctor</th><th>Symptoms</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${response.data.map(c => {
              let dateDisplay = c.status === 'requested'
                ? `Pref: <strong>${UI.formatDate(c.preferred_date)}</strong>`
                : c.consultation_date
                  ? `<strong>${UI.formatDate(c.consultation_date)}</strong><br><span class="text-muted text-sm">${UI.formatTime(c.consultation_time)}</span>`
                  : `Created: <strong>${UI.formatDate(c.created_at)}</strong>`;
              return `<tr>
                <td>${dateDisplay}</td>
                <td><strong>${c.doctor_name || '—'}</strong><br><span class="text-muted text-sm">${c.specialization || ''}</span></td>
                <td class="truncate" style="max-width:200px;" title="${c.symptoms || ''}">${c.symptoms || '—'}</td>
                <td>${UI.statusBadge(c.status || 'completed')}</td>
                <td><div class="d-flex gap-2">
                  <button class="btn btn--sm btn--ghost" onclick="PatientDashboard.viewConsultation(${c.id})">View</button>
                  ${c.status === 'requested' ? `<button class="btn btn--sm btn--danger" onclick="PatientDashboard.cancelConsultation(${c.id})">Cancel</button>` : ''}
                </div></td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>`;
      const pagEl = document.getElementById('pd-consults-pagination');
      if (pagEl && response.pagination) pagEl.innerHTML = this._renderPagination(response.pagination, 'PatientDashboard.consultsGoToPage');
    } catch (e) { container.innerHTML = '<div class="empty-state"><p>Error loading consultations.</p></div>'; }
  },

  consultsGoToPage(page) { this._consultPage = page; this.fetchConsultations(); },

  openConsultationRequestModal() {
    const dateInput = document.getElementById('pd-request-date');
    if (dateInput) { dateInput.value = ''; dateInput.setAttribute('min', new Date().toISOString().split('T')[0]); }
    UI.openModal('pd-request-consultation-modal');
  },

  async submitConsultationRequest() {
    const data = {
      doctor_id: parseInt(document.getElementById('pd-request-doctor').value, 10),
      preferred_date: document.getElementById('pd-request-date').value,
      symptoms: document.getElementById('pd-request-symptoms').value,
      health_concerns: document.getElementById('pd-request-concerns').value || null,
      additional_notes: document.getElementById('pd-request-notes').value || null,
    };
    if (!data.doctor_id || !data.preferred_date || !data.symptoms) { UI.showToast('Please fill in all required fields.', 'warning'); return; }
    try {
      UI.showLoader();
      const r = await Api.post('/consultations', data);
      if (r.success) { UI.showToast('Consultation request submitted!', 'success'); UI.closeModal('pd-request-consultation-modal'); document.getElementById('pd-request-consultation-form').reset(); await this.fetchConsultations(); }
      else { UI.showToast(r.message || 'Failed.', 'error'); }
    } catch (e) { UI.showToast(e.message || 'Failed.', 'error'); }
    finally { UI.hideLoader(); }
  },

  async cancelConsultation(id) {
    if (!confirm('Cancel this consultation request?')) return;
    try { UI.showLoader(); const r = await Api.put(`/consultations/${id}/cancel`, {}); if (r.success) { UI.showToast('Cancelled.', 'success'); await this.fetchConsultations(); } }
    catch (e) { UI.showToast(e.message || 'Failed.', 'error'); } finally { UI.hideLoader(); }
  },

  async viewConsultation(id) {
    try {
      UI.showLoader();
      const response = await Api.get(`/consultations/${id}`);
      if (!response.success) return;
      const c = response.data;
      let scheduleInfo = 'Not Scheduled';
      if (c.consultation_date) scheduleInfo = `${UI.formatDate(c.consultation_date)} at ${UI.formatTime(c.consultation_time)} (${c.duration} mins)`;
      document.getElementById('pd-consultation-details').innerHTML = `
        <div class="detail-grid">
          <div class="detail-group"><div class="detail-label">Doctor</div><div class="detail-value">${c.doctor_name}</div></div>
          <div class="detail-group"><div class="detail-label">Specialization</div><div class="detail-value">${c.specialization || '—'}</div></div>
          <div class="detail-group"><div class="detail-label">Status</div><div class="detail-value">${UI.statusBadge(c.status)}</div></div>
          <div class="detail-group"><div class="detail-label">Schedule</div><div class="detail-value"><strong>${scheduleInfo}</strong></div></div>
          <div class="detail-group detail-group--full"><div class="detail-label">Symptoms</div><div class="detail-value">${c.symptoms || '—'}</div></div>
          ${c.health_concerns ? `<div class="detail-group detail-group--full"><div class="detail-label">Health Concerns</div><div class="detail-value">${c.health_concerns}</div></div>` : ''}
          ${c.status === 'completed' ? `
            <div class="detail-group detail-group--full" style="border-top:1px dashed var(--color-border);padding-top:var(--space-4);margin-top:var(--space-4);"><h4 style="color:var(--color-primary-dark);">Clinical Notes</h4></div>
            <div class="detail-group detail-group--full"><div class="detail-label">Diagnosis</div><div class="detail-value"><strong>${c.notes_diagnosis || c.diagnosis || '—'}</strong></div></div>
            ${c.recommendations ? `<div class="detail-group detail-group--full"><div class="detail-label">Recommendations</div><div class="detail-value">${c.recommendations}</div></div>` : ''}
            ${c.prescription_notes || c.prescription ? `<div class="detail-group detail-group--full"><div class="detail-label">Prescription</div><div class="detail-value" style="background:#f0fcf9;border:1px solid #d0f3eb;padding:12px;border-radius:6px;font-family:monospace;white-space:pre-wrap;">${c.prescription_notes || c.prescription}</div></div>` : ''}
          ` : ''}
        </div>`;
      UI.openModal('pd-consultation-detail-modal');
    } catch (e) { UI.showToast('Failed to load details.', 'error'); }
    finally { UI.hideLoader(); }
  },


  // ══════════════════════════════════════════════════════════════
  // TAB: LAB TESTS
  // ONLY: test catalogue, search, category filter, book test, bookings
  // ══════════════════════════════════════════════════════════════
  async loadLabTestsTab() {
    if (!this._loadedTabs.lab_events) {
      document.getElementById('pd-lab-search')?.addEventListener('input', () => {
        clearTimeout(this._searchDebounce);
        this._searchDebounce = setTimeout(() => this.fetchLabTests(), 400);
      });
      document.getElementById('pd-lab-filter-category')?.addEventListener('change', () => this.fetchLabTests());
      document.getElementById('tab-lab-tests')?.addEventListener('click', (e) => {
        const bookBtn = e.target.closest('[data-pd-book-test]');
        if (bookBtn) this.openLabBookModal(parseInt(bookBtn.dataset.pdBookTest), bookBtn.dataset.testName);
      });
      this._loadedTabs.lab_events = true;
    }
    await this.fetchLabCategories();
    await this.fetchLabTests();
    await this.fetchLabBookings();
  },

  async fetchLabCategories() {
    try {
      const r = await Api.get('/lab-tests/categories');
      if (!r.success) return;
      const sel = document.getElementById('pd-lab-filter-category');
      if (sel) sel.innerHTML = '<option value="">All Categories</option>' + r.data.map(c => `<option value="${c}">${c}</option>`).join('');
    } catch (e) { /* silent */ }
  },

  async fetchLabTests() {
    const container = document.getElementById('pd-lab-tests-catalog');
    if (!container) return;
    const search = document.getElementById('pd-lab-search')?.value || '';
    const cat = document.getElementById('pd-lab-filter-category')?.value || '';
    let url = '/lab-tests?limit=50&is_active=1';
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (cat) url += `&category=${encodeURIComponent(cat)}`;

    try {
      const response = await Api.get(url);
      const countEl = document.getElementById('pd-lab-tests-count');
      if (!response.success || !response.data.length) {
        container.innerHTML = '<div class="empty-state"><h3>No Tests Found</h3><p>Try a different search or category.</p></div>';
        if (countEl) countEl.textContent = '';
        return;
      }
      if (countEl) countEl.textContent = `${response.data.length} test${response.data.length !== 1 ? 's' : ''}`;
      container.innerHTML = `<div class="lab-tests-grid">${response.data.map(test => {
        const price = parseFloat(test.price).toFixed(2);
        const name = this._escapeHtml(test.test_name);
        return `
          <div class="lab-test-card">
            <div class="lab-test-card__header">
              <span class="lab-test-card__category">${this._escapeHtml(test.category || 'General')}</span>
              <span class="lab-test-card__price">₹${price}</span>
            </div>
            <div class="lab-test-card__body">
              <h3 class="lab-test-card__name">${name}</h3>
              <p class="lab-test-card__desc">${this._escapeHtml(test.description || 'Standard diagnostic test.')}</p>
              <div class="lab-test-card__meta">
                <span class="lab-test-card__meta-item">⏱ ${test.turnaround_hours || 24}h</span>
                <span class="lab-test-card__meta-item">🔍 ${this._escapeHtml(test.test_code)}</span>
              </div>
              <div class="lab-test-card__actions">
                <button class="btn btn--primary btn--sm" data-pd-book-test="${test.id}" data-test-name="${name.replace(/"/g, '&quot;')}">Book Now</button>
              </div>
            </div>
          </div>`;
      }).join('')}</div>`;
    } catch (e) { container.innerHTML = '<div class="empty-state"><p>Error loading lab tests.</p></div>'; }
  },

  async fetchLabBookings() {
    const container = document.getElementById('pd-lab-bookings-list');
    if (!container) return;
    try {
      const r = await Api.get('/lab-bookings?limit=20');
      if (!r.success || !r.data.length) {
        container.innerHTML = UI.emptyState('microscope', 'No Lab Bookings', 'Book a lab test above to see your bookings here.');
        return;
      }
      container.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Test</th><th>Code</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>${r.data.map(b => `
              <tr><td><strong>${this._escapeHtml(b.test_name)}</strong></td><td class="text-sm text-muted">${this._escapeHtml(b.test_code)}</td><td>${UI.formatDate(b.booking_date)}</td><td>${UI.statusBadge(b.status)}</td></tr>
            `).join('')}</tbody>
          </table>
        </div>`;
    } catch (e) { container.innerHTML = '<div class="empty-state"><p>Error loading bookings.</p></div>'; }
  },

  openLabBookModal(testId, testName) {
    document.getElementById('pd-book-lab-test-id').value = testId;
    document.getElementById('pd-book-lab-test-name').textContent = testName;
    const d = document.getElementById('pd-book-lab-date');
    if (d) { d.value = ''; d.setAttribute('min', new Date().toISOString().split('T')[0]); }
    UI.openModal('pd-book-lab-modal');
  },

  async submitLabBooking() {
    const data = {
      lab_test_id: parseInt(document.getElementById('pd-book-lab-test-id').value, 10),
      booking_date: document.getElementById('pd-book-lab-date').value,
      preferred_time: document.getElementById('pd-book-lab-time')?.value || null,
      notes: document.getElementById('pd-book-lab-notes')?.value || '',
    };
    if (!data.booking_date) { UI.showToast('Please select a date.', 'warning'); return; }
    try {
      UI.showLoader();
      const r = await Api.post('/lab-bookings', data);
      if (r.success) { UI.showToast('Lab test booked!', 'success'); UI.closeModal('pd-book-lab-modal'); document.getElementById('pd-book-lab-form')?.reset(); await this.fetchLabBookings(); }
      else { UI.showToast(r.message || 'Failed.', 'error'); }
    } catch (e) { UI.showToast(e.message || 'Failed.', 'error'); }
    finally { UI.hideLoader(); }
  },


  // ══════════════════════════════════════════════════════════════
  // TAB: SAMPLE COLLECTION
  // ONLY: pickup request form, pickup history, collection status
  // ══════════════════════════════════════════════════════════════
  async loadSampleCollectionTab() { await this.fetchSampleRequests(); },

  async fetchSampleRequests() {
    const container = document.getElementById('pd-sample-requests-list');
    if (!container) return;
    try {
      const r = await Api.get(`/sample-collections?page=${this._samplePage}&limit=${CONFIG.DEFAULT_PAGE_SIZE || 10}`);
      if (!r.success || !r.data.length) {
        container.innerHTML = `<div class="empty-state" style="padding:var(--space-8);"><h3>No Collection Requests</h3><p>Book a lab test first, then request a home pickup.</p><button class="btn btn--primary" style="margin-top:var(--space-4)" data-tab="lab-tests">Browse Lab Tests</button></div>`;
        return;
      }
      container.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Test</th><th>Date & Time</th><th>Address</th><th>Collector</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${r.data.map(req => `
              <tr>
                <td><strong>${this._escapeHtml(req.test_name)}</strong></td>
                <td>${UI.formatDate(req.preferred_date)}<br><span class="text-xs text-muted">${req.preferred_time_slot || 'Any time'}</span></td>
                <td class="truncate" style="max-width:150px;" title="${this._escapeHtml(req.collection_address)}">${this._escapeHtml(req.collection_address)}</td>
                <td>${req.collector_name ? `<strong>${this._escapeHtml(req.collector_name)}</strong>` : '<span class="text-muted">—</span>'}</td>
                <td>${UI.statusBadge(req.status)}</td>
                <td>${req.status === 'requested' ? `<button class="btn btn--sm btn--danger" onclick="PatientDashboard.cancelSampleRequest(${req.id})">Cancel</button>` : '—'}</td>
              </tr>
            `).join('')}</tbody>
          </table>
        </div>`;
    } catch (e) { container.innerHTML = '<div class="empty-state"><p>Error loading requests.</p></div>'; }
  },

  async openSampleCollectionModal() {
    try {
      const [bRes, cRes] = await Promise.all([Api.get('/lab-bookings?limit=100'), Api.get('/sample-collections?limit=100')]);
      if (bRes.success && cRes.success) {
        const activeIds = new Set(cRes.data.filter(c => c.status !== 'cancelled').map(c => c.lab_booking_id));
        const eligible = bRes.data.filter(b => ['pending', 'confirmed'].includes(b.status) && !activeIds.has(b.id));
        const sel = document.getElementById('pd-sc-booking-id');
        if (sel) sel.innerHTML = eligible.length
          ? '<option value="">Select a Lab Booking</option>' + eligible.map(b => `<option value="${b.id}">${b.test_name} - ${UI.formatDate(b.booking_date)}</option>`).join('')
          : '<option value="">No eligible bookings found</option>';
      }
    } catch (e) { /* silent */ }
    const d = document.getElementById('pd-sc-date');
    if (d) { d.value = ''; d.setAttribute('min', new Date().toISOString().split('T')[0]); }
    UI.openModal('pd-sample-collection-modal');
  },

  async submitSampleCollection() {
    const data = {
      lab_booking_id: parseInt(document.getElementById('pd-sc-booking-id').value),
      collection_address: document.getElementById('pd-sc-address').value,
      preferred_date: document.getElementById('pd-sc-date').value,
      preferred_time_slot: document.getElementById('pd-sc-time-slot')?.value || '',
      notes: document.getElementById('pd-sc-notes')?.value || '',
    };
    if (!data.lab_booking_id || !data.collection_address || !data.preferred_date) { UI.showToast('Please fill required fields.', 'warning'); return; }
    try {
      UI.showLoader();
      const r = await Api.post('/sample-collections', data);
      if (r.success) { UI.showToast('Request submitted!', 'success'); UI.closeModal('pd-sample-collection-modal'); document.getElementById('pd-sample-collection-form')?.reset(); await this.fetchSampleRequests(); }
      else { UI.showToast(r.message || 'Failed.', 'error'); }
    } catch (e) { UI.showToast(e.message || 'Failed.', 'error'); }
    finally { UI.hideLoader(); }
  },

  async cancelSampleRequest(id) {
    if (!confirm('Cancel this collection request?')) return;
    try { UI.showLoader(); const r = await Api.put(`/sample-collections/${id}/cancel`, { reason: 'Cancelled by patient' }); if (r.success) { UI.showToast('Cancelled.', 'success'); await this.fetchSampleRequests(); } }
    catch (e) { UI.showToast(e.message || 'Failed.', 'error'); } finally { UI.hideLoader(); }
  },


  // ══════════════════════════════════════════════════════════════
  // TAB: REPORTS
  // ONLY: reports list, download report
  // ══════════════════════════════════════════════════════════════
  async loadReportsTab() { await this.fetchReports(); },

  async fetchReports() {
    const container = document.getElementById('pd-reports-list');
    if (!container) return;
    try {
      const r = await Api.get(`/reports?page=${this._reportPage}&limit=${CONFIG.DEFAULT_PAGE_SIZE || 10}`);
      if (!r.success) { container.innerHTML = '<div class="empty-state"><p>Failed to load reports.</p></div>'; return; }
      if (!r.data.length) {
        container.innerHTML = UI.emptyState('file', 'No Reports Yet', 'Reports will appear here once uploaded by your doctor.');
        document.getElementById('pd-reports-pagination').innerHTML = '';
        return;
      }
      container.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Title</th><th>Category</th><th>Type</th><th>Doctor</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>${r.data.map(rpt => `
              <tr>
                <td><strong>${this._escapeHtml(rpt.title)}</strong></td>
                <td><span class="badge badge--info">${this._escapeHtml(rpt.category || 'General')}</span></td>
                <td>${UI.statusBadge(rpt.report_type)}</td>
                <td>${this._escapeHtml(rpt.doctor_name || '—')}</td>
                <td>${UI.formatDate(rpt.created_at)}</td>
                <td>${rpt.file_url ? `<button onclick="PatientDashboard.downloadReport(${rpt.id}, '${(rpt.original_filename || 'report.pdf').replace(/'/g, "\\'")}')" class="btn btn--sm btn--primary">Download</button>` : '<span class="text-muted text-sm">N/A</span>'}</td>
              </tr>
            `).join('')}</tbody>
          </table>
        </div>`;
      const pagEl = document.getElementById('pd-reports-pagination');
      if (pagEl && r.pagination) pagEl.innerHTML = this._renderPagination(r.pagination, 'PatientDashboard.reportsGoToPage');
    } catch (e) { container.innerHTML = '<div class="empty-state"><p>Error loading reports.</p></div>'; }
  },

  reportsGoToPage(page) { this._reportPage = page; this.fetchReports(); },

  async downloadReport(id, filename) {
    try {
      const token = localStorage.getItem(CONFIG.TOKEN_KEY) || sessionStorage.getItem(CONFIG.TOKEN_KEY);
      const headers = {}; if (token) headers['Authorization'] = `Bearer ${token}`;
      const resp = await fetch(`${CONFIG.API_BASE_URL}/reports/${id}/download`, { method: 'GET', headers });
      if (!resp.ok) throw new Error('Failed');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.style.display = 'none'; a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
      UI.showToast('Report downloaded!', 'success');
    } catch (e) { UI.showToast('Failed to download report.', 'error'); }
  },


  // ══════════════════════════════════════════════════════════════
  // TAB: HISTORY
  // ONLY: timeline, search, source filter
  // ══════════════════════════════════════════════════════════════
  async loadHistoryTab() {
    if (!this._loadedTabs.history_events) {
      document.getElementById('pd-history-search')?.addEventListener('input', () => {
        clearTimeout(this._searchDebounce);
        this._searchDebounce = setTimeout(() => { this._historyPage = 1; this.fetchHistory(); }, 400);
      });
      document.getElementById('pd-history-filter')?.addEventListener('change', () => { this._historyPage = 1; this.fetchHistory(); });
      this._loadedTabs.history_events = true;
    }
    await this.fetchHistory();
  },

  async fetchHistory() {
    const container = document.getElementById('pd-history-list');
    if (!container) return;
    const search = document.getElementById('pd-history-search')?.value || '';
    const filter = document.getElementById('pd-history-filter')?.value || '';

    let patientId = '';
    try { const me = await Api.get('/auth/me'); if (me.success && me.data.profile) patientId = me.data.profile.id; } catch (e) {}

    let url = patientId ? `/history/patient/${patientId}` : '/history';
    url += `?page=${this._historyPage}&limit=15`;
    if (filter) url += `&source_module=${filter}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
      const r = await Api.get(url);
      if (!r.success) { container.innerHTML = '<div class="empty-state"><p>Failed to load history.</p></div>'; return; }
      const records = Array.isArray(r.data) ? r.data : [];
      if (!records.length) {
        container.innerHTML = '<div class="empty-state" style="padding:var(--space-8);"><h3>No History Records</h3><p>Your medical journey timeline will appear here.</p></div>';
        document.getElementById('pd-history-pagination').innerHTML = '';
        return;
      }
      const icons = { appointments: '📅', consultations: '🩺', lab_bookings: '🔬', sample_collections: '🏠', reports: '📄' };
      container.innerHTML = records.map(h => `
        <div class="appointment-item" style="margin-bottom:var(--space-2);">
          <div class="appointment-item__time" style="background:var(--color-mint-light);color:#0d9488;min-width:50px;font-size:1.2rem;display:flex;align-items:center;justify-content:center;">${icons[h.source_module] || '📋'}</div>
          <div class="appointment-item__info" style="flex:1;"><div class="appointment-item__name">${this._escapeHtml(h.title)}</div><div class="appointment-item__detail">${this._escapeHtml(h.description || '')} • ${UI.formatDate(h.event_date)}</div></div>
          <div><span class="badge badge--gray" style="text-transform:capitalize;">${(h.source_module || '').replace('_', ' ')}</span></div>
        </div>
      `).join('');
      const pagEl = document.getElementById('pd-history-pagination');
      if (pagEl && r.pagination) pagEl.innerHTML = this._renderPagination(r.pagination, 'PatientDashboard.historyGoToPage');
    } catch (e) { container.innerHTML = '<div class="empty-state"><p>Error loading history.</p></div>'; }
  },

  historyGoToPage(page) { this._historyPage = page; this.fetchHistory(); },


  // ══════════════════════════════════════════════════════════════
  // TAB: NOTIFICATIONS
  // ══════════════════════════════════════════════════════════════
  async loadNotificationsTab() { await this.fetchNotifications(); },

  async fetchNotifications() {
    const container = document.getElementById('pd-notifications-list');
    if (!container) return;
    try {
      const r = await Api.get(`/notifications?page=${this._notifPage}&limit=${CONFIG.DEFAULT_PAGE_SIZE || 10}`);
      if (!r.success || !r.data.length) {
        container.innerHTML = UI.emptyState('bell', 'No Notifications', "You're all caught up!");
        document.getElementById('pd-notifications-pagination').innerHTML = '';
        return;
      }
      const iconMap = {appointment:'📅',lab:'🔬',report:'📄',system:'⚙️',reminder:'⏰'};
      container.innerHTML = r.data.map(n => `
        <div class="appointment-item ${n.is_read ? '' : 'notif-unread'}" style="margin-bottom:var(--space-2);cursor:pointer;" onclick="PatientDashboard.markNotificationRead(${n.id})">
          <div class="appointment-item__time" style="background:${n.is_read ? 'var(--color-gray-50)' : 'var(--color-mint-light)'};min-width:50px;display:flex;align-items:center;justify-content:center;">${iconMap[n.type] || '🔔'}</div>
          <div class="appointment-item__info" style="flex:1;"><div class="appointment-item__name">${this._escapeHtml(n.title)}</div><div class="appointment-item__detail">${this._escapeHtml(n.message)}</div></div>
          ${!n.is_read ? '<span class="badge badge--primary" style="font-size:0.65rem;">New</span>' : ''}
        </div>
      `).join('');
      const pagEl = document.getElementById('pd-notifications-pagination');
      if (pagEl && r.pagination) pagEl.innerHTML = this._renderPagination(r.pagination, 'PatientDashboard.notifsGoToPage');
    } catch (e) { container.innerHTML = '<div class="empty-state"><p>Error loading notifications.</p></div>'; }
  },

  notifsGoToPage(page) { this._notifPage = page; this.fetchNotifications(); },
  async markNotificationRead(id) { try { await Api.put(`/notifications/${id}/read`, {}); await this.fetchNotifications(); } catch (e) {} },
  async markAllNotificationsRead() {
    try { UI.showLoader(); await Api.put('/notifications/read-all', {}); UI.showToast('All marked read.', 'success'); await this.fetchNotifications(); }
    catch (e) { UI.showToast('Failed.', 'error'); } finally { UI.hideLoader(); }
  },


  // ══════════════════════════════════════════════════════════════
  // TAB: PROFILE
  // ══════════════════════════════════════════════════════════════
  async loadProfileTab() {
    try {
      const r = await Api.get('/auth/me');
      if (!r.success) return;
      const { user, profile } = r.data;
      document.getElementById('pd-prof-name').value = user.full_name || '';
      document.getElementById('pd-prof-email').value = user.email || '';
      document.getElementById('pd-prof-phone').value = user.phone || '';
      if (profile) {
        document.getElementById('pd-prof-dob').value = profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '';
        document.getElementById('pd-prof-gender').value = profile.gender || '';
        document.getElementById('pd-prof-blood').value = profile.blood_group || '';
        document.getElementById('pd-prof-address').value = profile.address || '';
        document.getElementById('pd-prof-emergency').value = profile.emergency_contact || '';
      }
    } catch (e) { console.warn('Profile load failed'); }
  },

  async submitProfile() {
    const data = {
      phone: document.getElementById('pd-prof-phone').value,
      date_of_birth: document.getElementById('pd-prof-dob').value || null,
      gender: document.getElementById('pd-prof-gender').value || null,
      blood_group: document.getElementById('pd-prof-blood').value || null,
      address: document.getElementById('pd-prof-address').value || null,
      emergency_contact: document.getElementById('pd-prof-emergency').value || null,
    };
    try {
      UI.showLoader();
      const r = await Api.put('/auth/profile', data);
      if (r.success) UI.showToast('Profile updated!', 'success');
      else UI.showToast(r.message || 'Failed.', 'error');
    } catch (e) { UI.showToast(e.message || 'Failed.', 'error'); }
    finally { UI.hideLoader(); }
  },


  // ══════════════════════════════════════
  // UTILITIES
  // ══════════════════════════════════════
  _formatTime(time) {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  },

  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  _renderPagination(pag, callbackName) {
    if (!pag) return '';
    if (typeof UI !== 'undefined' && UI.renderPagination) return UI.renderPagination(pag, callbackName);
    const total = pag.totalPages || 1, page = pag.page || 1;
    let html = '';
    if (page > 1) html += `<button class="btn btn--sm btn--ghost" onclick="${callbackName}(${page - 1})">← Prev</button>`;
    for (let i = 1; i <= total; i++) {
      if (i === page) html += `<button class="btn btn--sm btn--primary" disabled style="opacity:0.8">${i}</button>`;
      else if (Math.abs(i - page) <= 2 || i === 1 || i === total) html += `<button class="btn btn--sm btn--ghost" onclick="${callbackName}(${i})">${i}</button>`;
      else if (Math.abs(i - page) === 3) html += `<span style="padding:0 4px;color:var(--color-text-light)">…</span>`;
    }
    if (page < total) html += `<button class="btn btn--sm btn--ghost" onclick="${callbackName}(${page + 1})">Next →</button>`;
    return html;
  },
};
