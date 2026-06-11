// ============================================================
// MediConnect – public/js/admin-dashboard.js
// Client-side controller for Admin tabbed panel
// ============================================================

const Utils = {
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  formatBytes(bytes, decimals = 1) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
};

const AdminDashboard = {
  currentTab: 'overview',
  cmsSections: [],
  settings: [],
  users: [], // active users list for notification target dropdown

  // Pagination states
  pages: {
    patients: 1,
    doctors: 1,
    appointments: 1,
    consultations: 1,
    labBookings: 1,
    samples: 1,
    reports: 1,
    notifications: 1
  },

  /**
   * Initialize Admin Dashboard
   */
  async init() {
    // Check tab from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') || 'overview';
    
    // Bind Tab click events
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });

    // Initialize general event listeners
    this.bindEvents();

    // Load initial tab
    this.switchTab(initialTab);
    
    // Preload users for notification target dropdown
    this.loadUsersList();
  },

  /**
   * Switch and load tab content
   */
  async switchTab(tabId) {
    this.currentTab = tabId;

    // Update Tab Buttons UI
    document.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update Tab Contents UI
    document.querySelectorAll('.tab-content').forEach(content => {
      if (content.id === `tab-${tabId}`) {
        content.style.display = 'block';
      } else {
        content.style.display = 'none';
      }
    });

    // Update browser URL query parameter without page reload
    const newUrl = `${window.location.pathname}?tab=${tabId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    // Load specific tab data
    switch (tabId) {
      case 'overview':
        await this.loadOverviewStats();
        break;
      case 'patients':
        await this.loadPatients();
        break;
      case 'doctors':
        await this.loadDoctors();
        break;
      case 'appointments':
        await this.loadAppointments();
        break;
      case 'consultations':
        await this.loadConsultations();
        break;
      case 'lab-tests':
        // Load default sub-tab
        this.switchSubTab('lab-tests-list');
        await this.loadLabTestsCatalog();
        await this.loadLabBookings();
        break;
      case 'samples':
        await this.loadSamples();
        break;
      case 'reports':
        await this.loadReports();
        break;
      case 'notifications':
        await this.loadNotificationsLogs();
        break;
      case 'analytics':
        await this.loadAnalytics();
        break;
      case 'cms':
        this.switchSubTab('cms-pages');
        await this.loadCmsTabContent('cms-pages');
        break;
      case 'settings':
        await this.loadSettings();
        break;
    }
  },

  /**
   * Switch nested/sub tabs
   */
  switchSubTab(subTabId) {
    const activeBtn = document.querySelector(`[data-nested-tab="${subTabId}"]`);
    if (!activeBtn) return;
    
    const tabsContainer = activeBtn.closest('.nested-tabs');
    tabsContainer.querySelectorAll('.nested-tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    activeBtn.classList.add('active');

    // Hide all sibling content panes
    const parentContainer = tabsContainer.parentElement;
    parentContainer.querySelectorAll('.nested-tab-content').forEach(pane => {
      pane.style.display = 'none';
    });

    const activePane = document.getElementById(`nested-${subTabId}`);
    if (activePane) activePane.style.display = 'block';
  },

  /**
   * Bind general event listeners for search forms, modal submits, and CMS selects
   */
  bindEvents() {
    // 1. Nested Sub-tab routing
    document.addEventListener('click', (e) => {
      const nestedBtn = e.target.closest('.nested-tab-btn');
      if (!nestedBtn) return;
      const subTabId = nestedBtn.getAttribute('data-nested-tab');
      this.switchSubTab(subTabId);
    });

    // 2. Search & filter bindings
    const patientSearch = document.getElementById('patient-search');
    if (patientSearch) {
      patientSearch.addEventListener('input', Utils.debounce(() => {
        this.pages.patients = 1;
        this.loadPatients();
      }, 300));
    }

    const doctorSearch = document.getElementById('doctor-search');
    if (doctorSearch) {
      doctorSearch.addEventListener('input', Utils.debounce(() => {
        this.pages.doctors = 1;
        this.loadDoctors();
      }, 300));
    }

    const apptSearch = document.getElementById('appt-search');
    const apptFilter = document.getElementById('appt-filter-status');
    if (apptSearch) {
      apptSearch.addEventListener('input', Utils.debounce(() => {
        this.pages.appointments = 1;
        this.loadAppointments();
      }, 300));
    }
    if (apptFilter) {
      apptFilter.addEventListener('change', () => {
        this.pages.appointments = 1;
        this.loadAppointments();
      });
    }

    const consultSearch = document.getElementById('consult-search');
    if (consultSearch) {
      consultSearch.addEventListener('input', Utils.debounce(() => {
        this.pages.consultations = 1;
        this.loadConsultations();
      }, 300));
    }

    const labFilter = document.getElementById('lab-booking-filter-status');
    if (labFilter) {
      labFilter.addEventListener('change', () => {
        this.pages.labBookings = 1;
        this.loadLabBookings();
      });
    }

    const sampleFilter = document.getElementById('sample-filter-status');
    if (sampleFilter) {
      sampleFilter.addEventListener('change', () => {
        this.pages.samples = 1;
        this.loadSamples();
      });
    }

    const reportSearch = document.getElementById('report-search');
    if (reportSearch) {
      reportSearch.addEventListener('input', Utils.debounce(() => {
        this.pages.reports = 1;
        this.loadReports();
      }, 300));
    }

    // 3. CMS Dynamic dropdown selector change
    const cmsSelect = document.getElementById('cms-section-select');
    if (cmsSelect) {
      cmsSelect.addEventListener('change', (e) => {
        this.renderCmsSectionFields(e.target.value);
      });
    }

    // 4. Form submits
    const docRegForm = document.getElementById('register-doctor-form');
    if (docRegForm) {
      docRegForm.addEventListener('submit', (e) => this.handleDoctorRegisterSubmit(e));
    }

    const docEditForm = document.getElementById('edit-doctor-form');
    if (docEditForm) {
      docEditForm.addEventListener('submit', (e) => this.handleDoctorEditSubmit(e));
    }

    const patEditForm = document.getElementById('edit-patient-form');
    if (patEditForm) {
      patEditForm.addEventListener('submit', (e) => this.handlePatientEditSubmit(e));
    }

    const notifForm = document.getElementById('broadcast-notification-form');
    if (notifForm) {
      notifForm.addEventListener('submit', (e) => this.handleBroadcastNotificationSubmit(e));
    }

    const apptReschedForm = document.getElementById('reschedule-form');
    if (apptReschedForm) {
      apptReschedForm.addEventListener('submit', (e) => this.handleRescheduleSubmit(e));
    }

    const labAddForm = document.getElementById('add-lab-test-form');
    if (labAddForm) {
      labAddForm.addEventListener('submit', (e) => this.handleLabTestAddSubmit(e));
    }

    const labEditForm = document.getElementById('edit-lab-test-form');
    if (labEditForm) {
      labEditForm.addEventListener('submit', (e) => this.handleLabTestEditSubmit(e));
    }

    const labResultForm = document.getElementById('lab-result-form');
    if (labResultForm) {
      labResultForm.addEventListener('submit', (e) => this.handleLabResultUploadSubmit(e));
    }

    const colAssignForm = document.getElementById('assign-collector-form');
    if (colAssignForm) {
      colAssignForm.addEventListener('submit', (e) => this.handleCollectorAssignSubmit(e));
    }

    const cmsHomeSectionSelect = document.getElementById('cms-home-section-select');
    if (cmsHomeSectionSelect) {
      cmsHomeSectionSelect.addEventListener('change', (e) => this.renderCmsHomeSectionFields(e.target.value));
    }

    const cmsHomeEditorForm = document.getElementById('cms-home-editor-form');
    if (cmsHomeEditorForm) {
      cmsHomeEditorForm.addEventListener('submit', (e) => this.handleCmsHomeSaveSubmit(e));
    }

    const cmsAboutForm = document.getElementById('cms-about-form');
    if (cmsAboutForm) {
      cmsAboutForm.addEventListener('submit', (e) => this.handleAboutFormSubmit(e));
    }

    const cmsContactForm = document.getElementById('cms-contact-form');
    if (cmsContactForm) {
      cmsContactForm.addEventListener('submit', (e) => this.handleContactFormSubmit(e));
    }

    const cmsFaqForm = document.getElementById('cms-faq-form');
    if (cmsFaqForm) {
      cmsFaqForm.addEventListener('submit', (e) => this.handleFaqFormSubmit(e));
    }

    const btnClearFaq = document.getElementById('btn-clear-faq-form');
    if (btnClearFaq) {
      btnClearFaq.addEventListener('click', () => this.resetFaqForm());
    }

    const mediaUploadForm = document.getElementById('cms-media-upload-form');
    if (mediaUploadForm) {
      mediaUploadForm.addEventListener('submit', (e) => this.handleMediaUploadSubmit(e));
    }

    const seoPageSelect = document.getElementById('cms-seo-page-select');
    if (seoPageSelect) {
      seoPageSelect.addEventListener('change', (e) => this.populateSeoFields(e.target.value));
    }

    const cmsSeoForm = document.getElementById('cms-seo-form');
    if (cmsSeoForm) {
      cmsSeoForm.addEventListener('submit', (e) => this.handleSeoFormSubmit(e));
    }

    const settingsForm = document.getElementById('system-settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => this.handleSettingsSaveSubmit(e));
    }

    const categoryForm = document.getElementById('category-form');
    if (categoryForm) {
      categoryForm.addEventListener('submit', (e) => this.handleCategorySubmit(e));
    }
  },

  // ============================================================
  // TAB DATA LOADERS
  // ============================================================

  /**
   * Load dashboard overview statistics and activity logs
   */
  async loadOverviewStats() {
    try {
      const response = await Api.get('/admin/dashboard');
      if (response.success && response.data) {
        const d = response.data;
        document.getElementById('stat-total-users').textContent = d.users?.total || 0;
        document.getElementById('stat-total-patients').textContent = d.users?.patients || 0;
        document.getElementById('stat-total-doctors').textContent = d.users?.doctors || 0;
        document.getElementById('stat-today-appts').textContent = d.todayAppointments || 0;
        document.getElementById('stat-total-appts').textContent = d.appointments?.total || 0;
        document.getElementById('stat-pending-labs').textContent = d.labBookings?.pending || 0;
        
        const totalReportsEl = document.getElementById('stat-total-reports');
        if (totalReportsEl) {
          totalReportsEl.textContent = d.reportsKPI?.total || 0;
          document.getElementById('stat-reports-storage').textContent = Utils.formatBytes(Number(d.reportsKPI?.total_size || 0));
        }

        const totalHistoryEl = document.getElementById('stat-total-history');
        if (totalHistoryEl) {
          totalHistoryEl.textContent = d.historyKPI?.total || 0;
        }
        
        const pendingColEl = document.getElementById('stat-col-pending');
        if (pendingColEl && d.collectionStats) {
          pendingColEl.textContent = d.collectionStats.pending || 0;
          document.getElementById('stat-col-assigned').textContent = d.collectionStats.assigned || 0;
          document.getElementById('stat-col-completed').textContent = d.collectionStats.completed || 0;
        }

        const notifSentEl = document.getElementById('stat-notif-sent');
        if (notifSentEl) {
          notifSentEl.textContent = d.notifSent || 0;
          document.getElementById('stat-notif-scheduled').textContent = d.notifScheduled || 0;
          document.getElementById('stat-notif-muted').textContent = d.notifMuted || 0;
        }

        // Render type trends chart
        if (d.notifTypeStats) {
          this.renderBarChart('notif-stats-chart', d.notifTypeStats, 'type', 'count');
        }
      }

      // Populate activity feed with latest broadcast logs
      const activityRes = await Api.get('/admin/notifications?limit=8');
      const container = document.getElementById('overview-activity-list');
      if (activityRes.success && activityRes.data) {
        if (activityRes.data.length === 0) {
          container.innerHTML = UI.emptyState('📢', 'No Platform Log', 'System activity is clear.');
          return;
        }

        const listHtml = activityRes.data.map(n => {
          const typeDot = n.type === 'warning' ? 'danger' : (n.type === 'success' ? 'success' : 'primary');
          const roleBadge = n.role ? `<span class="badge badge--gray badge--sm">${n.role.toUpperCase()}</span>` : '';
          return `
            <div class="activity-item">
              <div class="activity-item__dot activity-item__dot--${typeDot}"></div>
              <div class="activity-item__content">
                <div class="activity-item__text">
                  <strong>${Utils.escapeHtml(n.title)}</strong> - ${Utils.escapeHtml(n.message)}
                </div>
                <div class="activity-item__time">
                  Sent to ${Utils.escapeHtml(n.full_name || 'All')} ${roleBadge} | ${UI.formatDate(n.created_at)} ${UI.formatTime(n.created_at)}
                </div>
              </div>
            </div>
          `;
        }).join('');
        container.innerHTML = `<div class="activity-list">${listHtml}</div>`;
      }
    } catch (error) {
      UI.showToast('Failed to load dashboard statistics.', 'error');
    }
  },

  /**
   * Load patients directory table with query search and pagination
   */
  async loadPatients(page = 1) {
    this.pages.patients = page;
    const searchVal = document.getElementById('patient-search')?.value || '';
    const container = document.getElementById('patients-list');
    const pagContainer = document.getElementById('patients-pagination');
    
    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
    
    try {
      const res = await Api.get(`/admin/patients?search=${encodeURIComponent(searchVal)}&page=${page}&limit=10`);
      if (res.success && res.data) {
        if (res.data.length === 0) {
          container.innerHTML = UI.emptyState('👥', 'No Patients Found', 'No registered patients match this search.');
          pagContainer.innerHTML = '';
          return;
        }

        const rows = res.data.map(p => `
          <tr>
            <td><strong>${Utils.escapeHtml(p.full_name)}</strong></td>
            <td>${Utils.escapeHtml(p.email)}</td>
            <td>${Utils.escapeHtml(p.phone || '—')}</td>
            <td><span class="badge ${p.is_active ? 'badge--success' : 'badge--danger'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
              <div class="d-flex gap-2">
                <button class="btn btn--secondary btn--xs" onclick="AdminDashboard.viewPatientDetails(${p.id})">🔍 Details</button>
                <button class="btn btn--primary btn--xs" onclick="AdminDashboard.openEditPatientModal(${p.id})">⚙️ Edit</button>
                <button class="btn btn--danger btn--xs" onclick="AdminDashboard.handleDeletePatient(${p.id})">🗑️ Delete</button>
              </div>
            </td>
          </tr>
        `).join('');

        container.innerHTML = `
          <table class="table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>User Account Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
        pagContainer.innerHTML = UI.renderPagination(res.pagination, 'AdminDashboard.loadPatients');
      }
    } catch (error) {
      container.innerHTML = `<div class="empty-state text--danger">Error: ${error.message}</div>`;
    }
  },

  /**
   * Load doctors directory with query search and pagination
   */
  async loadDoctors(page = 1) {
    this.pages.doctors = page;
    const searchVal = document.getElementById('doctor-search')?.value || '';
    const container = document.getElementById('doctors-list');
    const pagContainer = document.getElementById('doctors-pagination');

    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    try {
      const res = await Api.get(`/admin/doctors?search=${encodeURIComponent(searchVal)}&page=${page}&limit=10`);
      if (res.success && res.data) {
        if (res.data.length === 0) {
          container.innerHTML = UI.emptyState('🩺', 'No Doctors Found', 'No registered doctors match this search.');
          pagContainer.innerHTML = '';
          return;
        }

        const rows = res.data.map(d => `
          <tr>
            <td>
              <div class="d-flex items-center gap-2">
                <strong>${Utils.escapeHtml(d.full_name)}</strong>
              </div>
            </td>
            <td>${Utils.escapeHtml(d.specialization)}</td>
            <td>${Utils.escapeHtml(d.department || '—')}</td>
            <td>$${d.consultation_fee}</td>
            <td><span class="badge ${d.is_available ? 'badge--success' : 'badge--warning'}">${d.is_available ? 'Available' : 'Unavailable'}</span></td>
            <td>
              <div class="d-flex gap-2">
                <button class="btn btn--secondary btn--xs" onclick="AdminDashboard.viewDoctorDetails(${d.id})">📅 Schedule/Leaves</button>
                <button class="btn btn--primary btn--xs" onclick="AdminDashboard.openEditDoctorModal(${d.id})">⚙️ Edit</button>
                <button class="btn btn--danger btn--xs" onclick="AdminDashboard.handleDeleteDoctor(${d.id})">🗑️ Delete</button>
              </div>
            </td>
          </tr>
        `).join('');

        container.innerHTML = `
          <table class="table">
            <thead>
              <tr>
                <th>Doctor Name</th>
                <th>Specialization</th>
                <th>Department</th>
                <th>Consult Fee</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
        pagContainer.innerHTML = UI.renderPagination(res.pagination, 'AdminDashboard.loadDoctors');
      }
    } catch (error) {
      container.innerHTML = `<div class="empty-state text--danger">Error: ${error.message}</div>`;
    }
  },

  /**
   * Load platform appointments
   */
  async loadAppointments(page = 1) {
    this.pages.appointments = page;
    const searchVal = document.getElementById('appt-search')?.value || '';
    const statusVal = document.getElementById('appt-filter-status')?.value || '';
    const container = document.getElementById('appts-list');
    const pagContainer = document.getElementById('appts-pagination');

    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    try {
      let url = `/appointments?page=${page}&limit=10`;
      if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
      if (statusVal) url += `&status=${statusVal}`;

      const res = await Api.get(url);
      if (res.success && res.data) {
        if (res.data.length === 0) {
          container.innerHTML = UI.emptyState('📅', 'No Appointments Found', 'No appointments recorded.');
          pagContainer.innerHTML = '';
          return;
        }

        const rows = res.data.map(a => {
          const isCancelable = a.status === 'scheduled' || a.status === 'confirmed';
          const isConfirmable = a.status === 'scheduled';
          return `
            <tr>
              <td><strong>${Utils.escapeHtml(a.patient_name)}</strong></td>
              <td>Dr. ${Utils.escapeHtml(a.doctor_name)}</td>
              <td>${UI.formatDate(a.appointment_date)} at ${UI.formatTime(a.appointment_time)}</td>
              <td>${UI.statusBadge(a.status)}</td>
              <td>
                <div class="d-flex gap-2">
                  ${isConfirmable ? `<button class="btn btn--success btn--xs" onclick="AdminDashboard.handleConfirmAppointment(${a.id})">✓ Confirm</button>` : ''}
                  ${isCancelable ? `<button class="btn btn--primary btn--xs" onclick="AdminDashboard.openRescheduleModal(${a.id}, '${a.appointment_date}', '${a.appointment_time}')">⏰ Reschedule</button>` : ''}
                  ${isCancelable ? `<button class="btn btn--danger btn--xs" onclick="AdminDashboard.handleCancelAppointment(${a.id})">✕ Cancel</button>` : ''}
                  <button class="btn btn--ghost btn--xs" onclick="AdminDashboard.handleDeleteAppointment(${a.id})">🗑️ Delete</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        container.innerHTML = `
          <table class="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
        pagContainer.innerHTML = UI.renderPagination(res.pagination, 'AdminDashboard.loadAppointments');
      }
    } catch (error) {
      container.innerHTML = `<div class="empty-state text--danger">Error: ${error.message}</div>`;
    }
  },

  /**
   * Load consultation records
   */
  async loadConsultations(page = 1) {
    this.pages.consultations = page;
    const searchVal = document.getElementById('consult-search')?.value || '';
    const container = document.getElementById('consults-list');
    const pagContainer = document.getElementById('consults-pagination');

    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    try {
      const res = await Api.get(`/consultations?search=${encodeURIComponent(searchVal)}&page=${page}&limit=10`);
      if (res.success && res.data) {
        if (res.data.length === 0) {
          container.innerHTML = UI.emptyState('💬', 'No Consultations Found', 'No consultation records available.');
          pagContainer.innerHTML = '';
          return;
        }

        const rows = res.data.map(c => `
          <tr>
            <td><strong>${Utils.escapeHtml(c.patient_name)}</strong></td>
            <td>Dr. ${Utils.escapeHtml(c.doctor_name)}</td>
            <td>${Utils.escapeHtml(c.diagnosis)}</td>
            <td>${Utils.escapeHtml(c.prescription || '—')}</td>
            <td>${c.follow_up_date ? UI.formatDate(c.follow_up_date) : 'None'}</td>
            <td>${UI.formatDate(c.created_at)}</td>
          </tr>
        `).join('');

        container.innerHTML = `
          <table class="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Diagnosis</th>
                <th>Prescription</th>
                <th>Follow-up</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
        pagContainer.innerHTML = UI.renderPagination(res.pagination, 'AdminDashboard.loadConsultations');
      }
    } catch (error) {
      container.innerHTML = `<div class="empty-state text--danger">Error: ${error.message}</div>`;
    }
  },

  /**
   * Load Lab tests catalog
   */
  async loadLabTestsCatalog() {
    const container = document.getElementById('lab-tests-catalog');
    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    try {
      const res = await Api.get('/lab-tests');
      if (res.success && res.data) {
        if (res.data.length === 0) {
          container.innerHTML = UI.emptyState('🔬', 'Lab Catalog Empty', 'No lab tests available.');
          return;
        }

        const rows = res.data.map(t => `
          <tr>
            <td><strong>${Utils.escapeHtml(t.test_name)}</strong></td>
            <td><span class="badge badge--info">${Utils.escapeHtml(t.category)}</span></td>
            <td><strong>$${t.price}</strong></td>
            <td>${Utils.escapeHtml(t.description || '—')}</td>
            <td><span class="badge ${t.is_active ? 'badge--success' : 'badge--gray'}">${t.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
              <div class="d-flex gap-2">
                <button class="btn btn--primary btn--xs" onclick="AdminDashboard.openEditLabTestModal(${JSON.stringify(t).replace(/"/g, '&quot;')})">⚙️ Edit</button>
                <button class="btn btn--danger btn--xs" onclick="AdminDashboard.handleDeactivateLabTest(${t.id})">${t.is_active ? 'Deactivate' : 'Activate'}</button>
              </div>
            </td>
          </tr>
        `).join('');

        container.innerHTML = `
          <table class="table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }
    } catch (error) {
      container.innerHTML = `<div class="empty-state text--danger">Error: ${error.message}</div>`;
    }
  },

  /**
   * Load lab bookings lists
   */
  async loadLabBookings(page = 1) {
    this.pages.labBookings = page;
    const statusVal = document.getElementById('lab-booking-filter-status')?.value || '';
    const container = document.getElementById('lab-bookings-grid');
    const pagContainer = document.getElementById('lab-bookings-pagination');

    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    try {
      let url = `/lab-bookings?page=${page}&limit=10`;
      if (statusVal) url += `&status=${statusVal}`;

      const res = await Api.get(url);
      if (res.success && res.data) {
        if (res.data.length === 0) {
          container.innerHTML = UI.emptyState('🔬', 'No Lab Bookings', 'No lab test bookings match filter.');
          pagContainer.innerHTML = '';
          return;
        }

        const rows = res.data.map(b => {
          const canConfirm = b.status === 'pending';
          const canSchedule = b.status === 'confirmed';
          const canCollect = b.status === 'sample_scheduled' || b.status === 'confirmed';
          const canProcess = b.status === 'sample_collected';
          const canComplete = b.status === 'processing';
          
          return `
            <tr>
              <td><strong>${Utils.escapeHtml(b.patient_name)}</strong></td>
              <td>${Utils.escapeHtml(b.test_name)}</td>
              <td>${UI.formatDate(b.booking_date)} ${b.preferred_time ? 'at ' + UI.formatTime(b.preferred_time) : ''}</td>
              <td>${UI.statusBadge(b.status)}</td>
              <td>
                ${b.result_file_url ? `<a href="${b.result_file_url}" target="_blank" class="btn btn--ghost btn--xs">📂 View Result</a>` : '—'}
              </td>
              <td>
                <div class="d-flex gap-2">
                  ${canConfirm ? `<button class="btn btn--success btn--xs" onclick="AdminDashboard.handleUpdateLabStatus(${b.id}, 'confirmed')">Confirm</button>` : ''}
                  ${canSchedule ? `<button class="btn btn--info btn--xs" onclick="AdminDashboard.handleUpdateLabStatus(${b.id}, 'sample_scheduled')">Schedule Sample</button>` : ''}
                  ${canCollect ? `<button class="btn btn--primary btn--xs" onclick="AdminDashboard.handleUpdateLabStatus(${b.id}, 'sample_collected')">Collected</button>` : ''}
                  ${canProcess ? `<button class="btn btn--warning btn--xs" onclick="AdminDashboard.handleUpdateLabStatus(${b.id}, 'processing')">Process</button>` : ''}
                  ${canComplete ? `<button class="btn btn--success btn--xs" onclick="AdminDashboard.openLabResultModal(${b.id})">Upload Result</button>` : ''}
                  ${b.status !== 'completed' && b.status !== 'cancelled' ? `<button class="btn btn--danger btn--xs" onclick="AdminDashboard.handleUpdateLabStatus(${b.id}, 'cancelled')">Cancel</button>` : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('');

        container.innerHTML = `
          <table class="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Lab Test</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Report File</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
        pagContainer.innerHTML = UI.renderPagination(res.pagination, 'AdminDashboard.loadLabBookings');
      }
    } catch (error) {
      container.innerHTML = `<div class="empty-state text--danger">Error: ${error.message}</div>`;
    }
  },

  /**
   * Load home sample collection requests
   */
  async loadSamples(page = 1) {
    this.pages.samples = page;
    const statusVal = document.getElementById('sample-filter-status')?.value || '';
    const container = document.getElementById('samples-list');
    const pagContainer = document.getElementById('samples-pagination');

    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    try {
      this.loadOverviewStats();
      let url = `/sample-collections?page=${page}&limit=10`;
      if (statusVal) url += `&status=${statusVal}`;

      const res = await Api.get(url);
      if (res.success && res.data) {
        if (res.data.length === 0) {
          container.innerHTML = UI.emptyState('🏠', 'No Sample Collections', 'No collection requests found.');
          pagContainer.innerHTML = '';
          return;
        }

        const rows = res.data.map(s => {
          let actionButtons = '';
          if (s.status === 'requested') {
            actionButtons += `<button class="btn btn--primary btn--xs" onclick="AdminDashboard.openAssignCollectorModal(${s.id})">👤 Assign</button>`;
            actionButtons += `<button class="btn btn--danger btn--xs" onclick="AdminDashboard.handleUpdateSampleStatus(${s.id}, 'cancelled')">Cancel</button>`;
          } else if (s.status === 'assigned') {
            actionButtons += `<button class="btn btn--info btn--xs" onclick="AdminDashboard.handleUpdateSampleStatus(${s.id}, 'scheduled')">Schedule</button>`;
            actionButtons += `<button class="btn btn--primary btn--xs" onclick="AdminDashboard.openAssignCollectorModal(${s.id})">Re-assign</button>`;
            actionButtons += `<button class="btn btn--danger btn--xs" onclick="AdminDashboard.handleUpdateSampleStatus(${s.id}, 'cancelled')">Cancel</button>`;
          } else if (s.status === 'scheduled') {
            actionButtons += `<button class="btn btn--warning btn--xs" onclick="AdminDashboard.handleUpdateSampleStatus(${s.id}, 'in_transit')">Start Transit</button>`;
            actionButtons += `<button class="btn btn--primary btn--xs" onclick="AdminDashboard.openAssignCollectorModal(${s.id})">Re-assign</button>`;
            actionButtons += `<button class="btn btn--danger btn--xs" onclick="AdminDashboard.handleUpdateSampleStatus(${s.id}, 'cancelled')">Cancel</button>`;
          } else if (s.status === 'in_transit') {
            actionButtons += `<button class="btn btn--success btn--xs" onclick="AdminDashboard.handleUpdateSampleStatus(${s.id}, 'collected')">Collected</button>`;
            actionButtons += `<button class="btn btn--danger btn--xs" onclick="AdminDashboard.handleUpdateSampleStatus(${s.id}, 'cancelled')">Cancel</button>`;
          } else if (s.status === 'collected') {
            actionButtons += `<button class="btn btn--warning btn--xs" onclick="AdminDashboard.handleUpdateSampleStatus(${s.id}, 'testing')">Start Testing</button>`;
          } else if (s.status === 'testing') {
            actionButtons += `<button class="btn btn--success btn--xs" onclick="AdminDashboard.handleUpdateSampleStatus(${s.id}, 'report_ready')">Report Ready</button>`;
          } else if (s.status === 'report_ready') {
            actionButtons += `<button class="btn btn--success btn--xs" onclick="AdminDashboard.handleUpdateSampleStatus(${s.id}, 'delivered')">Deliver</button>`;
          }

          let collectorInfo = 'Not Assigned';
          if (s.collector_name) {
            collectorInfo = `<strong>${Utils.escapeHtml(s.collector_name)}</strong>`;
            if (s.collector_phone) collectorInfo += `<br><span class="text-xs text-muted">${Utils.escapeHtml(s.collector_phone)}</span>`;
            if (s.collection_date) {
              const formattedDate = UI.formatDate(s.collection_date);
              const formattedTime = s.collection_time ? s.collection_time.substring(0, 5) : '';
              collectorInfo += `<br><span class="text-xs text-muted">Sched: ${formattedDate} ${formattedTime}</span>`;
            }
          }

          return `
            <tr>
              <td><strong>${Utils.escapeHtml(s.patient_name)}</strong></td>
              <td>${Utils.escapeHtml(s.collection_address)}</td>
              <td>${Utils.escapeHtml(s.patient_phone || '—')}</td>
              <td>${collectorInfo}</td>
              <td>${UI.statusBadge(s.status)}</td>
              <td>
                <div class="d-flex gap-2">
                  ${actionButtons || '—'}
                </div>
              </td>
            </tr>
          `;
        }).join('');

        container.innerHTML = `
          <table class="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Collector</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
        pagContainer.innerHTML = UI.renderPagination(res.pagination, 'AdminDashboard.loadSamples');
      }
    } catch (error) {
      container.innerHTML = `<div class="empty-state text--danger">Error: ${error.message}</div>`;
    }
  },

  /**
   * Load uploaded medical reports
   */
  async loadReports(page = 1) {
    this.pages.reports = page;
    const searchVal = document.getElementById('report-search')?.value || '';
    const container = document.getElementById('reports-list');
    const pagContainer = document.getElementById('reports-pagination');

    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    try {
      const res = await Api.get(`/reports?search=${encodeURIComponent(searchVal)}&page=${page}&limit=10`);
      if (res.success && res.data) {
        if (res.data.length === 0) {
          container.innerHTML = UI.emptyState('📄', 'No Reports Found', 'No reports match search query.');
          pagContainer.innerHTML = '';
          return;
        }

        const rows = res.data.map(r => `
          <tr>
            <td><strong>${Utils.escapeHtml(r.patient_name)}</strong></td>
            <td>Dr. ${Utils.escapeHtml(r.doctor_name || 'System')}</td>
            <td><span class="badge badge--info">${r.category || 'General'}</span></td>
            <td><span class="badge ${CONFIG.STATUS_BADGES[r.report_type] || 'badge--gray'}">${r.report_type}</span></td>
            <td>${Utils.escapeHtml(r.title)}</td>
            <td><span class="text-xs text-muted">${Utils.formatBytes(r.file_size)}</span></td>
            <td>
              <div class="d-flex gap-2">
                <a href="${r.file_url}" target="_blank" class="btn btn--ghost btn--xs">👁️ View</a>
                <button onclick="AdminDashboard.downloadReport(${r.id}, '${r.original_filename || 'medical-report.pdf'}')" class="btn btn--secondary btn--xs">💾 Download</button>
              </div>
            </td>
            <td>
              <button class="btn btn--danger btn--xs" onclick="AdminDashboard.handleDeleteReport(${r.id})">🗑️ Delete</button>
            </td>
          </tr>
        `).join('');

        container.innerHTML = `
          <table class="table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Uploaded By</th>
                <th>Category</th>
                <th>Type</th>
                <th>Title</th>
                <th>Size</th>
                <th>Document</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
        pagContainer.innerHTML = UI.renderPagination(res.pagination, 'AdminDashboard.loadReports');
      }
      
      // Also load categories and audit logs if we are in reports tab
      await this.loadReportCategories();
      await this.loadReportAuditLogs();
    } catch (error) {
      container.innerHTML = `<div class="empty-state text--danger">Error: ${error.message}</div>`;
    }
  },

  async downloadReport(id, filename) {
    try {
      const token = Auth.getToken();
      const response = await fetch(`${CONFIG.API_BASE_URL}/reports/${id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to download report');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename || 'medical-report.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      UI.showToast('Report downloaded successfully.', 'success');
    } catch (error) {
      console.error(error);
      UI.showToast('Failed to download report.', 'error');
    }
  },

  async loadReportCategories() {
    const container = document.getElementById('reports-categories-list');
    if (!container) return;

    try {
      const res = await Api.get('/reports/categories');
      if (res.success && res.data) {
        if (res.data.length === 0) {
          container.innerHTML = UI.emptyState('🏷️', 'No Categories', 'No custom report categories found.');
          return;
        }

        const rows = res.data.map(c => `
          <tr>
            <td><strong>${Utils.escapeHtml(c.category_name)}</strong></td>
            <td><span class="badge ${c.is_active ? 'badge--success' : 'badge--danger'}">${c.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>${UI.formatDate(c.created_at)}</td>
            <td>
              <div class="d-flex gap-2">
                <button class="btn btn--secondary btn--xs" onclick="AdminDashboard.openEditCategoryModal(${c.id}, '${c.category_name.replace(/'/g, "\\'")}', ${c.is_active})">⚙️ Edit</button>
                <button class="btn btn--danger btn--xs" onclick="AdminDashboard.handleDeleteCategory(${c.id})">🗑️ Delete</button>
              </div>
            </td>
          </tr>
        `).join('');

        container.innerHTML = `
          <table class="table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }
    } catch (error) {
      container.innerHTML = `<div class="empty-state text--danger">Error: ${error.message}</div>`;
    }
  },

  async loadReportAuditLogs() {
    const container = document.getElementById('reports-audit-logs');
    if (!container) return;

    try {
      const res = await Api.get('/reports/logs');
      if (res.success && res.data) {
        if (res.data.length === 0) {
          container.innerHTML = UI.emptyState('🔒', 'No HIPAA logs', 'No report security activity log entries.');
          return;
        }

        const rows = res.data.map(l => `
          <tr>
            <td><strong>${Utils.escapeHtml(l.user_name)}</strong> <span class="badge badge--gray badge--sm">${l.user_role}</span></td>
            <td><span class="badge badge--info">${l.activity_type.toUpperCase()}</span></td>
            <td>${Utils.escapeHtml(l.report_title)} (Patient: ${Utils.escapeHtml(l.patient_name)})</td>
            <td><code>${Utils.escapeHtml(l.ip_address || '—')}</code></td>
            <td>${UI.formatDate(l.created_at)} ${UI.formatTime(l.created_at)}</td>
          </tr>
        `).join('');

        container.innerHTML = `
          <table class="table">
            <thead>
              <tr>
                <th>User / Role</th>
                <th>Action</th>
                <th>Target Report</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }
    } catch (error) {
      container.innerHTML = `<div class="empty-state text--danger">Error: ${error.message}</div>`;
    }
  },

  openAddCategoryModal() {
    document.getElementById('category-form').reset();
    document.getElementById('cat-id').value = '';
    document.getElementById('category-modal-title').textContent = 'Add Report Category';
    document.getElementById('btn-save-category').textContent = 'Save Category';
    UI.openModal('category-modal');
  },

  openEditCategoryModal(id, name, isActive) {
    document.getElementById('category-form').reset();
    document.getElementById('cat-id').value = id;
    document.getElementById('cat-name').value = name;
    document.getElementById('category-modal-title').textContent = 'Edit Report Category';
    document.getElementById('btn-save-category').textContent = 'Update Category';
    UI.openModal('category-modal');
  },

  async handleCategorySubmit(e) {
    e.preventDefault();
    UI.showLoader();

    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('cat-name').value.trim();

    try {
      let res;
      if (id) {
        res = await Api.put(`/reports/categories/${id}`, { category_name: name });
      } else {
        res = await Api.post('/reports/categories', { category_name: name });
      }

      if (res.success) {
        UI.showToast(res.message || 'Category saved successfully.', 'success');
        UI.closeModal('category-modal');
        await this.loadReports();
      }
    } catch (error) {
      UI.showToast('Failed to save category: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleDeleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category? Linked reports will fallback to General.')) return;
    UI.showLoader();
    try {
      const res = await Api.delete(`/reports/categories/${id}`);
      if (res.success) {
        UI.showToast('Category deleted.', 'success');
        await this.loadReports();
      }
    } catch (error) {
      UI.showToast('Failed to delete category: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Load notifications composer history logs
   */
  async loadNotificationsLogs(page = 1) {
    this.pages.notifications = page;
    const container = document.getElementById('notifications-logs-list');
    const pagContainer = document.getElementById('notifications-logs-pagination');

    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    try {
      const res = await Api.get(`/admin/notifications?page=${page}&limit=10`);
      if (res.success && res.data) {
        if (res.data.length === 0) {
          container.innerHTML = UI.emptyState('🔔', 'No Broadcast logs', 'Notification logs are clear.');
          pagContainer.innerHTML = '';
          return;
        }

        const rows = res.data.map(n => `
          <tr>
            <td><strong>${Utils.escapeHtml(n.full_name || 'All Users')}</strong></td>
            <td>${Utils.escapeHtml(n.title)}</td>
            <td>${Utils.escapeHtml(n.message)}</td>
            <td><span class="badge badge--info">${n.type}</span></td>
            <td>${UI.formatDate(n.created_at)} ${UI.formatTime(n.created_at)}</td>
          </tr>
        `).join('');

        container.innerHTML = `
          <table class="table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Title</th>
                <th>Message</th>
                <th>Type</th>
                <th>Sent At</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
        pagContainer.innerHTML = UI.renderPagination(res.pagination, 'AdminDashboard.loadNotificationsLogs');
      }
    } catch (error) {
      container.innerHTML = `<div class="empty-state text--danger">Error: ${error.message}</div>`;
    }
  },

  /**
   * Load analytics databases statistics and render SVG charts
   */
  async loadAnalytics() {
    try {
      const res = await Api.get('/admin/analytics');
      if (res.success && res.data) {
        const d = res.data;

        // 1. Patient registrations trend
        this.renderBarChart('analytics-signups-chart', d.patientRegistrations, 'date', 'count');

        // 2. Revenue trend
        this.renderBarChart('analytics-revenue-chart', d.revenue, 'month', 'revenue', '$');

        // 3. Top Doctors table
        const docContainer = document.getElementById('analytics-top-doctors');
        if (d.topDoctors && d.topDoctors.length > 0) {
          const docRows = d.topDoctors.map(doc => `
            <tr>
              <td><strong>${Utils.escapeHtml(doc.name)}</strong></td>
              <td>${Utils.escapeHtml(doc.specialization)}</td>
              <td><span class="badge badge--success">${doc.appointment_count} Bookings</span></td>
            </tr>
          `).join('');
          docContainer.innerHTML = `
            <table class="table">
              <thead><tr><th>Doctor</th><th>Specialty</th><th>Total Bookings</th></tr></thead>
              <tbody>${docRows}</tbody>
            </table>
          `;
        } else {
          docContainer.innerHTML = '<div class="empty-state">No appointments recorded yet.</div>';
        }

        // 4. Popular lab tests
        const testContainer = document.getElementById('analytics-top-labtests');
        if (d.labTestTrends && d.labTestTrends.length > 0) {
          const testRows = d.labTestTrends.map(t => `
            <tr>
              <td><strong>${Utils.escapeHtml(t.test_name)}</strong></td>
              <td><span class="badge badge--info">${t.booking_count} Booked</span></td>
            </tr>
          `).join('');
          testContainer.innerHTML = `
            <table class="table">
              <thead><tr><th>Lab Test</th><th>Times Booked</th></tr></thead>
              <tbody>${testRows}</tbody>
            </table>
          `;
        } else {
          testContainer.innerHTML = '<div class="empty-state">No lab tests booked yet.</div>';
        }
      }
    } catch (error) {
      UI.showToast('Failed to load analytical metrics.', 'error');
    }
  },

  /**
   * Helper to draw custom HTML bar charts dynamically
   */
  renderBarChart(containerId, data, xKey, yKey, prefix = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state">No data available</div>';
      return;
    }

    const values = data.map(item => Number(item[yKey] || 0));
    const maxVal = Math.max(...values, 5);

    const barsHtml = data.map(item => {
      const val = Number(item[yKey] || 0);
      const pct = (val / maxVal) * 100;
      const label = item[xKey] || '';
      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
          <div class="bar-chart-bar" style="height: ${pct}%; width: 50%;" title="${label}: ${prefix}${val}">
            <div class="bar-chart-bar-tooltip">${prefix}${val}</div>
          </div>
          <div class="bar-chart-label" style="max-width: 60px; font-size: 8px;">${label}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = barsHtml;
  },

  /**
   * Router to load specific CMS sub-tab contents
   */
  async loadCmsTabContent(subTabId) {
    switch (subTabId) {
      case 'cms-pages':
        await this.loadCmsPages();
        break;
      case 'cms-home-sections':
        await this.loadCmsHomeSections();
        break;
      case 'cms-about-contact':
        await this.loadCmsAboutContact();
        break;
      case 'cms-faqs':
        await this.loadCmsFaqs();
        break;
      case 'cms-socials':
        await this.loadCmsSocialLinks();
        break;
      case 'cms-media':
        await this.loadCmsMedia();
        break;
      case 'cms-seo':
        await this.loadCmsSeo();
        break;
    }
  },

  /**
   * Load CMS Page list
   */
  async loadCmsPages() {
    try {
      const res = await Api.get('/cms/pages');
      if (res.success && res.data) {
        const body = document.getElementById('cms-pages-table-body');
        if (!body) return;
        
        if (res.data.length === 0) {
          body.innerHTML = '<tr><td colspan="4" style="text-align:center;">No pages configured.</td></tr>';
          return;
        }

        body.innerHTML = res.data.map(page => `
          <tr>
            <td><strong>${Utils.escapeHtml(page.title)}</strong></td>
            <td><code>/${Utils.escapeHtml(page.slug)}</code></td>
            <td>
              <span class="badge ${page.is_active ? 'badge--success' : 'badge--danger'}">
                ${page.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>
              <div class="d-flex gap-2">
                <button class="btn btn--secondary btn--sm" onclick="AdminDashboard.togglePageActive(${page.id}, ${page.is_active})">
                  ${page.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button class="btn btn--primary btn--sm" onclick="AdminDashboard.goToSeoTab(${page.id})">
                  Configure SEO
                </button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      UI.showToast('Failed to load CMS pages: ' + err.message, 'error');
    }
  },

  async togglePageActive(id, currentStatus) {
    UI.showLoader();
    try {
      const res = await Api.put(`/cms/page/${id}`, { is_active: currentStatus ? 0 : 1 });
      if (res.success) {
        UI.showToast('Page status updated.', 'success');
        await this.loadCmsPages();
      }
    } catch (err) {
      UI.showToast('Failed to update page status: ' + err.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  goToSeoTab(pageId) {
    this.switchSubTab('cms-seo');
    this.loadCmsTabContent('cms-seo').then(() => {
      const select = document.getElementById('cms-seo-page-select');
      if (select) {
        select.value = pageId;
        this.populateSeoFields(pageId);
      }
    });
  },

  /**
   * Homepage Dynamic Sections
   */
  async loadCmsHomeSections() {
    try {
      const res = await Api.get('/cms/sections');
      if (res.success && res.data) {
        this.cmsSections = res.data;
        const select = document.getElementById('cms-home-section-select');
        if (select) {
          // Select default if not set
          const activeKey = select.value || 'hero';
          this.renderCmsHomeSectionFields(activeKey);
        }
      }
    } catch (err) {
      UI.showToast('Failed to load homepage sections.', 'error');
    }
  },

  renderCmsHomeSectionFields(sectionKey) {
    const section = this.cmsSections.find(s => s.section_key === sectionKey);
    const container = document.getElementById('cms-home-fields-container');
    if (!container || !section) return;

    const data = section.section_data || {};
    let html = '';

    Object.keys(data).forEach(key => {
      const val = data[key];
      if (typeof val === 'string') {
        if (val.length > 80) {
          html += `
            <div class="form-group">
              <label class="form-label" for="cms-home-field-${key}">${key.replace(/_/g, ' ').toUpperCase()}</label>
              <textarea id="cms-home-field-${key}" class="form-textarea" rows="4" required>${Utils.escapeHtml(val)}</textarea>
            </div>
          `;
        } else {
          html += `
            <div class="form-group">
              <label class="form-label" for="cms-home-field-${key}">${key.replace(/_/g, ' ').toUpperCase()}</label>
              <input type="text" id="cms-home-field-${key}" class="form-input" value="${Utils.escapeHtml(val)}" required>
            </div>
          `;
        }
      } else {
        html += `
          <div class="form-group">
            <label class="form-label" for="cms-home-field-${key}">${key.replace(/_/g, ' ').toUpperCase()} (JSON structure)</label>
            <textarea id="cms-home-field-${key}" class="form-textarea" rows="8" style="font-family:monospace;font-size:13px;" required>${JSON.stringify(val, null, 2)}</textarea>
          </div>
        `;
      }
    });

    container.innerHTML = html;
  },

  /**
   * Load About & Contact contents
   */
  async loadCmsAboutContact() {
    try {
      const [aboutRes, contactRes] = await Promise.all([
        Api.get('/cms/sections/about'),
        Api.get('/cms/sections/contact')
      ]);

      if (aboutRes.success && aboutRes.data) {
        const d = aboutRes.data.section_data || {};
        this.aboutValuesCache = d.values;
        document.getElementById('about-title-input').value = d.title || '';
        document.getElementById('about-subtitle-input').value = d.subtitle || '';
        document.getElementById('about-desc-input').value = d.description || '';
        document.getElementById('about-desc-sec-input').value = d.description_secondary || '';
        document.getElementById('about-mission-title-input').value = d.mission_title || '';
        document.getElementById('about-mission-desc-input').value = d.mission_desc || '';
        document.getElementById('about-vision-title-input').value = d.vision_title || '';
        document.getElementById('about-vision-desc-input').value = d.vision_desc || '';
      }

      if (contactRes.success && contactRes.data) {
        const d = contactRes.data.section_data || {};
        document.getElementById('contact-title-input').value = d.title || '';
        document.getElementById('contact-subtitle-input').value = d.subtitle || '';
        document.getElementById('contact-address-title-input').value = d.address_title || '';
        document.getElementById('contact-address-value-input').value = d.address_value || '';
        document.getElementById('contact-phone-title-input').value = d.phone_title || '';
        document.getElementById('contact-phone-value-input').value = d.phone_value || '';
        document.getElementById('contact-email-title-input').value = d.email_title || '';
        document.getElementById('contact-email-value-input').value = d.email_value || '';
        document.getElementById('contact-hours-title-input').value = d.hours_title || '';
        document.getElementById('contact-hours-value-input').value = d.hours_value || '';
        document.getElementById('contact-emergency-title-input').value = d.emergency_title || '';
        document.getElementById('contact-emergency-value-input').value = d.emergency_value || '';
      }
    } catch (err) {
      UI.showToast('Failed to load About/Contact CMS sections: ' + err.message, 'error');
    }
  },

  /**
   * FAQs Management
   */
  async loadCmsFaqs() {
    try {
      const res = await Api.get('/cms/faqs/all');
      if (res.success && res.data) {
        this.faqsList = res.data;
        const body = document.getElementById('cms-faqs-table-body');
        if (!body) return;

        if (res.data.length === 0) {
          body.innerHTML = '<tr><td colspan="4" style="text-align:center;">No FAQs added.</td></tr>';
          return;
        }

        body.innerHTML = res.data.map((faq, index) => `
          <tr>
            <td>
              <div class="d-flex align-items-center gap-1">
                <span>${faq.display_order}</span>
                <button class="btn btn--ghost btn--sm p-0" onclick="AdminDashboard.reorderFaq(${faq.id}, 'up')" ${index === 0 ? 'disabled' : ''}>▲</button>
                <button class="btn btn--ghost btn--sm p-0" onclick="AdminDashboard.reorderFaq(${faq.id}, 'down')" ${index === res.data.length - 1 ? 'disabled' : ''}>▼</button>
              </div>
            </td>
            <td><strong>${Utils.escapeHtml(faq.question)}</strong></td>
            <td>
              <span class="badge ${faq.is_active ? 'badge--success' : 'badge--danger'}">
                ${faq.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>
              <div class="d-flex gap-2">
                <button class="btn btn--secondary btn--sm" onclick="AdminDashboard.editFaq(${faq.id})">Edit</button>
                <button class="btn btn--danger btn--sm" onclick="AdminDashboard.deleteFaq(${faq.id})">Delete</button>
              </div>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      UI.showToast('Failed to load FAQs: ' + err.message, 'error');
    }
  },

  resetFaqForm() {
    document.getElementById('faq-form-title').textContent = 'Add New FAQ';
    document.getElementById('faq-id').value = '';
    document.getElementById('faq-question-input').value = '';
    document.getElementById('faq-answer-input').value = '';
    document.getElementById('faq-order-input').value = '0';
    document.getElementById('faq-active-input').value = '1';
  },

  editFaq(id) {
    const faq = this.faqsList.find(f => f.id === id);
    if (!faq) return;
    document.getElementById('faq-form-title').textContent = 'Edit FAQ';
    document.getElementById('faq-id').value = faq.id;
    document.getElementById('faq-question-input').value = faq.question;
    document.getElementById('faq-answer-input').value = faq.answer;
    document.getElementById('faq-order-input').value = faq.display_order;
    document.getElementById('faq-active-input').value = faq.is_active;
    
    // Smooth scroll to form
    const formCard = document.getElementById('cms-faq-form').closest('.card');
    if (formCard) formCard.scrollIntoView({ behavior: 'smooth' });
  },

  async deleteFaq(id) {
    if (!confirm('Are you sure you want to delete this FAQ permanently?')) return;
    UI.showLoader();
    try {
      const res = await Api.delete(`/cms/faqs/${id}`);
      if (res.success) {
        UI.showToast('FAQ deleted.', 'success');
        this.resetFaqForm();
        await this.loadCmsFaqs();
      }
    } catch (err) {
      UI.showToast('Failed to delete FAQ: ' + err.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async reorderFaq(id, direction) {
    const index = this.faqsList.findIndex(f => f.id === id);
    if (index === -1) return;

    let swapIndex = -1;
    if (direction === 'up' && index > 0) swapIndex = index - 1;
    else if (direction === 'down' && index < this.faqsList.length - 1) swapIndex = index + 1;

    if (swapIndex === -1) return;

    UI.showLoader();
    try {
      const item1 = this.faqsList[index];
      const item2 = this.faqsList[swapIndex];
      const payload = {
        order: [
          { id: item1.id, display_order: item2.display_order },
          { id: item2.id, display_order: item1.display_order }
        ]
      };
      const res = await Api.post('/cms/faqs/reorder', payload);
      if (res.success) {
        UI.showToast('FAQ display order updated.', 'success');
        await this.loadCmsFaqs();
      }
    } catch (err) {
      UI.showToast('Failed to reorder: ' + err.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Social Links Management
   */
  async loadCmsSocialLinks() {
    try {
      const res = await Api.get('/cms/social-links/all');
      if (res.success && res.data) {
        const body = document.getElementById('cms-socials-table-body');
        if (!body) return;

        if (res.data.length === 0) {
          body.innerHTML = '<tr><td colspan="4" style="text-align:center;">No social links seeded.</td></tr>';
          return;
        }

        body.innerHTML = res.data.map(link => `
          <tr>
            <td><strong style="text-transform:uppercase;">${Utils.escapeHtml(link.platform)}</strong></td>
            <td>
              <input type="url" id="social-url-${link.id}" class="form-input" style="width:100%;max-width:400px;" value="${Utils.escapeHtml(link.url || '')}" placeholder="https://...">
            </td>
            <td>
              <label class="d-flex align-items-center gap-2" style="cursor:pointer;">
                <input type="checkbox" id="social-active-${link.id}" ${link.is_active ? 'checked' : ''}> Active
              </label>
            </td>
            <td>
              <button class="btn btn--primary btn--sm" onclick="AdminDashboard.saveSocialLink(${link.id}, '${link.platform}')">Save</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      UI.showToast('Failed to load social links: ' + err.message, 'error');
    }
  },

  async saveSocialLink(id, platform) {
    const urlEl = document.getElementById(`social-url-${id}`);
    const activeEl = document.getElementById(`social-active-${id}`);
    if (!urlEl || !activeEl) return;

    UI.showLoader();
    try {
      const url = urlEl.value.trim();
      const is_active = activeEl.checked ? 1 : 0;
      const res = await Api.put(`/cms/social-links/${id}`, { url, is_active });
      if (res.success) {
        UI.showToast(`Social link for ${platform} saved.`, 'success');
        await this.loadCmsSocialLinks();
      }
    } catch (err) {
      UI.showToast('Failed to save social link: ' + err.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Media Library Management
   */
  async loadCmsMedia() {
    try {
      const res = await Api.get('/cms/media');
      if (res.success && res.data) {
        const grid = document.getElementById('cms-media-grid');
        if (!grid) return;

        if (res.data.length === 0) {
          grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding:30px;">Media library is empty. Upload some assets.</div>';
          return;
        }

        grid.innerHTML = res.data.map(media => {
          const isImg = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'image/svg+xml'].includes(media.mime_type);
          const preview = isImg 
            ? `<img src="${media.file_path}" style="width:100%;height:100px;object-fit:cover;border-radius:var(--radius-md);" alt="${Utils.escapeHtml(media.original_name)}">`
            : `<div style="height:100px;display:flex;align-items:center;justify-content:center;background:var(--color-gray-100);font-size:2rem;border-radius:var(--radius-md);">📄</div>`;
          
          return `
            <div class="card p-2" style="display:flex;flex-direction:column;gap:5px;align-items:stretch;">
              ${preview}
              <div style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${Utils.escapeHtml(media.original_name)}">
                ${Utils.escapeHtml(media.original_name)}
              </div>
              <div style="font-size:10px;color:var(--text-muted);">
                ${Utils.formatBytes(media.file_size)}
              </div>
              <div style="display:flex;gap:5px;margin-top:auto;">
                <button class="btn btn--secondary btn--sm btn--block p-1" style="font-size:10px;" onclick="AdminDashboard.copyMediaUrl('${media.file_path}')">URL</button>
                <button class="btn btn--danger btn--sm btn--block p-1" style="font-size:10px;" onclick="AdminDashboard.deleteMediaItem(${media.id})">Del</button>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      UI.showToast('Failed to load media assets: ' + err.message, 'error');
    }
  },

  copyMediaUrl(path) {
    const fullUrl = window.location.origin + path;
    navigator.clipboard.writeText(fullUrl).then(() => {
      UI.showToast('Media URL copied to clipboard!', 'success');
    }).catch(err => {
      UI.showToast('Could not copy link.', 'error');
    });
  },

  async deleteMediaItem(id) {
    if (!confirm('Are you sure you want to delete this media asset permanently?')) return;
    UI.showLoader();
    try {
      const res = await Api.delete(`/cms/media/${id}`);
      if (res.success) {
        UI.showToast('Media deleted.', 'success');
        await this.loadCmsMedia();
      }
    } catch (err) {
      UI.showToast('Failed to delete media: ' + err.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * SEO & Open Graph Configurations
   */
  async loadCmsSeo() {
    try {
      const res = await Api.get('/cms/pages');
      if (res.success && res.data) {
        this.seoPages = res.data;
        const select = document.getElementById('cms-seo-page-select');
        if (select) {
          select.innerHTML = res.data.map(p => `
            <option value="${p.id}">${Utils.escapeHtml(p.title)} (/${p.slug})</option>
          `).join('');
          
          if (res.data.length > 0) {
            this.populateSeoFields(res.data[0].id);
          }
        }
      }
    } catch (err) {
      UI.showToast('Failed to load SEO pages catalog: ' + err.message, 'error');
    }
  },

  populateSeoFields(pageId) {
    const page = this.seoPages.find(p => p.id == pageId);
    if (!page) return;

    document.getElementById('seo-page-id').value = page.id;
    document.getElementById('seo-title').value = page.title || '';
    document.getElementById('seo-meta-title').value = page.meta_title || '';
    document.getElementById('seo-meta-keywords').value = page.meta_keywords || '';
    document.getElementById('seo-meta-desc').value = page.meta_description || '';
    document.getElementById('seo-og-title').value = page.og_title || '';
    document.getElementById('seo-og-image').value = page.og_image || '';
    document.getElementById('seo-og-desc').value = page.og_description || '';
  },

  /**
   * Load System Settings Group
   */
  async loadSettings() {
    try {
      const res = await Api.get('/cms/settings');
      if (res.success && res.data) {
        this.settings = res.data;
        res.data.forEach(s => {
          const el = document.getElementById(`setting-${s.setting_key}`);
          if (el) el.value = s.setting_value;
        });
      }
    } catch (error) {
      UI.showToast('Failed to load clinic settings.', 'error');
    }
  },

  // ============================================================
  // NESTED DETAILS MODALS LOADERS
  // ============================================================

  /**
   * View Doctor Schedules, Custom Slots, and Leaves in a Nested Tabbed Modal
   */
  async viewDoctorDetails(id) {
    this.activeDoctorId = id;
    UI.showLoader();

    try {
      const [schedRes, slotRes, leaveRes] = await Promise.all([
        Api.get(`/admin/doctors/${id}/schedule`),
        Api.get(`/admin/doctors/${id}/slots`),
        Api.get(`/admin/doctors/${id}/leaves`)
      ]);

      // 1. Render Weekly schedule table
      const schedDiv = document.getElementById('doc-schedule-render');
      if (schedRes.success && schedRes.data && schedRes.data.length > 0) {
        const rows = schedRes.data.map(s => `
          <tr>
            <td><strong>${s.day_of_week}</strong></td>
            <td>${UI.formatTime(s.start_time)} - ${UI.formatTime(s.end_time)}</td>
            <td>${s.break_start_time ? `${UI.formatTime(s.break_start_time)} - ${UI.formatTime(s.break_end_time)}` : 'No Break'}</td>
            <td><span class="badge ${s.is_active ? 'badge--success' : 'badge--gray'}">${s.is_active ? 'Working' : 'Off'}</span></td>
          </tr>
        `).join('');
        schedDiv.innerHTML = `
          <table class="table">
            <thead><tr><th>Day</th><th>Working Hours</th><th>Break Interval</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      } else {
        schedDiv.innerHTML = '<div class="empty-state">No weekly schedule configured for this doctor.</div>';
      }

      // 2. Render Custom Availability Slots
      const slotDiv = document.getElementById('doc-slots-render');
      if (slotRes.success && slotRes.data && slotRes.data.length > 0) {
        const rows = slotRes.data.map(s => `
          <tr>
            <td>${UI.formatDate(s.slot_date)}</td>
            <td>${UI.formatTime(s.start_time)} - ${UI.formatTime(s.end_time)}</td>
            <td><span class="badge ${s.is_available ? 'badge--success' : 'badge--warning'}">${s.is_available ? 'Available' : 'Unavailable'}</span></td>
          </tr>
        `).join('');
        slotDiv.innerHTML = `
          <table class="table">
            <thead><tr><th>Date</th><th>Slot Time</th><th>Availability</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      } else {
        slotDiv.innerHTML = '<div class="empty-state">No custom slots added.</div>';
      }

      // 3. Render Leaves Log
      const leaveDiv = document.getElementById('doc-leaves-render');
      if (leaveRes.success && leaveRes.data && leaveRes.data.length > 0) {
        const rows = leaveRes.data.map(l => `
          <tr>
            <td>${UI.formatDate(l.start_date)} to ${UI.formatDate(l.end_date)}</td>
            <td>${Utils.escapeHtml(l.reason || '—')}</td>
            <td><span class="badge badge--danger">Absence Set</span></td>
          </tr>
        `).join('');
        leaveDiv.innerHTML = `
          <table class="table">
            <thead><tr><th>Date Range</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      } else {
        leaveDiv.innerHTML = '<div class="empty-state">No leave absence records found.</div>';
      }

      // Reset nested tab routing back to weekly schedule
      this.switchSubTab('doc-sched-view');
      UI.openModal('doctor-details-modal');
    } catch (error) {
      UI.showToast('Failed to load doctor schedule records: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * View Patient Full history in a nested tabbed modal
   */
  async viewPatientDetails(id) {
    this.activePatientId = id;
    UI.showLoader();

    try {
      const [profileRes, historyRes, apptRes, consultRes, reportRes, testRes] = await Promise.all([
        Api.get(`/admin/patients/${id}`),
        Api.get(`/history/patient/${id}`),
        Api.get(`/appointments?patient_id=${id}`),
        Api.get(`/consultations?patient_id=${id}`),
        Api.get(`/reports?patient_id=${id}`),
        Api.get(`/lab-bookings?patient_id=${id}`)
      ]);

      // 1. Render Patient Profile Card
      const profDiv = document.getElementById('pat-profile-render');
      if (profileRes.success && profileRes.data) {
        const p = profileRes.data;
        profDiv.innerHTML = `
          <div class="detail-grid">
            <div class="detail-group">
              <div class="detail-label">Full Name</div>
              <div class="detail-value"><strong>${Utils.escapeHtml(p.full_name)}</strong></div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Account Contact</div>
              <div class="detail-value">${Utils.escapeHtml(p.email)} | ${Utils.escapeHtml(p.phone || '—')}</div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Gender / DOB</div>
              <div class="detail-value">${Utils.escapeHtml(p.gender || '—')} | ${p.date_of_birth ? UI.formatDate(p.date_of_birth) : '—'}</div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Blood Group / Insurance ID</div>
              <div class="detail-value"><span class="badge badge--info">${Utils.escapeHtml(p.blood_group || '—')}</span> | ${Utils.escapeHtml(p.insurance_id || '—')}</div>
            </div>
            <div class="detail-group detail-group--full">
              <div class="detail-label">Home Address</div>
              <div class="detail-value">${Utils.escapeHtml(p.address || '—')}</div>
            </div>
            <div class="detail-group detail-group--full">
              <div class="detail-label">Emergency Contact</div>
              <div class="detail-value">${Utils.escapeHtml(p.emergency_contact || '—')}</div>
            </div>
            <div class="detail-group detail-group--full">
              <div class="detail-label">Known Allergies</div>
              <div class="detail-value text--danger"><strong>${Utils.escapeHtml(p.allergies || 'None recorded')}</strong></div>
            </div>
          </div>
        `;
      }

      // 2. Render Medical History Logs
      const histDiv = document.getElementById('pat-history-render');
      if (historyRes.success && historyRes.data && historyRes.data.length > 0) {
        const rows = historyRes.data.map(h => `
          <div class="activity-item">
            <div class="activity-item__dot activity-item__dot--primary"></div>
            <div class="activity-item__content">
              <div class="activity-item__text">
                <strong>${Utils.escapeHtml(h.title)}</strong> - ${Utils.escapeHtml(h.description)}
              </div>
              <div class="activity-item__time">${UI.formatDate(h.event_date)}</div>
            </div>
          </div>
        `).join('');
        histDiv.innerHTML = `<div class="activity-list">${rows}</div>`;
      } else {
        histDiv.innerHTML = '<div class="empty-state">No clinical timeline logs.</div>';
      }

      // 3. Render Appointments List
      const apptDiv = document.getElementById('pat-appts-render');
      if (apptRes.success && apptRes.data && apptRes.data.length > 0) {
        const rows = apptRes.data.map(a => `
          <tr>
            <td>Dr. ${Utils.escapeHtml(a.doctor_name)}</td>
            <td>${UI.formatDate(a.appointment_date)} at ${UI.formatTime(a.appointment_time)}</td>
            <td>${UI.statusBadge(a.status)}</td>
          </tr>
        `).join('');
        apptDiv.innerHTML = `
          <table class="table">
            <thead><tr><th>Doctor</th><th>Schedule Time</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      } else {
        apptDiv.innerHTML = '<div class="empty-state">No appointments booking files.</div>';
      }

      // 4. Render Consultations List
      const consDiv = document.getElementById('pat-consults-render');
      if (consultRes.success && consultRes.data && consultRes.data.length > 0) {
        const rows = consultRes.data.map(c => `
          <tr>
            <td>Dr. ${Utils.escapeHtml(c.doctor_name)}</td>
            <td><strong>${Utils.escapeHtml(c.diagnosis)}</strong></td>
            <td>${Utils.escapeHtml(c.prescription || '—')}</td>
            <td>${UI.formatDate(c.created_at)}</td>
          </tr>
        `).join('');
        consDiv.innerHTML = `
          <table class="table">
            <thead><tr><th>Doctor</th><th>Diagnosis</th><th>Prescription</th><th>Date</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      } else {
        consDiv.innerHTML = '<div class="empty-state">No consultation medical records.</div>';
      }

      // 5. Render Uploaded medical documents
      const repDiv = document.getElementById('pat-reports-render');
      if (reportRes.success && reportRes.data && reportRes.data.length > 0) {
        const rows = reportRes.data.map(r => `
          <tr>
            <td>${Utils.escapeHtml(r.title)}</td>
            <td><span class="badge badge--info">${r.report_type}</span></td>
            <td>${UI.formatDate(r.created_at)}</td>
            <td><a href="${r.file_url}" target="_blank" class="btn btn--secondary btn--xs">📂 Open</a></td>
          </tr>
        `).join('');
        repDiv.innerHTML = `
          <table class="table">
            <thead><tr><th>Report Title</th><th>Type</th><th>Upload Date</th><th>File</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      } else {
        repDiv.innerHTML = '<div class="empty-state">No medical documents loaded.</div>';
      }

      // 6. Render Lab Booking requests
      const testDiv = document.getElementById('pat-labtests-render');
      if (testRes.success && testRes.data && testRes.data.length > 0) {
        const rows = testRes.data.map(t => `
          <tr>
            <td>${Utils.escapeHtml(t.test_name)}</td>
            <td>${UI.formatDate(t.booking_date)}</td>
            <td>${UI.statusBadge(t.status)}</td>
            <td>${t.result_file_url ? `<a href="${t.result_file_url}" target="_blank" class="btn btn--ghost btn--xs">Result</a>` : '—'}</td>
          </tr>
        `).join('');
        testDiv.innerHTML = `
          <table class="table">
            <thead><tr><th>Lab Test</th><th>Scheduled Date</th><th>Status</th><th>Report</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      } else {
        testDiv.innerHTML = '<div class="empty-state">No lab test bookings registered.</div>';
      }

      // Reset nested tab routing back to Profile Details
      this.switchSubTab('pat-info-profile');
      UI.openModal('patient-details-modal');
    } catch (error) {
      UI.showToast('Failed to load patient record files: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  // ============================================================
  // FORM / MODAL MODES CONTROL & SUBMISSION HANDLERS
  // ============================================================

  /**
   * Preload active active users for composer recipient dropdown selector
   */
  async loadUsersList() {
    try {
      const res = await Api.get('/admin/users?limit=100');
      if (res.success && res.data) {
        const select = document.getElementById('notif-target-user');
        const optionsHtml = res.data.map(u => `
          <option value="${u.id}">${Utils.escapeHtml(u.full_name)} (${u.role.toUpperCase()} | ${u.email})</option>
        `).join('');
        select.innerHTML = '<option value="all">Broadcast to All Users</option>' + optionsHtml;
      }
    } catch (error) {
      console.warn('Failed to load users list: ' + error.message);
    }
  },

  openRegisterDoctorModal() {
    document.getElementById('register-doctor-form').reset();
    UI.openModal('register-doctor-modal');
  },

  async handleDoctorRegisterSubmit(e) {
    e.preventDefault();
    UI.showLoader();

    const data = {
      email: document.getElementById('doc-reg-email').value,
      password: document.getElementById('doc-reg-password').value,
      full_name: document.getElementById('doc-reg-name').value,
      phone: document.getElementById('doc-reg-phone').value,
      specialization: document.getElementById('doc-reg-spec').value,
      qualification: document.getElementById('doc-reg-qual').value,
      experience_years: document.getElementById('doc-reg-exp').value,
      license_number: document.getElementById('doc-reg-license').value,
      consultation_fee: document.getElementById('doc-reg-fee').value,
      department: document.getElementById('doc-reg-dept').value
    };

    try {
      const res = await Api.post('/admin/doctors', data);
      if (res.success) {
        UI.showToast('Doctor registered successfully.', 'success');
        UI.closeModal('register-doctor-modal');
        this.loadDoctors();
      }
    } catch (error) {
      UI.showToast('Registration failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async openEditDoctorModal(id) {
    UI.showLoader();
    try {
      const res = await Api.get(`/doctors/${id}`);
      if (res.success && res.data) {
        const d = res.data;
        document.getElementById('doc-edit-id').value = d.id;
        document.getElementById('doc-edit-name').value = d.full_name;
        document.getElementById('doc-edit-phone').value = d.phone || '';
        document.getElementById('doc-edit-spec').value = d.specialization;
        document.getElementById('doc-edit-qual').value = d.qualification;
        document.getElementById('doc-edit-exp').value = d.experience_years;
        document.getElementById('doc-edit-license').value = d.license_number || '';
        document.getElementById('doc-edit-fee').value = d.consultation_fee;
        document.getElementById('doc-edit-dept').value = d.department || '';
        document.getElementById('doc-edit-avail').value = d.is_available ? '1' : '0';

        UI.openModal('edit-doctor-modal');
      }
    } catch (error) {
      UI.showToast('Failed to load doctor details: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleDoctorEditSubmit(e) {
    e.preventDefault();
    UI.showLoader();

    const id = document.getElementById('doc-edit-id').value;
    const data = {
      full_name: document.getElementById('doc-edit-name').value,
      phone: document.getElementById('doc-edit-phone').value,
      specialization: document.getElementById('doc-edit-spec').value,
      qualification: document.getElementById('doc-edit-qual').value,
      experience_years: document.getElementById('doc-edit-exp').value,
      license_number: document.getElementById('doc-edit-license').value,
      consultation_fee: document.getElementById('doc-edit-fee').value,
      department: document.getElementById('doc-edit-dept').value,
      is_available: document.getElementById('doc-edit-avail').value === '1'
    };

    try {
      const res = await Api.put(`/admin/doctors/${id}`, data);
      if (res.success) {
        UI.showToast('Doctor details updated.', 'success');
        UI.closeModal('edit-doctor-modal');
        this.loadDoctors();
      }
    } catch (error) {
      UI.showToast('Update failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleDeleteDoctor(id) {
    if (!confirm('Are you sure you want to delete this doctor? This action is permanent and cascades all files.')) return;
    UI.showLoader();
    try {
      const res = await Api.delete(`/admin/doctors/${id}`);
      if (res.success) {
        UI.showToast('Doctor profile deleted.', 'success');
        this.loadDoctors();
      }
    } catch (error) {
      UI.showToast('Failed to delete doctor: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async openEditPatientModal(id) {
    UI.showLoader();
    try {
      const res = await Api.get(`/admin/patients/${id}`);
      if (res.success && res.data) {
        const p = res.data;
        document.getElementById('pat-edit-id').value = p.id;
        document.getElementById('pat-edit-name').value = p.full_name;
        document.getElementById('pat-edit-phone').value = p.phone || '';
        document.getElementById('pat-edit-dob').value = p.date_of_birth ? p.date_of_birth.substring(0, 10) : '';
        document.getElementById('pat-edit-gender').value = p.gender || 'male';
        document.getElementById('pat-edit-blood').value = p.blood_group || '';
        document.getElementById('pat-edit-insurance').value = p.insurance_id || '';
        document.getElementById('pat-edit-address').value = p.address || '';
        document.getElementById('pat-edit-emergency').value = p.emergency_contact || '';
        document.getElementById('pat-edit-allergies').value = p.allergies || '';

        UI.openModal('edit-patient-modal');
      }
    } catch (error) {
      UI.showToast('Failed to load patient: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handlePatientEditSubmit(e) {
    e.preventDefault();
    UI.showLoader();

    const id = document.getElementById('pat-edit-id').value;
    const data = {
      full_name: document.getElementById('pat-edit-name').value,
      phone: document.getElementById('pat-edit-phone').value,
      date_of_birth: document.getElementById('pat-edit-dob').value || null,
      gender: document.getElementById('pat-edit-gender').value,
      blood_group: document.getElementById('pat-edit-blood').value || null,
      insurance_id: document.getElementById('pat-edit-insurance').value || null,
      address: document.getElementById('pat-edit-address').value || null,
      emergency_contact: document.getElementById('pat-edit-emergency').value || null,
      allergies: document.getElementById('pat-edit-allergies').value || null
    };

    try {
      const res = await Api.put(`/admin/patients/${id}`, data);
      if (res.success) {
        UI.showToast('Patient details updated.', 'success');
        UI.closeModal('edit-patient-modal');
        this.loadPatients();
      }
    } catch (error) {
      UI.showToast('Update failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleDeletePatient(id) {
    if (!confirm('Are you sure you want to delete this patient profile? This cascades all records.')) return;
    UI.showLoader();
    try {
      const res = await Api.delete(`/admin/patients/${id}`);
      if (res.success) {
        UI.showToast('Patient profile deleted.', 'success');
        this.loadPatients();
      }
    } catch (error) {
      UI.showToast('Failed to delete patient: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleBroadcastNotificationSubmit(e) {
    e.preventDefault();
    UI.showLoader();

    const data = {
      user_id: document.getElementById('notif-target-user').value,
      title: document.getElementById('notif-title').value,
      message: document.getElementById('notif-message').value,
      type: document.getElementById('notif-type').value,
      link: document.getElementById('notif-link').value || null,
      scheduled_for: document.getElementById('notif-scheduled-for').value || null
    };

    try {
      const res = await Api.post('/admin/notifications', data);
      if (res.success) {
        UI.showToast(res.message || 'Notification processed.', 'success');
        document.getElementById('broadcast-notification-form').reset();
        await this.loadNotificationsLogs();
        await this.loadOverviewStats();
      }
    } catch (error) {
      UI.showToast('Failed to broadcast: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleConfirmAppointment(id) {
    UI.showLoader();
    try {
      const res = await Api.patch(`/appointments/${id}/status`, { status: 'confirmed' });
      if (res.success) {
        UI.showToast('Appointment confirmed.', 'success');
        this.loadAppointments();
      }
    } catch (error) {
      UI.showToast('Action failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleCancelAppointment(id) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    UI.showLoader();
    try {
      const res = await Api.patch(`/appointments/${id}/status`, { status: 'cancelled' });
      if (res.success) {
        UI.showToast('Appointment cancelled.', 'success');
        this.loadAppointments();
      }
    } catch (error) {
      UI.showToast('Cancel failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleDeleteAppointment(id) {
    if (!confirm('Delete appointment from database?')) return;
    UI.showLoader();
    try {
      const res = await Api.delete(`/appointments/${id}`);
      if (res.success) {
        UI.showToast('Appointment deleted.', 'success');
        this.loadAppointments();
      }
    } catch (error) {
      UI.showToast('Delete failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  openRescheduleModal(id, date, time) {
    document.getElementById('reschedule-appt-id').value = id;
    document.getElementById('resched-date').value = date ? date.substring(0, 10) : '';
    document.getElementById('resched-time').value = time ? time.substring(0, 5) : '';
    UI.openModal('reschedule-modal');
  },

  async handleRescheduleSubmit(e) {
    e.preventDefault();
    UI.showLoader();

    const id = document.getElementById('reschedule-appt-id').value;
    const data = {
      appointment_date: document.getElementById('resched-date').value,
      appointment_time: document.getElementById('resched-time').value
    };

    try {
      const res = await Api.put(`/appointments/${id}`, data);
      if (res.success) {
        UI.showToast('Appointment rescheduled.', 'success');
        UI.closeModal('reschedule-modal');
        this.loadAppointments();
      }
    } catch (error) {
      UI.showToast('Reschedule failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  openAddLabTestModal() {
    document.getElementById('add-lab-test-form').reset();
    UI.openModal('add-lab-test-modal');
  },

  async handleLabTestAddSubmit(e) {
    e.preventDefault();
    UI.showLoader();

    const data = {
      test_name: document.getElementById('lab-add-name').value,
      category: document.getElementById('lab-add-category').value,
      price: document.getElementById('lab-add-price').value,
      description: document.getElementById('lab-add-desc').value,
      test_code: 'LAB-' + Math.floor(1000 + Math.random() * 9000)
    };

    try {
      const res = await Api.post('/lab-tests', data);
      if (res.success) {
        UI.showToast('Lab test added to catalog.', 'success');
        UI.closeModal('add-lab-test-modal');
        this.loadLabTestsCatalog();
      }
    } catch (error) {
      UI.showToast('Save failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  openEditLabTestModal(test) {
    document.getElementById('lab-edit-id').value = test.id;
    document.getElementById('lab-edit-name').value = test.test_name;
    document.getElementById('lab-edit-category').value = test.category;
    document.getElementById('lab-edit-price').value = test.price;
    document.getElementById('lab-edit-desc').value = test.description || '';
    document.getElementById('lab-edit-active').value = test.is_active ? '1' : '0';

    UI.openModal('edit-lab-test-modal');
  },

  async handleLabTestEditSubmit(e) {
    e.preventDefault();
    UI.showLoader();

    const id = document.getElementById('lab-edit-id').value;
    const data = {
      test_name: document.getElementById('lab-edit-name').value,
      category: document.getElementById('lab-edit-category').value,
      price: document.getElementById('lab-edit-price').value,
      description: document.getElementById('lab-edit-desc').value,
      is_active: document.getElementById('lab-edit-active').value === '1'
    };

    try {
      const res = await Api.put(`/lab-tests/${id}`, data);
      if (res.success) {
        UI.showToast('Lab test updated.', 'success');
        UI.closeModal('edit-lab-test-modal');
        this.loadLabTestsCatalog();
      }
    } catch (error) {
      UI.showToast('Update failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleDeactivateLabTest(id) {
    UI.showLoader();
    try {
      const res = await Api.delete(`/lab-tests/${id}`);
      if (res.success) {
        UI.showToast('Lab test state toggled.', 'success');
        this.loadLabTestsCatalog();
      }
    } catch (error) {
      UI.showToast('Failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleUpdateLabStatus(id, status) {
    UI.showLoader();
    try {
      const res = await Api.patch(`/lab-bookings/${id}/status`, { status });
      if (res.success) {
        UI.showToast('Lab booking status updated.', 'success');
        this.loadLabBookings();
      }
    } catch (error) {
      UI.showToast('Action failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  openLabResultModal(id) {
    document.getElementById('lab-result-booking-id').value = id;
    document.getElementById('lab-result-file').value = '';
    document.getElementById('lab-result-notes').value = '';
    UI.openModal('lab-result-modal');
  },

  async handleLabResultUploadSubmit(e) {
    e.preventDefault();
    UI.showLoader();

    const id = document.getElementById('lab-result-booking-id').value;
    const fileInput = document.getElementById('lab-result-file');
    const notes = document.getElementById('lab-result-notes').value;

    if (!fileInput.files || fileInput.files.length === 0) {
      UI.showToast('Please select a result document to upload.', 'warning');
      UI.hideLoader();
      return;
    }

    const formData = new FormData();
    formData.append('result_file', fileInput.files[0]);
    formData.append('notes', notes);

    try {
      // Hitting the upload endpoint (uses multipart/form-data)
      const token = Auth.getToken();
      const response = await fetch(`${CONFIG.API_BASE_URL}/lab-bookings/${id}/result`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `HTTP ${response.status}`);

      if (result.success) {
        UI.showToast('Lab test result uploaded and booking marked completed.', 'success');
        UI.closeModal('lab-result-modal');
        this.loadLabBookings();
      }
    } catch (error) {
      UI.showToast('Upload failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  openSampleCollectorModal(id) {
    document.getElementById('assign-col-req-id').value = id;
    document.getElementById('assign-col-name').value = '';
    UI.openModal('assign-collector-modal');
  },

  openAssignCollectorModal(id) {
    document.getElementById('assign-col-req-id').value = id;
    document.getElementById('assign-col-name').value = '';
    document.getElementById('assign-col-phone').value = '';
    document.getElementById('assign-col-date').value = '';
    document.getElementById('assign-col-time').value = '';
    document.getElementById('assign-col-notes').value = '';
    UI.openModal('assign-collector-modal');
  },

  async handleCollectorAssignSubmit(e) {
    e.preventDefault();
    UI.showLoader();

    const id = document.getElementById('assign-col-req-id').value;
    const name = document.getElementById('assign-col-name').value;
    const phone = document.getElementById('assign-col-phone').value;
    const date = document.getElementById('assign-col-date').value;
    const time = document.getElementById('assign-col-time').value;
    const notes = document.getElementById('assign-col-notes').value;

    try {
      const res = await Api.put(`/sample-collections/${id}/assign`, {
        collector_name: name,
        collector_phone: phone,
        collection_date: date,
        collection_time: time,
        notes: notes
      });
      if (res.success) {
        UI.showToast('Collector staff assigned and sample scheduled.', 'success');
        UI.closeModal('assign-collector-modal');
        this.loadSamples();
      }
    } catch (error) {
      UI.showToast('Assignment failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleUpdateSampleStatus(id, status) {
    UI.showLoader();
    try {
      const res = await Api.put(`/sample-collections/${id}/status`, { status });
      if (res.success) {
        UI.showToast('Request status advanced.', 'success');
        this.loadSamples();
      }
    } catch (error) {
      UI.showToast('Action failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleDeleteReport(id) {
    if (!confirm('Are you sure you want to delete this medical report file?')) return;
    UI.showLoader();
    try {
      const res = await Api.delete(`/reports/${id}`);
      if (res.success) {
        UI.showToast('Report deleted.', 'success');
        this.loadReports();
      }
    } catch (error) {
      UI.showToast('Delete failed: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleCmsHomeSaveSubmit(e) {
    e.preventDefault();
    UI.showLoader();

    const key = document.getElementById('cms-home-section-select').value;
    const section = this.cmsSections.find(s => s.section_key === key);
    if (!section) {
      UI.showToast('Active section definition not found.', 'error');
      UI.hideLoader();
      return;
    }

    const payload = {};
    const data = section.section_data || {};

    try {
      for (const k of Object.keys(data)) {
        const el = document.getElementById(`cms-home-field-${k}`);
        if (el) {
          const val = el.value.trim();
          if (typeof data[k] === 'string') {
            payload[k] = val;
          } else {
            payload[k] = JSON.parse(val);
          }
        }
      }

      const res = await Api.put(`/cms/sections/${key}`, { section_data: payload });
      if (res.success) {
        UI.showToast(`Homepage section '${key}' saved.`, 'success');
        const index = this.cmsSections.findIndex(s => s.section_key === key);
        if (index !== -1 && res.data) {
          this.cmsSections[index] = res.data;
        }
      }
    } catch (error) {
      UI.showToast('Failed to save homepage section: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleAboutFormSubmit(e) {
    e.preventDefault();
    UI.showLoader();
    try {
      const payload = {
        title: document.getElementById('about-title-input').value.trim(),
        subtitle: document.getElementById('about-subtitle-input').value.trim(),
        description: document.getElementById('about-desc-input').value.trim(),
        description_secondary: document.getElementById('about-desc-sec-input').value.trim(),
        mission_title: document.getElementById('about-mission-title-input').value.trim(),
        mission_desc: document.getElementById('about-mission-desc-input').value.trim(),
        vision_title: document.getElementById('about-vision-title-input').value.trim(),
        vision_desc: document.getElementById('about-vision-desc-input').value.trim(),
        values: this.aboutValuesCache || [
          { icon: '🏥', title: 'Patient First', description: 'Every feature is designed with the patient experience at the center.' },
          { icon: '🔒', title: 'Security', description: 'Your medical data is encrypted and protected with industry-standard security.' },
          { icon: '⚡', title: 'Innovation', description: 'We leverage the latest technology to continuously improve healthcare delivery.' },
          { icon: '🤝', title: 'Accessibility', description: 'Healthcare management that\'s available to everyone, everywhere, anytime.' }
        ]
      };
      const res = await Api.put('/cms/sections/about', { section_data: payload });
      if (res.success) {
        UI.showToast('About page content saved.', 'success');
      }
    } catch (err) {
      UI.showToast('Failed to save About content: ' + err.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleContactFormSubmit(e) {
    e.preventDefault();
    UI.showLoader();
    try {
      const payload = {
        title: document.getElementById('contact-title-input').value.trim(),
        subtitle: document.getElementById('contact-subtitle-input').value.trim(),
        address_title: document.getElementById('contact-address-title-input').value.trim(),
        address_value: document.getElementById('contact-address-value-input').value.trim(),
        phone_title: document.getElementById('contact-phone-title-input').value.trim(),
        phone_value: document.getElementById('contact-phone-value-input').value.trim(),
        email_title: document.getElementById('contact-email-title-input').value.trim(),
        email_value: document.getElementById('contact-email-value-input').value.trim(),
        hours_title: document.getElementById('contact-hours-title-input').value.trim(),
        hours_value: document.getElementById('contact-hours-value-input').value.trim(),
        emergency_title: document.getElementById('contact-emergency-title-input').value.trim(),
        emergency_value: document.getElementById('contact-emergency-value-input').value.trim()
      };
      const res = await Api.put('/cms/sections/contact', { section_data: payload });
      if (res.success) {
        UI.showToast('Contact page content saved.', 'success');
      }
    } catch (err) {
      UI.showToast('Failed to save Contact content: ' + err.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleFaqFormSubmit(e) {
    e.preventDefault();
    UI.showLoader();
    try {
      const id = document.getElementById('faq-id').value;
      const question = document.getElementById('faq-question-input').value.trim();
      const answer = document.getElementById('faq-answer-input').value.trim();
      const display_order = parseInt(document.getElementById('faq-order-input').value, 10) || 0;
      const is_active = parseInt(document.getElementById('faq-active-input').value, 10);
      
      const payload = { question, answer, display_order, is_active };
      let res;
      
      if (id) {
        res = await Api.put(`/cms/faqs/${id}`, payload);
      } else {
        res = await Api.post('/cms/faqs', payload);
      }
      
      if (res.success) {
        UI.showToast(id ? 'FAQ updated successfully.' : 'New FAQ added.', 'success');
        this.resetFaqForm();
        await this.loadCmsFaqs();
      }
    } catch (err) {
      UI.showToast('Failed to save FAQ: ' + err.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleMediaUploadSubmit(e) {
    e.preventDefault();
    const fileInput = document.getElementById('cms-media-file');
    if (!fileInput || !fileInput.files[0]) {
      UI.showToast('Please select a file to upload.', 'warning');
      return;
    }

    UI.showLoader();
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
      const res = await Api.upload('/cms/media', formData);
      if (res.success) {
        UI.showToast('File uploaded successfully.', 'success');
        fileInput.value = '';
        await this.loadCmsMedia();
      }
    } catch (err) {
      UI.showToast('Media upload failed: ' + err.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleSeoFormSubmit(e) {
    e.preventDefault();
    UI.showLoader();
    try {
      const id = document.getElementById('seo-page-id').value;
      const payload = {
        meta_title: document.getElementById('seo-meta-title').value.trim(),
        meta_keywords: document.getElementById('seo-meta-keywords').value.trim(),
        meta_description: document.getElementById('seo-meta-desc').value.trim(),
        og_title: document.getElementById('seo-og-title').value.trim(),
        og_image: document.getElementById('seo-og-image').value.trim(),
        og_description: document.getElementById('seo-og-desc').value.trim()
      };
      
      const res = await Api.put(`/cms/page/${id}`, payload);
      if (res.success) {
        UI.showToast('SEO settings saved successfully.', 'success');
        await this.loadCmsSeo();
      }
    } catch (err) {
      UI.showToast('Failed to save SEO config: ' + err.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async handleSettingsSaveSubmit(e) {
    e.preventDefault();
    UI.showLoader();

    try {
      const payload = {
        clinic_name: document.getElementById('setting-clinic_name').value.trim(),
        contact_email: document.getElementById('setting-contact_email').value.trim(),
        contact_phone: document.getElementById('setting-contact_phone').value.trim(),
        clinic_address: document.getElementById('setting-clinic_address').value.trim(),
        working_hours: document.getElementById('setting-working_hours').value.trim(),
        allow_registrations: document.getElementById('setting-allow_registrations').value.trim(),
        logo_path: document.getElementById('setting-logo_path').value.trim(),
        favicon_path: document.getElementById('setting-favicon_path').value.trim(),
        clinic_description: document.getElementById('setting-clinic_description').value.trim(),
      };
      
      const res = await Api.put('/cms/settings', payload);
      if (res.success) {
        UI.showToast('Clinic details and configuration saved.', 'success');
      }
    } catch (error) {
      UI.showToast('Failed to save configurations: ' + error.message, 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async loadUsersList() {
    try {
      const res = await Api.get('/admin/users?limit=100');
      if (res.success && res.data) {
        this.users = res.data;
        const select = document.getElementById('notif-target-user');
        if (select) {
          let optionsHtml = `
            <option value="all">Broadcast to All Users</option>
            <option value="all_patients">Broadcast to All Patients</option>
            <option value="all_doctors">Broadcast to All Doctors</option>
          `;
          res.data.forEach(user => {
            optionsHtml += `
              <option value="${user.id}">${Utils.escapeHtml(user.full_name)} (${user.role} - ${Utils.escapeHtml(user.email)})</option>
            `;
          });
          select.innerHTML = optionsHtml;
        }
      }
    } catch (error) {
      console.error('Failed to load users list:', error);
    }
  }
};
