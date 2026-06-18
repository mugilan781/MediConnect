// ============================================================
// MediConnect – public/js/doctor-dashboard.js
// Client-side controller for Doctor Dashboard tabbed SPA
// ============================================================

const DoctorDashboard = {
  currentDoctor: null,
  activePatientId: null,
  activeNestedTab: 'pat-info',

  async init() {
    const user = Auth.getUser();
    // Allow demo mode: if no user or wrong role, use demo context instead of redirecting
    const isDemo = !user || user.role !== 'doctor';
    if (isDemo && typeof DemoAuth === 'undefined') {
      window.location.href = '/login.html';
      return;
    }

    await this.fetchDoctorProfile();
    this.setupTabs();
    this.bindEvents();

    // Auto-switch to tab in URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') || 'overview';
    this.switchTab(initialTab);
  },

  async fetchDoctorProfile() {
    try {
      const response = await Api.get('/auth/me');
      if (response.success && response.data.profile) {
        this.currentDoctor = response.data.profile;
        this.currentDoctor.full_name = response.data.user.full_name;
        this.currentDoctor.phone = response.data.user.phone;
        this.currentDoctor.email = response.data.user.email;
        document.getElementById('welcome-name').textContent = `Dr. ${this.currentDoctor.full_name}`;
      } else {
        // Fallback for demo mode: use dashboard API data
        await this._loadDemoProfile();
      }
    } catch (error) {
      // In demo mode, /auth/me will fail — use demo fallback
      console.warn('Auth profile unavailable, using demo profile');
      await this._loadDemoProfile();
    }
  },

  async _loadDemoProfile() {
    try {
      const dashResponse = await Api.get('/dashboard/doctor');
      if (dashResponse.success && dashResponse.data.doctor) {
        this.currentDoctor = dashResponse.data.doctor;
        const name = this.currentDoctor.full_name;
        document.getElementById('welcome-name').textContent = name.startsWith('Dr.') ? name : `Dr. ${name}`;
      }
    } catch (e) {
      console.error('Failed to load demo doctor profile:', e);
    }
  },

  setupTabs() {
    const tabButtons = document.querySelectorAll('.sidebar__link[data-tab]');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    const nestedButtons = document.querySelectorAll('.nested-tab-btn');
    nestedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const nestedTab = btn.dataset.nestedTab;
        this.switchNestedTab(nestedTab);
      });
    });
  },

  switchTab(tabName) {
    // Update active tab buttons
    document.querySelectorAll('.sidebar__link[data-tab]').forEach(btn => {
      if (btn.dataset.tab === tabName) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    // Update visibility of tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
      if (content.id === `tab-${tabName}`) content.style.display = 'block';
      else content.style.display = 'none';
    });

    // Replace URL parameter without reload
    const newurl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?tab=${tabName}`;
    window.history.replaceState({ path: newurl }, '', newurl);

    // Trigger loader functions
    switch (tabName) {
      case 'overview':
        this.loadOverview();
        break;
      case 'appointments':
        this.loadAppointments();
        break;
      case 'consultations':
        this.loadConsultations();
        break;
      case 'patients':
        this.loadPatients();
        break;
      case 'schedule':
        this.loadWeeklySchedule();
        break;
      case 'slots':
        this.loadCustomSlots();
        break;
      case 'leaves':
        this.loadLeaves();
        break;
      case 'reports':
        this.loadReports();
        break;
      case 'notifications':
        this.loadNotifications();
        break;
      case 'profile':
        this.loadProfileForm();
        break;
    }
  },

  switchNestedTab(nestedTabName) {
    document.querySelectorAll('.nested-tab-btn').forEach(btn => {
      if (btn.dataset.nestedTab === nestedTabName) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    document.querySelectorAll('.nested-tab-content').forEach(content => {
      if (content.id === `nested-${nestedTabName}`) content.style.display = 'block';
      else content.style.display = 'none';
    });

    this.activeNestedTab = nestedTabName;
    if (this.activePatientId) {
      this.loadPatientNestedData(nestedTabName);
    }
  },

  bindEvents() {
    // 1. Reschedule Form
    document.getElementById('reschedule-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitReschedule();
    });

    // 2. Consultation Form
    document.getElementById('consultation-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitConsultation();
    });

    // 3. Custom Slot Form
    document.getElementById('add-slot-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitCustomSlot();
    });

    // 4. Leave Form
    document.getElementById('add-leave-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitLeave();
    });

    // 5. Upload Report Form
    document.getElementById('upload-report-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitReport();
    });

    document.getElementById('rep-patient-id')?.addEventListener('change', async (e) => {
      await this.loadPatientCareRecords(e.target.value);
    });

    // 6. Weekly Schedule Form
    document.getElementById('weekly-schedule-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitWeeklySchedule();
    });

    // 7. Profile Form
    document.getElementById('doctor-profile-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitProfile();
    });

    // 8. Filters & Search inputs
    document.getElementById('appt-search')?.addEventListener('input', () => this.loadAppointments());
    document.getElementById('appt-filter-status')?.addEventListener('change', () => this.loadAppointments());
    document.getElementById('consult-filter-status')?.addEventListener('change', () => this.loadConsultations());
    document.getElementById('patient-search')?.addEventListener('input', () => this.loadPatients());
    document.getElementById('btn-mark-all-read')?.addEventListener('click', () => this.markAllNotificationsRead());

    let notifSearchTimeout = null;
    document.getElementById('notif-search')?.addEventListener('input', () => {
      clearTimeout(notifSearchTimeout);
      notifSearchTimeout = setTimeout(() => this.loadNotifications(), 300);
    });
    document.getElementById('notif-filter-type')?.addEventListener('change', () => this.loadNotifications());
  },

  // ==================== 1. OVERVIEW ====================
  async loadOverview() {
    try {
      const res = await Api.get('/dashboard/doctor');
      if (res.success) {
        const { summary, pendingConsultations, scheduledConsultations, consultationStats } = res.data;
        
        document.getElementById('stat-today-appts').textContent = summary.todayAppointments || 0;
        document.getElementById('stat-upcoming-appts').textContent = consultationStats?.scheduled || 0;
        document.getElementById('stat-pending-consults').textContent = consultationStats?.requested || 0;
        document.getElementById('stat-active-patients').textContent = summary.totalPatients || 0;

        // Render pending consultations request on overview
        const requestList = document.getElementById('overview-requests-list');
        if (requestList) {
          const badge = document.getElementById('badge-consultations');
          if (badge) {
            badge.textContent = pendingConsultations.length;
            badge.style.display = pendingConsultations.length > 0 ? 'inline-block' : 'none';
          }

          if (pendingConsultations.length === 0) {
            requestList.innerHTML = '<div class="empty-state">No pending consultation requests.</div>';
          } else {
            requestList.innerHTML = `<ul class="activity-list">
              ${pendingConsultations.slice(0, 5).map(c => `
                <li class="activity-item">
                  <span class="activity-item__dot activity-item__dot--primary"></span>
                  <div class="activity-item__content">
                    <div class="activity-item__text"><strong>${c.patient_name}</strong> requested a consultation.</div>
                    <div class="activity-item__time">Pref. Date: ${UI.formatDate(c.preferred_date)}<br>Symptoms: ${c.symptoms || 'None recorded'}</div>
                    <div class="mt-2">
                      <button class="btn btn--sm btn--primary" onclick="DoctorDashboard.handleConsultationRequest(${c.id}, 'accepted')">Accept</button>
                      <button class="btn btn--sm btn--ghost" onclick="DoctorDashboard.handleConsultationRequest(${c.id}, 'rejected')">Reject</button>
                    </div>
                  </div>
                </li>
              `).join('')}
            </ul>`;
          }
        }
      }

      // Load today's schedules list on overview
      const today = new Date().toISOString().split('T')[0];
      const apptRes = await Api.get(`/appointments?date_from=${today}&date_to=${today}`);
      const todayList = document.getElementById('overview-today-list');
      if (todayList && apptRes.success) {
        if (apptRes.data.length === 0) {
          todayList.innerHTML = '<div class="empty-state">No appointments scheduled for today.</div>';
        } else {
          todayList.innerHTML = `<div class="table-container"><table class="data-table">
            <thead><tr><th>Time</th><th>Patient</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>
              ${apptRes.data.map(a => `
                <tr>
                  <td>${UI.formatTime(a.appointment_time)}</td>
                  <td><strong>${a.patient_name}</strong></td>
                  <td><span class="badge badge--info">${a.type}</span></td>
                  <td>${UI.statusBadge(a.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>`;
        }
      }

      // Unread notifications count
      const notifRes = await Api.get('/notifications/unread-count');
      const badgeNotif = document.getElementById('badge-notifs');
      if (badgeNotif && notifRes.success) {
        const count = notifRes.data.count;
        badgeNotif.textContent = count;
        badgeNotif.style.display = count > 0 ? 'inline-block' : 'none';
      }

      // Load recent notifications list on overview
      const notifsRes = await Api.get('/notifications?limit=5');
      const overviewNotifList = document.getElementById('overview-notifications-list');
      if (overviewNotifList && notifsRes.success) {
        if (notifsRes.data.length === 0) {
          overviewNotifList.innerHTML = '<div class="empty-state">No notifications yet.</div>';
        } else {
          overviewNotifList.innerHTML = `<ul class="activity-list">
            ${notifsRes.data.map(n => `
              <li class="activity-item" style="padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                <span class="activity-item__dot ${n.is_read ? 'activity-item__dot--secondary' : 'activity-item__dot--primary'}"></span>
                <div class="activity-item__content">
                  <div class="activity-item__text"><strong>${n.title}</strong> — ${n.message}</div>
                  <div class="activity-item__time">${UI.formatDate(n.created_at)}</div>
                </div>
              </li>
            `).join('')}
          </ul>`;
        }
      }

    } catch (err) {
      console.error(err);
    }
  },

  // ==================== 2. APPOINTMENTS ====================
  async loadAppointments() {
    try {
      const search = document.getElementById('appt-search')?.value || '';
      const status = document.getElementById('appt-filter-status')?.value || '';
      const response = await Api.get(`/appointments?search=${search}&status=${status}`);
      const container = document.getElementById('appts-list');
      if (!container || !response.success) return;

      if (response.data.length === 0) {
        container.innerHTML = UI.emptyState('calendar', 'No Appointments', 'No appointments match your criteria.');
        return;
      }

      container.innerHTML = `<div class="table-container">
        <table class="data-table">
          <thead><tr><th>Date/Time</th><th>Patient</th><th>Type</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${response.data.map(a => {
              const dateStr = UI.formatDate(a.appointment_date);
              const timeStr = UI.formatTime(a.appointment_time);
              const isPast = new Date(a.appointment_date) < new Date();
              let actions = '';

              if (a.status === 'scheduled') {
                actions += `<button class="btn btn--sm btn--primary mr-1" onclick="DoctorDashboard.updateAppointmentStatus(${a.id}, 'confirmed')">Approve</button>`;
                actions += `<button class="btn btn--sm btn--danger mr-1" onclick="DoctorDashboard.updateAppointmentStatus(${a.id}, 'cancelled')">Cancel</button>`;
                actions += `<button class="btn btn--sm btn--secondary" onclick="DoctorDashboard.openRescheduleModal(${a.id}, '${a.appointment_date}', '${a.appointment_time}')">Reschedule</button>`;
              } else if (a.status === 'confirmed') {
                actions += `<button class="btn btn--sm btn--success mr-1" onclick="DoctorDashboard.updateAppointmentStatus(${a.id}, 'completed')">Complete</button>`;
                actions += `<button class="btn btn--sm btn--secondary" onclick="DoctorDashboard.openRescheduleModal(${a.id}, '${a.appointment_date}', '${a.appointment_time}')">Reschedule</button>`;
              } else if (a.status === 'completed') {
                actions += `<button class="btn btn--sm btn--primary" onclick="DoctorDashboard.openConsultationModal(null, ${a.id})">Create Consultation</button>`;
              } else {
                actions = '—';
              }

              return `
                <tr>
                  <td><strong>${dateStr}</strong><br><span class="text-xs text-muted">${timeStr}</span></td>
                  <td><a href="#" class="font-bold text-primary" onclick="DoctorDashboard.openPatientDetailsModal(${a.patient_id}); return false;">${a.patient_name}</a></td>
                  <td><span class="badge badge--info">${a.type}</span></td>
                  <td>${a.reason || 'No reason specified'}</td>
                  <td>${UI.statusBadge(a.status)}</td>
                  <td>${actions}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    } catch (error) {
      UI.showToast('Failed to load appointments.', 'error');
    }
  },

  async updateAppointmentStatus(id, status) {
    try {
      UI.showLoader();
      const response = await Api.patch(`/appointments/${id}/status`, { status });
      if (response.success) {
        UI.showToast(`Appointment marked ${status}.`, 'success');
        this.loadAppointments();
        this.loadOverview();
      }
    } catch (error) {
      UI.showToast(error.message || 'Status update failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  openRescheduleModal(id, date, time) {
    document.getElementById('reschedule-appt-id').value = id;
    document.getElementById('resched-date').value = date.split('T')[0];
    document.getElementById('resched-time').value = time.substring(0, 5);
    UI.openModal('reschedule-modal');
  },

  async submitReschedule() {
    try {
      const id = document.getElementById('reschedule-appt-id').value;
      const data = {
        appointment_date: document.getElementById('resched-date').value,
        appointment_time: document.getElementById('resched-time').value,
      };
      UI.showLoader();
      const response = await Api.put(`/appointments/${id}`, data);
      if (response.success) {
        UI.showToast('Appointment rescheduled successfully.', 'success');
        UI.closeModal('reschedule-modal');
        this.loadAppointments();
      }
    } catch (error) {
      UI.showToast(error.message || 'Reschedule failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  // ==================== 3. CONSULTATIONS ====================
  async loadConsultations() {
    try {
      const status = document.getElementById('consult-filter-status')?.value || '';
      const response = await Api.get(`/consultations?status=${status}`);
      const container = document.getElementById('consults-list');
      if (!container || !response.success) return;

      if (response.data.length === 0) {
        container.innerHTML = UI.emptyState('stethoscope', 'No Consultations', 'No consultation records found.');
        return;
      }

      container.innerHTML = `<div class="table-container">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Patient</th><th>Symptoms</th><th>Diagnosis</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${response.data.map(c => {
              let actions = '';
              if (c.status === 'requested' || c.status === 'pending') {
                actions += `<button class="btn btn--sm btn--primary mr-1" onclick="DoctorDashboard.handleConsultationRequest(${c.id}, 'accepted')">Accept</button>`;
                actions += `<button class="btn btn--sm btn--danger mr-1" onclick="DoctorDashboard.handleConsultationRequest(${c.id}, 'rejected')">Reject</button>`;
              } else {
                actions += `<button class="btn btn--sm btn--ghost" onclick="window.location.href='/consultations.html'">Manage in Portal</button>`;
              }

              return `
                <tr>
                  <td>${UI.formatDate(c.created_at)}</td>
                  <td><strong>${c.patient_name}</strong></td>
                  <td>${c.symptoms || '—'}</td>
                  <td>${c.diagnosis || '—'}</td>
                  <td>${UI.statusBadge(c.status || 'completed')}</td>
                  <td>${actions}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    } catch (error) {
      UI.showToast('Failed to load consultations.', 'error');
    }
  },

  async handleConsultationRequest(id, status) {
    try {
      UI.showLoader();
      let response;
      if (status === 'accepted') {
        response = await Api.put(`/consultations/${id}/accept`, {});
      } else {
        const reason = prompt('Please enter declination reason:');
        if (reason === null) return;
        response = await Api.put(`/consultations/${id}/reject`, { reason });
      }
      if (response.success) {
        UI.showToast(`Consultation request ${status}.`, 'success');
        this.loadConsultations();
        this.loadOverview();
      }
    } catch (error) {
      UI.showToast(error.message || 'Action failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  openConsultationModal(consultId, apptId) {
    document.getElementById('consultation-form').reset();
    document.getElementById('consult-appt-id').value = apptId;
    document.getElementById('consult-id').value = consultId || '';
    document.getElementById('btn-save-consult').textContent = consultId ? 'Complete Consultation' : 'Submit Consultation';
    UI.openModal('consultation-modal');
  },

  async submitConsultation() {
    try {
      const consultId = document.getElementById('consult-id').value;
      const apptId = document.getElementById('consult-appt-id').value;
      const data = {
        appointment_id: parseInt(apptId),
        symptoms: document.getElementById('consult-symptoms').value,
        diagnosis: document.getElementById('consult-diagnosis').value,
        prescription: document.getElementById('consult-prescription').value,
        follow_up_date: document.getElementById('consult-followup').value || null,
        notes: document.getElementById('consult-notes').value,
        status: 'completed'
      };

      UI.showLoader();
      let response;
      if (consultId) {
        // Complete an existing requested/accepted consultation record
        response = await Api.put(`/consultations/${consultId}`, data);
      } else {
        // Create fresh completed consultation record from completed appointment
        response = await Api.post('/consultations', data);
      }

      if (response.success) {
        UI.showToast('Consultation saved successfully.', 'success');
        UI.closeModal('consultation-modal');
        this.loadConsultations();
        this.loadAppointments();
        this.loadOverview();
      }
    } catch (error) {
      UI.showToast(error.message || 'Saving consultation failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async viewConsultationDetails(id) {
    try {
      const response = await Api.get(`/consultations/${id}`);
      if (response.success) {
        const c = response.data;
        alert(`Diagnosis: ${c.diagnosis || 'None'}\nPrescription: ${c.prescription || 'None'}\nFollow-up: ${c.follow_up_date ? UI.formatDate(c.follow_up_date) : 'No'}\nNotes: ${c.notes || 'None'}`);
      }
    } catch (error) {
      UI.showToast('Failed to load consultation details.', 'error');
    }
  },

  // ==================== 4. PATIENT RECORDS (READ-ONLY) ====================
  async loadPatients() {
    try {
      const search = document.getElementById('patient-search')?.value || '';
      const response = await Api.get(`/patients?search=${search}`);
      const container = document.getElementById('patients-list');
      if (!container || !response.success) return;

      if (response.data.length === 0) {
        container.innerHTML = UI.emptyState('user', 'No Associated Patients', 'You have no associated patients in your history.');
        return;
      }

      container.innerHTML = `<div class="table-container">
        <table class="data-table">
          <thead><tr><th>Patient Name</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
          <tbody>
            ${response.data.map(p => `
              <tr>
                <td><strong>${p.full_name}</strong></td>
                <td>${p.email}</td>
                <td>${p.phone || '—'}</td>
                <td><button class="btn btn--sm btn--primary" onclick="DoctorDashboard.openPatientDetailsModal(${p.id})">Open Records</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
    } catch (error) {
      UI.showToast('Failed to load patient records.', 'error');
    }
  },

  openPatientDetailsModal(patientId) {
    this.activePatientId = patientId;
    this.switchNestedTab('pat-info');
    UI.openModal('patient-details-modal');
  },

  async loadPatientNestedData(tabName) {
    const id = this.activePatientId;
    const container = document.getElementById(`nested-${tabName}`);
    if (!container) return;

    container.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';

    try {
      if (tabName === 'pat-info') {
        const res = await Api.get(`/doctors/me/patients/${id}`);
        if (res.success) {
          const p = res.data;
          container.innerHTML = `
            <div class="detail-grid">
              <div class="detail-group"><div class="detail-label">Name</div><div class="detail-value">${p.full_name}</div></div>
              <div class="detail-group"><div class="detail-label">Email</div><div class="detail-value">${p.email}</div></div>
              <div class="detail-group"><div class="detail-label">Phone</div><div class="detail-value">${p.phone || '—'}</div></div>
              <div class="detail-group"><div class="detail-label">Blood Group</div><div class="detail-value">${p.blood_group || '—'}</div></div>
              <div class="detail-group"><div class="detail-label">Date of Birth</div><div class="detail-value">${p.date_of_birth ? UI.formatDate(p.date_of_birth) : '—'}</div></div>
              <div class="detail-group"><div class="detail-label">Gender</div><div class="detail-value">${p.gender || '—'}</div></div>
              <div class="detail-group detail-group--full"><div class="detail-label">Address</div><div class="detail-value">${p.address || '—'}</div></div>
              <div class="detail-group detail-group--full"><div class="detail-label">Allergies</div><div class="detail-value">${p.allergies || '—'}</div></div>
            </div>
          `;
        }
      } else if (tabName === 'pat-history') {
        const res = await Api.get(`/doctors/me/patients/${id}/history`);
        if (res.success) {
          if (res.data.length === 0) { container.innerHTML = '<div class="empty-state">No medical history entries.</div>'; return; }
          container.innerHTML = `<ul class="activity-list">${res.data.map(h => `
            <li class="activity-item">
              <span class="activity-item__dot activity-item__dot--primary"></span>
              <div class="activity-item__content">
                <div class="activity-item__text"><strong>${h.title}</strong></div>
                <div class="activity-item__time">${UI.formatDate(h.event_date)} • ${h.description || '—'}</div>
              </div>
            </li>
          `).join('')}</ul>`;
        }
      } else if (tabName === 'pat-appts') {
        const res = await Api.get(`/doctors/me/patients/${id}/appointments`);
        if (res.success) {
          if (res.data.length === 0) { container.innerHTML = '<div class="empty-state">No appointments records.</div>'; return; }
          container.innerHTML = `<table class="data-table">
            <thead><tr><th>Date</th><th>Type</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>${res.data.map(a => `
              <tr>
                <td>${UI.formatDate(a.appointment_date)} ${UI.formatTime(a.appointment_time)}</td>
                <td>${a.type}</td>
                <td>${a.reason || '—'}</td>
                <td>${UI.statusBadge(a.status)}</td>
              </tr>
            `).join('')}</tbody>
          </table>`;
        }
      } else if (tabName === 'pat-consults') {
        const res = await Api.get(`/doctors/me/patients/${id}/consultations`);
        if (res.success) {
          if (res.data.length === 0) { container.innerHTML = '<div class="empty-state">No consultations records.</div>'; return; }
          container.innerHTML = `<table class="data-table">
            <thead><tr><th>Date</th><th>Diagnosis</th><th>Prescription</th></tr></thead>
            <tbody>${res.data.map(c => `
              <tr>
                <td>${UI.formatDate(c.created_at)}</td>
                <td>${c.diagnosis || '—'}</td>
                <td>${c.prescription || '—'}</td>
              </tr>
            `).join('')}</tbody>
          </table>`;
        }
      } else if (tabName === 'pat-reports') {
        const res = await Api.get(`/doctors/me/patients/${id}/reports`);
        if (res.success) {
          if (res.data.length === 0) { container.innerHTML = '<div class="empty-state">No reports.</div>'; return; }
          container.innerHTML = `<table class="data-table">
            <thead><tr><th>Title</th><th>Type</th><th>Date</th><th>Link</th></tr></thead>
            <tbody>${res.data.map(r => `
              <tr>
                <td>${r.title}</td>
                <td>${r.report_type}</td>
                <td>${UI.formatDate(r.created_at)}</td>
                <td><a href="${r.file_url}" target="_blank" class="btn btn--sm btn--ghost">View File</a></td>
              </tr>
            `).join('')}</tbody>
          </table>`;
        }
      } else if (tabName === 'pat-labtests') {
        const res = await Api.get(`/doctors/me/patients/${id}/lab-tests`);
        if (res.success) {
          if (res.data.length === 0) { container.innerHTML = '<div class="empty-state">No lab test bookings.</div>'; return; }
          container.innerHTML = `<table class="data-table">
            <thead><tr><th>Test</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>${res.data.map(l => `
              <tr>
                <td>${l.test_name}</td>
                <td>${UI.formatDate(l.booking_date)}</td>
                <td>${UI.statusBadge(l.status)}</td>
              </tr>
            `).join('')}</tbody>
          </table>`;
        }
      }
    } catch (error) {
      container.innerHTML = '<div class="empty-state">Failed to load patient records.</div>';
    }
  },

  // ==================== 5. WEEKLY SCHEDULE ====================
  async loadWeeklySchedule() {
    try {
      const response = await Api.get('/doctors/me/schedule');
      if (!response.success) return;

      const durationSelect = document.getElementById('sched-slot-duration');
      if (durationSelect) durationSelect.value = response.data.slot_duration_min || 30;

      const schedules = response.data.schedules;
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const container = document.getElementById('weekly-schedule-days');
      if (!container) return;

      container.innerHTML = days.map(day => {
        const match = schedules.find(s => s.day_of_week === day) || {};
        const isChecked = match.is_active || false;
        const start = match.start_time ? match.start_time.substring(0, 5) : '09:00';
        const end = match.end_time ? match.end_time.substring(0, 5) : '17:00';
        const breakStart = match.break_start_time ? match.break_start_time.substring(0, 5) : '';
        const breakEnd = match.break_end_time ? match.break_end_time.substring(0, 5) : '';

        return `
          <div class="schedule-day-row">
            <div class="schedule-day-label">
              <label class="form-checkbox">
                <input type="checkbox" name="active_${day}" ${isChecked ? 'checked' : ''}>
                <span>${day}</span>
              </label>
            </div>
            <div class="form-group mb-0">
              <label class="form-label text-xs">Work Start</label>
              <input type="time" name="start_${day}" class="form-input form-input--sm" value="${start}">
            </div>
            <div class="form-group mb-0">
              <label class="form-label text-xs">Work End</label>
              <input type="time" name="end_${day}" class="form-input form-input--sm" value="${end}">
            </div>
            <div class="form-group mb-0">
              <label class="form-label text-xs">Break Start</label>
              <input type="time" name="break_start_${day}" class="form-input form-input--sm" value="${breakStart}">
            </div>
            <div class="form-group mb-0">
              <label class="form-label text-xs">Break End</label>
              <input type="time" name="break_end_${day}" class="form-input form-input--sm" value="${breakEnd}">
            </div>
          </div>
        `;
      }).join('');

    } catch (error) {
      UI.showToast('Failed to load schedule.', 'error');
    }
  },

  async submitWeeklySchedule() {
    try {
      const slot_duration_min = parseInt(document.getElementById('sched-slot-duration').value);
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const schedules = [];

      days.forEach(day => {
        const isActive = document.querySelector(`input[name="active_${day}"]`)?.checked || false;
        const start_time = document.querySelector(`input[name="start_${day}"]`)?.value || '09:00';
        const end_time = document.querySelector(`input[name="end_${day}"]`)?.value || '17:00';
        const break_start_time = document.querySelector(`input[name="break_start_${day}"]`)?.value || null;
        const break_end_time = document.querySelector(`input[name="break_end_${day}"]`)?.value || null;

        schedules.push({
          day_of_week: day,
          start_time,
          end_time,
          break_start_time,
          break_end_time,
          is_active: isActive ? 1 : 0
        });
      });

      UI.showLoader();
      const res = await Api.put('/doctors/me/schedule', { slot_duration_min, schedules });
      if (res.success) {
        UI.showToast('Schedule settings saved successfully.', 'success');
        this.loadWeeklySchedule();
      }
    } catch (error) {
      UI.showToast(error.message || 'Saving schedule failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  // ==================== 6. CUSTOM AVAILABILITY SLOTS ====================
  async loadCustomSlots() {
    try {
      const response = await Api.get('/doctors/me/slots');
      const container = document.getElementById('custom-slots-list');
      if (!container || !response.success) return;

      if (response.data.length === 0) {
        container.innerHTML = UI.emptyState('clock', 'No Custom Slots', 'No custom slots defined. You follow your weekly default hours.');
        return;
      }

      container.innerHTML = `<div class="table-container">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Start Time</th><th>End Time</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${response.data.map(s => `
              <tr>
                <td>${UI.formatDate(s.slot_date)}</td>
                <td>${UI.formatTime(s.start_time)}</td>
                <td>${UI.formatTime(s.end_time)}</td>
                <td>${s.is_available ? '<span class="badge badge--success">Available</span>' : '<span class="badge badge--danger">Disabled</span>'}</td>
                <td>
                  <button class="btn btn--sm ${s.is_available ? 'btn--secondary' : 'btn--primary'} mr-1" onclick="DoctorDashboard.toggleSlot(${s.id}, ${s.is_available ? 0 : 1})">
                    ${s.is_available ? 'Disable' : 'Enable'}
                  </button>
                  <button class="btn btn--sm btn--danger" onclick="DoctorDashboard.deleteSlot(${s.id})">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
    } catch (error) {
      UI.showToast('Failed to load custom slots.', 'error');
    }
  },

  async submitCustomSlot() {
    try {
      const data = {
        slot_date: document.getElementById('slot-date').value,
        start_time: document.getElementById('slot-start').value,
        end_time: document.getElementById('slot-end').value,
        is_available: 1
      };
      UI.showLoader();
      const res = await Api.post('/doctors/me/slots', data);
      if (res.success) {
        UI.showToast('Custom availability slot created.', 'success');
        UI.closeModal('add-slot-modal');
        this.loadCustomSlots();
      }
    } catch (error) {
      UI.showToast(error.message || 'Creating custom slot failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async toggleSlot(id, is_available) {
    try {
      UI.showLoader();
      const res = await Api.put(`/doctors/me/slots/${id}`, { is_available });
      if (res.success) {
        UI.showToast('Slot updated.', 'success');
        this.loadCustomSlots();
      }
    } catch (error) {
      UI.showToast(error.message || 'Toggle failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async deleteSlot(id) {
    if (!confirm('Are you sure you want to delete this custom slot?')) return;
    try {
      UI.showLoader();
      const res = await Api.delete(`/doctors/me/slots/${id}`);
      if (res.success) {
        UI.showToast('Custom slot deleted.', 'success');
        this.loadCustomSlots();
      }
    } catch (error) {
      UI.showToast(error.message || 'Deletion failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  // ==================== 7. LEAVE MANAGEMENT ====================
  async loadLeaves() {
    try {
      const res = await Api.get('/doctors/me/leaves');
      const container = document.getElementById('leaves-list');
      if (!container || !res.success) return;

      if (res.data.length === 0) {
        container.innerHTML = UI.emptyState('calendar', 'No Absence / Leaves', 'You have no leaves requested or scheduled.');
        return;
      }

      container.innerHTML = `<div class="table-container">
        <table class="data-table">
          <thead><tr><th>Start Date</th><th>End Date</th><th>Reason</th><th>Actions</th></tr></thead>
          <tbody>
            ${res.data.map(l => `
              <tr>
                <td><strong>${UI.formatDate(l.start_date)}</strong></td>
                <td><strong>${UI.formatDate(l.end_date)}</strong></td>
                <td>${l.reason || '—'}</td>
                <td><button class="btn btn--sm btn--danger" onclick="DoctorDashboard.deleteLeave(${l.id})">Cancel Leave</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
    } catch (error) {
      UI.showToast('Failed to load leaves.', 'error');
    }
  },

  async submitLeave() {
    try {
      const data = {
        start_date: document.getElementById('leave-start').value,
        end_date: document.getElementById('leave-end').value,
        reason: document.getElementById('leave-reason').value
      };
      UI.showLoader();
      const res = await Api.post('/doctors/me/leaves', data);
      if (res.success) {
        UI.showToast('Leave requested successfully.', 'success');
        UI.closeModal('add-leave-modal');
        this.loadLeaves();
      }
    } catch (error) {
      UI.showToast(error.message || 'Requesting leave failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async deleteLeave(id) {
    if (!confirm('Are you sure you want to cancel this leave? This will reopen slots on these dates.')) return;
    try {
      UI.showLoader();
      const res = await Api.delete(`/doctors/me/leaves/${id}`);
      if (res.success) {
        UI.showToast('Leave cancelled successfully.', 'success');
        this.loadLeaves();
      }
    } catch (error) {
      UI.showToast(error.message || 'Failed to cancel leave.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  // ==================== 8. MEDICAL REPORTS ====================
  async loadReports() {
    try {
      const response = await Api.get('/reports');
      const container = document.getElementById('reports-list');
      if (!container || !response.success) return;

      if (response.data.length === 0) {
        container.innerHTML = UI.emptyState('file', 'No Reports', 'You have not uploaded any medical reports yet.');
        return;
      }

      container.innerHTML = `<div class="table-container">
        <table class="data-table">
          <thead><tr><th>Title</th><th>Category</th><th>Type</th><th>Patient</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            ${response.data.map(r => {
              const safeTitle = r.title.replace(/'/g, "\\'");
              const safeNotes = (r.notes || '').replace(/'/g, "\\'").replace(/\n/g, "\\n");
              const safeCategory = (r.category || '').replace(/'/g, "\\'");
              return `
                <tr>
                  <td><strong>${r.title}</strong></td>
                  <td><span class="badge badge--info">${r.category || 'General'}</span></td>
                  <td>${UI.statusBadge(r.report_type)}</td>
                  <td>${r.patient_name}</td>
                  <td>${UI.formatDate(r.created_at)}</td>
                  <td>
                    <a href="${r.file_url}" target="_blank" class="btn btn--sm btn--ghost mr-1">View File</a>
                    <button class="btn btn--sm btn--secondary mr-1" onclick="DoctorDashboard.openEditReportModal(${r.id}, '${safeTitle}', '${r.report_type}', '${safeCategory}', '${safeNotes}', ${r.is_shared_with_patient}, ${r.patient_id}, ${r.appointment_id || 'null'}, ${r.consultation_id || 'null'}, ${r.lab_booking_id || 'null'})">Edit</button>
                    <button class="btn btn--sm btn--danger" onclick="DoctorDashboard.deleteReport(${r.id})">Delete</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    } catch (error) {
      UI.showToast('Failed to load reports.', 'error');
    }
  },

  async loadPatientCareRecords(patientId) {
    if (!patientId) {
      document.getElementById('rep-appointment-id').innerHTML = '<option value="">None</option>';
      document.getElementById('rep-consultation-id').innerHTML = '<option value="">None</option>';
      document.getElementById('rep-lab-booking-id').innerHTML = '<option value="">None</option>';
      return;
    }
    try {
      // Fetch appointments
      const appts = await Api.get(`/appointments?patient_id=${patientId}`);
      const apptSelect = document.getElementById('rep-appointment-id');
      if (apptSelect) {
        apptSelect.innerHTML = '<option value="">None</option>' + 
          (appts.success ? appts.data.map(a => `<option value="${a.id}">${UI.formatDate(a.appointment_date)} - ${a.type} (${a.status})</option>`).join('') : '');
      }

      // Fetch consultations
      const consults = await Api.get(`/consultations?patient_id=${patientId}`);
      const consultSelect = document.getElementById('rep-consultation-id');
      if (consultSelect) {
        consultSelect.innerHTML = '<option value="">None</option>' + 
          (consults.success ? consults.data.map(c => `<option value="${c.id}">${UI.formatDate(c.created_at)} - ${c.diagnosis || 'No Diagnosis'} (${c.status})</option>`).join('') : '');
      }

      // Fetch lab bookings
      const labs = await Api.get(`/lab-bookings?patient_id=${patientId}`);
      const labSelect = document.getElementById('rep-lab-booking-id');
      if (labSelect) {
        labSelect.innerHTML = '<option value="">None</option>' + 
          (labs.success ? labs.data.map(l => `<option value="${l.id}">${UI.formatDate(l.booking_date)} - ${l.test_name} (${l.status})</option>`).join('') : '');
      }
    } catch (e) {
      console.error('Failed to load patient care records:', e);
    }
  },

  async loadReportCategories() {
    try {
      const res = await Api.get('/reports/categories');
      const catSelect = document.getElementById('rep-category');
      if (catSelect && res.success) {
        catSelect.innerHTML = '<option value="">Select Category</option>' + 
          res.data.filter(c => c.is_active !== 0).map(c => `<option value="${c.category_name}">${c.category_name}</option>`).join('');
      }
    } catch (e) {
      console.error('Failed to load report categories:', e);
    }
  },

  async openUploadReportModal() {
    document.getElementById('upload-report-form').reset();
    document.getElementById('rep-id').value = '';
    document.getElementById('btn-save-report').textContent = 'Upload & Save Report';
    document.getElementById('rep-file-group').style.display = 'block';
    document.getElementById('rep-file').required = true;
    document.getElementById('rep-shared').checked = true;

    // Load categories
    await this.loadReportCategories();

    // Populate associated patients selector options
    try {
      const patRes = await Api.get('/patients');
      const patSelect = document.getElementById('rep-patient-id');
      if (patSelect && patRes.success) {
        patSelect.innerHTML = patRes.data.map(p => `<option value="${p.id}">${p.full_name} (${p.email})</option>`).join('');
        if (patRes.data.length > 0) {
          await this.loadPatientCareRecords(patRes.data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }

    UI.openModal('upload-report-modal');
  },

  async openEditReportModal(id, title, type, category, notes, isShared, patientId, apptId, consultId, labId) {
    document.getElementById('upload-report-form').reset();
    document.getElementById('rep-id').value = id;
    document.getElementById('rep-title').value = title;
    document.getElementById('rep-type').value = type;
    document.getElementById('rep-notes').value = notes && notes !== 'undefined' ? notes : '';
    document.getElementById('rep-shared').checked = isShared === 1 || isShared === true;
    document.getElementById('btn-save-report').textContent = 'Update Report';
    document.getElementById('rep-file-group').style.display = 'none';
    document.getElementById('rep-file').required = false;

    // Load categories
    await this.loadReportCategories();
    document.getElementById('rep-category').value = category || '';

    // Retrieve patients
    try {
      const patRes = await Api.get('/patients');
      const patSelect = document.getElementById('rep-patient-id');
      if (patSelect && patRes.success) {
        patSelect.innerHTML = patRes.data.map(p => `<option value="${p.id}">${p.full_name} (${p.email})</option>`).join('');
        if (patientId) {
          patSelect.value = patientId;
          await this.loadPatientCareRecords(patientId);
          if (apptId) document.getElementById('rep-appointment-id').value = apptId;
          if (consultId) document.getElementById('rep-consultation-id').value = consultId;
          if (labId) document.getElementById('rep-lab-booking-id').value = labId;
        }
      }
    } catch (e) {
      console.error(e);
    }

    UI.openModal('upload-report-modal');
  },

  async submitReport() {
    try {
      const reportId = document.getElementById('rep-id').value;
      UI.showLoader();

      const category = document.getElementById('rep-category').value;
      const isShared = document.getElementById('rep-shared').checked ? 1 : 0;
      const apptId = document.getElementById('rep-appointment-id').value;
      const consultId = document.getElementById('rep-consultation-id').value;
      const labId = document.getElementById('rep-lab-booking-id').value;

      if (reportId) {
        // Update report (JSON body)
        const data = {
          title: document.getElementById('rep-title').value,
          report_type: document.getElementById('rep-type').value,
          category: category,
          is_shared_with_patient: isShared,
          appointment_id: apptId ? parseInt(apptId) : null,
          consultation_id: consultId ? parseInt(consultId) : null,
          lab_booking_id: labId ? parseInt(labId) : null,
          notes: document.getElementById('rep-notes').value,
        };
        const res = await Api.put(`/reports/${reportId}`, data);
        if (res.success) {
          UI.showToast('Report updated successfully.', 'success');
          UI.closeModal('upload-report-modal');
          this.loadReports();
        }
      } else {
        // Upload report (FormData body)
        const fileInput = document.getElementById('rep-file');
        if (fileInput.files.length === 0) {
          UI.showToast('Please select a file to upload.', 'warning');
          return;
        }

        const formData = new FormData();
        formData.append('patient_id', document.getElementById('rep-patient-id').value);
        formData.append('report_type', document.getElementById('rep-type').value);
        formData.append('title', document.getElementById('rep-title').value);
        formData.append('category', category);
        formData.append('is_shared_with_patient', isShared);
        if (apptId) formData.append('appointment_id', apptId);
        if (consultId) formData.append('consultation_id', consultId);
        if (labId) formData.append('lab_booking_id', labId);
        formData.append('notes', document.getElementById('rep-notes').value);
        formData.append('file', fileInput.files[0]);

        const res = await Api.upload('/reports', formData);
        if (res.success) {
          UI.showToast('Report uploaded successfully.', 'success');
          UI.closeModal('upload-report-modal');
          this.loadReports();
        }
      }
    } catch (error) {
      UI.showToast(error.message || 'Report action failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async deleteReport(id) {
    if (!confirm('Are you sure you want to delete this medical report? This cannot be undone.')) return;
    try {
      UI.showLoader();
      const res = await Api.delete(`/reports/${id}`);
      if (res.success) {
        UI.showToast('Report deleted successfully.', 'success');
        this.loadReports();
      }
    } catch (error) {
      UI.showToast(error.message || 'Deletions failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  // ==================== 9. NOTIFICATIONS ====================
  async loadNotifications() {
    try {
      const searchVal = document.getElementById('notif-search')?.value || '';
      const typeVal = document.getElementById('notif-filter-type')?.value || '';
      const res = await Api.get(`/notifications?search=${encodeURIComponent(searchVal)}&type=${typeVal}&limit=50`);
      const container = document.getElementById('notifications-list');
      if (!container || !res.success) return;

      if (res.data.length === 0) {
        container.innerHTML = UI.emptyState('bell', 'No Notifications', 'No notifications match search and filter.');
        return;
      }

      container.innerHTML = `<ul class="activity-list">
        ${res.data.map(n => `
          <li class="activity-item ${n.is_read ? '' : 'notif-unread'}" style="padding: 15px; border-bottom: 1px solid var(--border-color); ${n.is_read ? '' : 'background-color: var(--bg-hover);'}">
            <span class="activity-item__dot ${n.is_read ? 'activity-item__dot--secondary' : 'activity-item__dot--primary'}"></span>
            <div class="activity-item__content d-flex justify-between items-center flex-wrap gap-2 w-100">
              <div>
                <div class="activity-item__text"><strong>${n.title}</strong> — ${n.message}</div>
                <div class="activity-item__time">${UI.formatDate(n.created_at)}</div>
              </div>
              <div>
                ${n.is_read ? '' : `<button class="btn btn--sm btn--ghost" onclick="DoctorDashboard.markNotificationRead(${n.id})">Mark Read</button>`}
              </div>
            </div>
          </li>
        `).join('')}
      </ul>`;
    } catch (error) {
      UI.showToast('Failed to load notifications.', 'error');
    }
  },

  async markNotificationRead(id) {
    try {
      const res = await Api.patch(`/notifications/${id}/read`);
      if (res.success) {
        this.loadNotifications();
        this.loadOverview();
      }
    } catch (e) {
      console.error(e);
    }
  },

  async markAllNotificationsRead() {
    try {
      UI.showLoader();
      const res = await Api.post('/notifications/read-all');
      if (res.success) {
        UI.showToast('All notifications marked as read.', 'success');
        this.loadNotifications();
        this.loadOverview();
      }
    } catch (e) {
      UI.showToast('Failed to clear notifications.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  // ==================== 10. PROFILE SETTINGS ====================
  loadProfileForm() {
    if (!this.currentDoctor) return;
    document.getElementById('prof-name').value = this.currentDoctor.full_name || '';
    document.getElementById('prof-phone').value = this.currentDoctor.phone || '';
    document.getElementById('prof-spec').value = this.currentDoctor.specialization || '';
    document.getElementById('prof-qual').value = this.currentDoctor.qualification || '';
    document.getElementById('prof-exp').value = this.currentDoctor.experience_years || 0;
    document.getElementById('prof-avatar').value = this.currentDoctor.avatar_url || '';
    document.getElementById('prof-bio').value = this.currentDoctor.bio || '';
  },

  async submitProfile() {
    try {
      const data = {
        full_name: document.getElementById('prof-name').value,
        phone: document.getElementById('prof-phone').value,
        specialization: document.getElementById('prof-spec').value,
        qualification: document.getElementById('prof-qual').value,
        experience_years: parseInt(document.getElementById('prof-exp').value) || 0,
        avatar_url: document.getElementById('prof-avatar').value,
        bio: document.getElementById('prof-bio').value,
      };

      UI.showLoader();
      const res = await Api.put(`/doctors/${this.currentDoctor.id}`, data);
      if (res.success) {
        UI.showToast('Profile settings saved successfully.', 'success');
        await this.fetchDoctorProfile();
        this.loadProfileForm();
      }
    } catch (error) {
      UI.showToast(error.message || 'Saving profile failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  }
};
