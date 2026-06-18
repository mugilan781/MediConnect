// ============================================================
// MediConnect – public/js/history.js
// Patient medical history timeline UI with Search and Filters
// ============================================================

const History = {
  currentPage: 1,
  selectedModule: '',
  searchQuery: '',
  patientId: null,

  async init() {
    // Support both real users and demo users
    const user = Auth.getUser();
    if (!user) return;

    // Build the dynamic Search and Filter controls first inside #history-timeline card body
    const container = document.getElementById('history-timeline');
    if (!container) return;

    container.innerHTML = `
      <div class="history-controls fade-in">
        <!-- Search bar -->
        <div class="search-bar mb-3" style="display: flex; gap: 8px;">
          <input type="text" id="history-search-input" class="form-input" placeholder="Search by doctor, event type, test name, report title..." style="flex: 1;">
          <button class="btn btn--primary" id="history-search-btn">Search</button>
        </div>

        <!-- Filter bar -->
        <div class="filter-bar mb-4" style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn--sm btn--primary filter-btn" data-module="" style="border-radius: 20px;">All Activities</button>
          <button class="btn btn--sm btn--secondary filter-btn" data-module="appointments" style="border-radius: 20px;">${typeof MediIcons !== 'undefined' ? MediIcons.icon('calendar') : ''} Appointments</button>
          <button class="btn btn--sm btn--secondary filter-btn" data-module="consultations" style="border-radius: 20px;">${typeof MediIcons !== 'undefined' ? MediIcons.icon('stethoscope') : ''} Consultations</button>
          <button class="btn btn--sm btn--secondary filter-btn" data-module="lab_bookings" style="border-radius: 20px;">${typeof MediIcons !== 'undefined' ? MediIcons.icon('microscope') : ''} Lab Tests</button>
          <button class="btn btn--sm btn--secondary filter-btn" data-module="sample_collections" style="border-radius: 20px;">${typeof MediIcons !== 'undefined' ? MediIcons.icon('home') : ''} Collections</button>
          <button class="btn btn--sm btn--secondary filter-btn" data-module="reports" style="border-radius: 20px;">${typeof MediIcons !== 'undefined' ? MediIcons.icon('file') : ''} Reports</button>
        </div>

        <!-- Timeline container -->
        <div id="timeline-list-container">
          <div class="empty-state"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    // Bind event listeners
    document.getElementById('history-search-btn').addEventListener('click', () => {
      this.searchQuery = document.getElementById('history-search-input').value.trim();
      this.currentPage = 1;
      this.loadHistory();
    });

    document.getElementById('history-search-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchQuery = e.target.value.trim();
        this.currentPage = 1;
        this.loadHistory();
      }
    });

    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('btn--primary');
          b.classList.add('btn--secondary');
        });
        btn.classList.remove('btn--secondary');
        btn.classList.add('btn--primary');

        this.selectedModule = btn.dataset.module;
        this.currentPage = 1;
        this.loadHistory();
      });
    });

    // Resolve patientId — works for real patient, demo patient, and admin/doctor views
    if (user.role === 'patient') {
      try {
        const response = await Api.get('/auth/me');
        if (response.success && response.data) {
          // Support both response.data.profile.id and response.data.profile_id
          const profile = response.data.profile || response.data;
          if (profile && profile.id) {
            this.patientId = profile.id;
          }
        }
      } catch (error) {
        console.warn('Could not load patient profile for history:', error);
      }
    }

    // Load history — use /history (getAll) if we don't have a patientId,
    // or /history/patient/:id if we do
    await this.loadHistory();
  },

  async loadHistory() {
    const listContainer = document.getElementById('timeline-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    try {
      let url;
      if (this.patientId) {
        url = `/history/patient/${this.patientId}?page=${this.currentPage}&limit=10`;
      } else {
        // Fallback: use /history (getAll) which auto-resolves patient from req.user
        url = `/history?page=${this.currentPage}&limit=10`;
      }
      if (this.selectedModule) url += `&source_module=${this.selectedModule}`;
      if (this.searchQuery) url += `&search=${encodeURIComponent(this.searchQuery)}`;

      const response = await Api.get(url);
      if (!response || !response.success) {
        this._showEmptyState(listContainer);
        return;
      }

      // Normalize response data — support multiple response shapes
      const records = this._extractRecords(response);

      if (!records || records.length === 0) {
        this._showEmptyState(listContainer);
        return;
      }

      const eventIcons = {
        appointments: 'calendar',
        consultations: 'stethoscope',
        lab_bookings: 'microscope',
        sample_collections: 'home',
        reports: 'file'
      };

      const eventColors = {
        appointments: '#e0f2fe',
        consultations: '#E5F1E6',
        lab_bookings: '#faf5ff',
        sample_collections: '#fff7ed',
        reports: '#f1f5f9'
      };

      const listHtml = records.map(entry => {
        if (!entry) return '';
        const icon = eventIcons[entry.source_module] || 'clipboard';
        const color = eventColors[entry.source_module] || '#f3f4f6';
        const dateStr = UI.formatDate(entry.event_date);
        const timeStr = entry.event_date ? new Date(entry.event_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
        const sourceLabel = (entry.source_module || 'event').replace(/_/g, ' ');
        const meta = entry.metadata || {};

        return `
          <li class="activity-item" style="cursor: pointer; padding: 16px; border-radius: 8px; margin-bottom: 12px; background: #fff; border: 1px solid var(--border-color); transition: all 0.2s;" onclick="History.showDetails(${entry.id})">
            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <span class="activity-item__icon" style="background: ${color}; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 1.2rem;">
                ${typeof MediIcons !== 'undefined' ? MediIcons.icon(icon) : ''}
              </span>
              <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap;">
                  <strong style="color: var(--text-color); font-size: 14px;">${entry.title || 'Untitled Event'}</strong>
                  <span style="font-size: 11px; color: var(--text-muted);">${dateStr}${timeStr ? ' at ' + timeStr : ''}</span>
                </div>
                ${entry.description ? `<p style="font-size: 13px; color: var(--text-muted); margin-top: 4px; line-height: 1.4;">${entry.description}</p>` : ''}
                <div style="margin-top: 6px; display: flex; gap: 8px; align-items: center;">
                  <span class="badge badge--sm badge--gray" style="text-transform: capitalize;">${sourceLabel}</span>
                  ${meta.doctor_name ? `<span style="font-size: 11px; color: var(--color-primary); font-weight: 500;">Dr. ${meta.doctor_name}</span>` : ''}
                </div>
              </div>
            </div>
          </li>
        `;
      }).join('');

      // Extract pagination from response
      const pagination = response.pagination || null;

      listContainer.innerHTML = `
        <ul class="activity-list" style="padding: 0; list-style: none; margin-top: 10px;">
          ${listHtml}
        </ul>
        ${pagination ? UI.renderPagination(pagination, 'History.goToPage') : ''}
      `;
    } catch (error) {
      console.error('History load error:', error);
      // Show empty state instead of error toast for graceful degradation
      this._showEmptyState(listContainer);
    }
  },

  /**
   * Extract records array from various response shapes.
   * Supports: response.data (array), response.data.data, response.data.records,
   * response.data.history, response.items
   */
  _extractRecords(response) {
    if (!response) return [];

    const d = response.data;

    // Most common: response.data is directly an array
    if (Array.isArray(d)) return d;

    // Nested: response.data.data
    if (d && Array.isArray(d.data)) return d.data;

    // Alternative shapes
    if (d && Array.isArray(d.records)) return d.records;
    if (d && Array.isArray(d.history)) return d.history;

    // Top-level items
    if (Array.isArray(response.items)) return response.items;

    // If d is an object but not an array, it might be a single record
    if (d && typeof d === 'object' && d.id) return [d];

    return [];
  },

  /**
   * Show empty state UI instead of error toast
   */
  _showEmptyState(container) {
    if (!container) return;
    container.innerHTML = UI.emptyState(
      'clipboard',
      'No History Records Available',
      'Your medical history timeline will appear here as you use MediConnect services.'
    );
  },

  async showDetails(entryId) {
    UI.showLoader();
    try {
      const response = await Api.get(`/history/${entryId}`);
      if (response.success && response.data) {
        const entry = response.data;
        const meta = entry.metadata || {};
        const dateStr = UI.formatDate(entry.event_date);
        const timeStr = entry.event_date ? new Date(entry.event_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
        const sourceLabel = (entry.source_module || 'event').replace(/_/g, ' ');

        let detailedHtml = `
          <div style="margin-bottom: 20px;">
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
              ${sourceLabel} Event
            </div>
            <h3 style="font-size: 18px; margin: 0 0 8px 0; color: var(--text-color);">${entry.title || 'Untitled Event'}</h3>
            <div style="font-size: 13px; color: var(--text-muted);">${dateStr}${timeStr ? ' at ' + timeStr : ''}</div>
          </div>
          <div style="padding: 16px; background: var(--bg-hover); border-radius: 8px; margin-bottom: 20px;">
            <div style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">Event Description</div>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.5;">${entry.description || 'No description recorded.'}</p>
          </div>
          <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
            <h4 style="font-size: 14px; margin: 0 0 12px 0;">Related Record Data</h4>
            <div class="detail-grid" style="display: grid; grid-template-columns: 1fr; gap: 12px;">
        `;

        if (entry.source_module === 'appointments') {
          detailedHtml += `
            <div class="detail-group"><div class="detail-label">Consulting Doctor</div><div class="detail-value">Dr. ${meta.doctor_name || 'System'}</div></div>
            <div class="detail-group"><div class="detail-label">Appointment Date</div><div class="detail-value">${meta.appointment_date ? UI.formatDate(meta.appointment_date) + (meta.appointment_time ? ' at ' + meta.appointment_time : '') : 'N/A'}</div></div>
            <div class="detail-group"><div class="detail-label">Consultation Type</div><div class="detail-value" style="text-transform: capitalize;">${meta.type || 'In-Person'}</div></div>
            <div class="detail-group"><div class="detail-label">Reason for Visit</div><div class="detail-value">${meta.reason || 'None stated'}</div></div>
            <div class="detail-group"><div class="detail-label">Status</div><div class="detail-value">${UI.statusBadge(meta.status || 'completed')}</div></div>
          `;
        } else if (entry.source_module === 'consultations') {
          detailedHtml += `
            <div class="detail-group"><div class="detail-label">Consulting Doctor</div><div class="detail-value">Dr. ${meta.doctor_name || 'System'}</div></div>
            <div class="detail-group"><div class="detail-label">Scheduled Date</div><div class="detail-value">${meta.consultation_date ? UI.formatDate(meta.consultation_date) + (meta.consultation_time ? ' at ' + meta.consultation_time : '') : 'Not Scheduled'}</div></div>
            <div class="detail-group"><div class="detail-label">Clinical Diagnosis</div><div class="detail-value" style="background:#fffbeb; padding:8px; border-radius:4px; border-left:3px solid #f59e0b; font-weight:500;">${meta.diagnosis || 'Diagnosis pending'}</div></div>
            <div class="detail-group"><div class="detail-label">Prescribed Medication</div><div class="detail-value" style="background:#E5F1E6; padding:8px; border-radius:4px; border-left:3px solid #6F9E75;">${meta.prescription || 'No prescription written'}</div></div>
            ${meta.follow_up_date ? `<div class="detail-group"><div class="detail-label">Follow-up Date</div><div class="detail-value">${UI.formatDate(meta.follow_up_date)}</div></div>` : ''}
          `;
        } else if (entry.source_module === 'lab_bookings') {
          detailedHtml += `
            <div class="detail-group"><div class="detail-label">Lab Test Name</div><div class="detail-value">${meta.test_name || 'N/A'}</div></div>
            <div class="detail-group"><div class="detail-label">Test Code</div><div class="detail-value"><code>${meta.test_code || 'N/A'}</code></div></div>
            <div class="detail-group"><div class="detail-label">Category</div><div class="detail-value">${meta.category || 'General'}</div></div>
            <div class="detail-group"><div class="detail-label">Booking Date</div><div class="detail-value">${meta.booking_date ? UI.formatDate(meta.booking_date) + (meta.preferred_time ? ' at ' + UI.formatTime(meta.preferred_time) : '') : 'N/A'}</div></div>
            <div class="detail-group"><div class="detail-label">Booking Status</div><div class="detail-value">${UI.statusBadge(meta.status || 'pending')}</div></div>
          `;
        } else if (entry.source_module === 'sample_collections') {
          detailedHtml += `
            <div class="detail-group"><div class="detail-label">Lab Test Reference</div><div class="detail-value">${meta.test_name || 'N/A'}</div></div>
            <div class="detail-group"><div class="detail-label">Collection Location</div><div class="detail-value">${meta.collection_address || 'N/A'}</div></div>
            <div class="detail-group"><div class="detail-label">Collector Assigned</div><div class="detail-value">${meta.collector_name || 'Not assigned'}</div></div>
            ${meta.collector_phone ? `<div class="detail-group"><div class="detail-label">Collector Phone</div><div class="detail-value">${meta.collector_phone}</div></div>` : ''}
            <div class="detail-group"><div class="detail-label">Current Status</div><div class="detail-value">${UI.statusBadge(meta.status || 'requested')}</div></div>
          `;
        } else if (entry.source_module === 'reports') {
          detailedHtml += `
            <div class="detail-group"><div class="detail-label">Report Title</div><div class="detail-value">${meta.title || 'N/A'}</div></div>
            <div class="detail-group"><div class="detail-label">Report Category</div><div class="detail-value"><span class="badge badge--info">${meta.category || 'General'}</span></div></div>
            <div class="detail-group"><div class="detail-label">File Name</div><div class="detail-value">${meta.original_filename || 'medical-report'}</div></div>
            <div class="detail-group"><div class="detail-label">Shared By</div><div class="detail-value">Dr. ${meta.doctor_name || 'System'}</div></div>
            <div class="detail-group mt-3" style="display: flex; gap: 8px;">
              <a href="/reports.html" class="btn btn--primary btn--sm" style="flex: 1; text-align: center;">Go to Reports Module</a>
            </div>
          `;
        } else {
          // Generic fallback for unknown source modules
          detailedHtml += `
            <div class="detail-group"><div class="detail-label">Event Type</div><div class="detail-value" style="text-transform: capitalize;">${entry.event_type || sourceLabel}</div></div>
          `;
        }

        detailedHtml += `
            </div>
          </div>
        `;

        this.getOrCreateDetailsModal();
        document.getElementById('history-details-body').innerHTML = detailedHtml;
        UI.openModal('history-details-modal');
      }
    } catch (error) {
      console.error(error);
      UI.showToast('Failed to load entry details.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  getOrCreateDetailsModal() {
    let modal = document.getElementById('history-details-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'history-details-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal" style="max-width: 500px; width: 90%;">
          <div class="modal__header">
            <h3>Medical Journey Entry Details</h3>
            <button class="btn btn--ghost btn--icon" onclick="UI.closeModal('history-details-modal')">${typeof MediIcons !== 'undefined' ? MediIcons.icon('x') : '✕'}</button>
          </div>
          <div class="modal__body" id="history-details-body">
            <!-- Dynamically populated -->
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          UI.closeModal('history-details-modal');
        }
      });
    }
    return modal;
  },

  goToPage(page) {
    this.currentPage = page;
    this.loadHistory();
  },
};
