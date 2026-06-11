// ============================================================
// MediConnect – public/js/dashboard.js
// Dashboard stats loader (role-aware)
// ============================================================

const Dashboard = {
  /**
   * Initialize the patient dashboard
   */
  async initPatient() {
    try {
      UI.showLoader();
      const response = await Api.get('/dashboard/patient');
      if (!response.success) return;

      const { 
        patient, 
        summary, 
        upcomingAppointments, 
        unreadNotifications, 
        recentReports, 
        recentLabBookings, 
        recentNotifications,
        recentHistory,
        consultationStats,
        upcomingConsultations,
        consultationHistory,
        upcomingCollections
      } = response.data;

      // Welcome banner
      const greetingEl = document.getElementById('welcome-name');
      if (greetingEl) greetingEl.textContent = patient.full_name;

      // Stats
      this.updateStat('stat-appointments', summary.appointments?.total || 0);
      this.updateStat('stat-upcoming', summary.appointments?.upcoming || 0);
      this.updateStat('stat-lab-tests', summary.labBookings?.total || 0);
      this.updateStat('stat-reports', summary.reports?.total || 0);
      this.updateStat('stat-consultations', consultationStats?.active || 0);
      this.updateStat('stat-collections', summary.sampleCollections?.active || 0);

      // Upcoming appointments list
      this.renderUpcomingAppointments(upcomingAppointments, 'upcoming-appointments-list');

      // Upcoming consultations
      this.renderUpcomingConsultations(upcomingConsultations, 'upcoming-consultations-list');

      // Consultation history
      this.renderConsultationHistory(consultationHistory, 'consultation-history-list');

      // Recent Reports
      this.renderRecentReports(recentReports);

      // Recent Lab Bookings
      this.renderRecentLabBookings(recentLabBookings);

      // Upcoming collections list
      this.renderUpcomingCollections(upcomingCollections, 'upcoming-collections-list');

      // Recent History Journey
      this.renderRecentHistory(recentHistory, 'recent-history-timeline-list');

      // Recent Notifications
      this.renderRecentNotifications(recentNotifications);

    } catch (error) {
      UI.showToast('Failed to load dashboard data.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Initialize the doctor dashboard
   */
  async initDoctor() {
    try {
      UI.showLoader();
      const response = await Api.get('/dashboard/doctor');
      if (!response.success) return;

      const { doctor, summary, upcomingAppointments } = response.data;

      const greetingEl = document.getElementById('welcome-name');
      if (greetingEl) greetingEl.textContent = `Dr. ${doctor.full_name}`;

      this.updateStat('stat-today', summary.todayAppointments || 0);
      this.updateStat('stat-patients', summary.totalPatients || 0);
      this.updateStat('stat-pending', summary.pendingConsultations || 0);

      this.renderUpcomingAppointments(upcomingAppointments, 'upcoming-appointments-list');

    } catch (error) {
      UI.showToast('Failed to load dashboard data.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Initialize the admin dashboard
   */
  async initAdmin() {
    try {
      UI.showLoader();
      const response = await Api.get('/dashboard/admin');
      if (!response.success) return;

      const { users, appointments, todayAppointments, labBookings } = response.data;

      this.updateStat('stat-total-users', users.total || 0);
      this.updateStat('stat-total-patients', users.patients || 0);
      this.updateStat('stat-total-doctors', users.doctors || 0);
      this.updateStat('stat-today-appts', todayAppointments || 0);
      this.updateStat('stat-total-appts', appointments.total || 0);
      this.updateStat('stat-pending-labs', labBookings?.pending || 0);

    } catch (error) {
      UI.showToast('Failed to load dashboard data.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Update a stat card value by element ID
   */
  updateStat(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = value;
  },

  /**
   * Render upcoming appointments list
   */
  renderUpcomingAppointments(appointments, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!appointments || appointments.length === 0) {
      container.innerHTML = UI.emptyState('📅', 'No Upcoming Appointments', 'You have no scheduled appointments.');
      return;
    }

    container.innerHTML = appointments.map(appt => `
      <div class="appointment-item">
        <div class="appointment-item__time">
          <div class="appointment-item__time-value">${UI.formatTime(appt.appointment_time)}</div>
          <div class="appointment-item__time-label">${UI.formatDate(appt.appointment_date)}</div>
        </div>
        <div class="appointment-item__info">
          <div class="appointment-item__name">${appt.doctor_name || appt.patient_name}</div>
          <div class="appointment-item__detail">${appt.specialization || appt.reason || 'General Consultation'}</div>
        </div>
        <div>${UI.statusBadge(appt.status)}</div>
      </div>
    `).join('');
  },

  /**
   * Render upcoming consultations list
   */
  renderUpcomingConsultations(consultations, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!consultations || consultations.length === 0) {
      container.innerHTML = UI.emptyState('🩺', 'No Upcoming Consultations', 'You have no scheduled or pending online consultations.');
      return;
    }

    container.innerHTML = consultations.map(c => {
      let timeValue = 'Pending';
      let dateLabel = UI.formatDate(c.preferred_date);
      if (c.status !== 'requested' && c.consultation_date) {
        timeValue = UI.formatTime(c.consultation_time);
        dateLabel = UI.formatDate(c.consultation_date);
      }
      return `
        <div class="appointment-item" style="cursor: pointer;" onclick="window.location.href='/consultations.html'">
          <div class="appointment-item__time" style="background: var(--color-mint-light, #e6fffa); color: #0d9488;">
            <div class="appointment-item__time-value">${timeValue}</div>
            <div class="appointment-item__time-label">${dateLabel}</div>
          </div>
          <div class="appointment-item__info">
            <div class="appointment-item__name">Dr. ${c.doctor_name}</div>
            <div class="appointment-item__detail">${c.specialization || 'General Online Consultation'}</div>
          </div>
          <div>${UI.statusBadge(c.status)}</div>
        </div>
      `;
    }).join('');
  },

  /**
   * Render recent consultation history
   */
  renderConsultationHistory(consultations, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!consultations || consultations.length === 0) {
      container.innerHTML = UI.emptyState('🩺', 'No Past Consultations', 'Your past consultation history will appear here.');
      return;
    }

    container.innerHTML = consultations.map(c => {
      let dateLabel = c.consultation_date ? UI.formatDate(c.consultation_date) : UI.formatDate(c.created_at);
      return `
        <div class="appointment-item" style="cursor: pointer;" onclick="window.location.href='/consultations.html'">
          <div class="appointment-item__time" style="background: var(--color-gray-50, #f9fafb); color: var(--color-gray-600, #4b5563);">
            <div style="font-size: 1.4rem;">🩺</div>
            <div class="appointment-item__time-label" style="font-size: 0.65rem;">${dateLabel}</div>
          </div>
          <div class="appointment-item__info">
            <div class="appointment-item__name">Dr. ${c.doctor_name}</div>
            <div class="appointment-item__detail">${c.specialization || 'General Online Consultation'}</div>
          </div>
          <div>${UI.statusBadge(c.status)}</div>
        </div>
      `;
    }).join('');
  },

  /**
   * Render recent reports on the dashboard
   */
  renderRecentReports(reports) {
    const container = document.getElementById('recent-reports-list');
    if (!container) return;

    if (!reports || reports.length === 0) {
      container.innerHTML = UI.emptyState('📄', 'No Reports Yet', 'Your medical reports will appear here.');
      return;
    }

    container.innerHTML = reports.map(r => `
      <div class="appointment-item">
        <div class="appointment-item__time" style="background: var(--color-blue-50, #eff6ff);">
          <div style="font-size: 1.4rem;">📄</div>
        </div>
        <div class="appointment-item__info">
          <div class="appointment-item__name">${r.title}</div>
          <div class="appointment-item__detail">
            ${r.doctor_name ? 'Dr. ' + r.doctor_name + ' • ' : ''}${UI.formatDate(r.created_at)}
          </div>
        </div>
        <div>${UI.statusBadge(r.report_type)}</div>
      </div>
    `).join('');
  },

  /**
   * Render recent lab bookings on the dashboard
   */
  renderRecentLabBookings(bookings) {
    const container = document.getElementById('recent-lab-bookings-list');
    if (!container) return;

    if (!bookings || bookings.length === 0) {
      container.innerHTML = UI.emptyState('🔬', 'No Lab Bookings', 'Your lab test bookings will appear here.');
      return;
    }

    container.innerHTML = bookings.map(b => `
      <div class="appointment-item">
        <div class="appointment-item__time" style="background: var(--color-amber-50, #fffbeb);">
          <div style="font-size: 1.4rem;">🔬</div>
        </div>
        <div class="appointment-item__info">
          <div class="appointment-item__name">${b.test_name}</div>
          <div class="appointment-item__detail">
            ${b.test_code} • ${UI.formatDate(b.booking_date)}
          </div>
        </div>
        <div>${UI.statusBadge(b.status)}</div>
      </div>
    `).join('');
  },

  /**
   * Render recent notifications on the dashboard
   */
  renderRecentNotifications(notifications) {
    const container = document.getElementById('recent-notifications-list');
    if (!container) return;

    if (!notifications || notifications.length === 0) {
      container.innerHTML = UI.emptyState('🔔', 'No Notifications', 'You\'re all caught up!');
      return;
    }

    const icons = { appointment: '📅', lab: '🔬', report: '📄', system: '⚙️', reminder: '⏰' };

    container.innerHTML = notifications.map(n => `
      <div class="appointment-item ${n.is_read ? '' : 'notif-unread'}" style="cursor:pointer;" onclick="window.location.href='${n.link || '/notifications.html'}'">
        <div class="appointment-item__time" style="background: ${n.is_read ? 'var(--color-gray-50, #f9fafb)' : 'var(--color-mint-light)'};">
          <div style="font-size: 1.4rem;">${icons[n.type] || '🔔'}</div>
        </div>
        <div class="appointment-item__info">
          <div class="appointment-item__name">${n.title}</div>
          <div class="appointment-item__detail">${n.message}</div>
        </div>
        ${!n.is_read ? '<span class="badge badge--primary" style="font-size: 0.65rem;">New</span>' : ''}
      </div>
    `).join('');
  },

  /**
   * Render upcoming sample collections on the dashboard
   */
  renderUpcomingCollections(collections, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!collections || collections.length === 0) {
      container.innerHTML = UI.emptyState('🏠', 'No Upcoming Collections', 'You have no active sample collections scheduled.');
      return;
    }

    container.innerHTML = collections.map(c => {
      const isAssigned = ['assigned', 'scheduled', 'in_transit', 'collected', 'testing', 'report_ready', 'delivered'].includes(c.status);
      const isCollected = ['collected', 'testing', 'report_ready', 'delivered'].includes(c.status);
      const isTesting = ['testing', 'report_ready', 'delivered'].includes(c.status);
      const isDelivered = ['delivered'].includes(c.status);

      return `
        <div class="appointment-item" style="cursor: pointer;" onclick="window.location.href='/sample-collection.html'">
          <div class="appointment-item__time" style="background: var(--color-mint-light, #e6fffa); color: #0d9488;">
            <div class="appointment-item__time-value">🏠</div>
            <div class="appointment-item__time-label">${UI.formatDate(c.preferred_date)}</div>
          </div>
          <div class="appointment-item__info">
            <div class="appointment-item__name">${c.test_name}</div>
            <div class="appointment-item__detail">
              <strong>Address:</strong> ${c.collection_address}<br>
              <strong>Collector:</strong> ${c.collector_name || 'Not assigned yet'}<br>
              <div style="display:flex; gap: 5px; font-size: 11px; margin-top: 4px;">
                <span style="color: ${isAssigned ? '#0d9488' : '#9ca3af'}; font-weight: ${isAssigned ? 'bold' : 'normal'};">Assigned</span> →
                <span style="color: ${isCollected ? '#0d9488' : '#9ca3af'}; font-weight: ${isCollected ? 'bold' : 'normal'};">Collected</span> →
                <span style="color: ${isTesting ? '#0d9488' : '#9ca3af'}; font-weight: ${isTesting ? 'bold' : 'normal'};">Testing</span> →
                <span style="color: ${isDelivered ? '#0d9488' : '#9ca3af'}; font-weight: ${isDelivered ? 'bold' : 'normal'};">Delivered</span>
              </div>
            </div>
          </div>
          <div>${UI.statusBadge(c.status)}</div>
        </div>
      `;
    }).join('');
  },

  /**
   * Render recent history timeline on the dashboard
   */
  renderRecentHistory(history, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!history || history.length === 0) {
      container.innerHTML = UI.emptyState('📜', 'No Journey Logs', 'Your medical journey logs will appear here.');
      return;
    }

    const eventIcons = {
      appointments: '📅',
      consultations: '🩺',
      lab_bookings: '🔬',
      sample_collections: '🏠',
      reports: '📄'
    };

    container.innerHTML = history.map(h => `
      <div class="appointment-item" style="cursor: pointer;" onclick="window.location.href='/history.html'">
        <div class="appointment-item__time" style="background: var(--color-mint-light); color: #0d9488;">
          <div style="font-size: 1.4rem;">${eventIcons[h.source_module] || '📋'}</div>
        </div>
        <div class="appointment-item__info">
          <div class="appointment-item__name">${h.title}</div>
          <div class="appointment-item__detail">${h.description || ''} • ${UI.formatDate(h.event_date)}</div>
        </div>
        <div><span class="badge badge--gray" style="text-transform: capitalize;">${h.source_module.replace('_', ' ')}</span></div>
      </div>
    `).join('');
  },
};
