// ============================================================
// MediConnect – public/js/appointments.js
// Appointment CRUD UI logic with interactive rescheduling
// ============================================================

const Appointments = {
  currentPage: 1,
  searchDebounce: null,

  /**
   * Initialize the appointments page
   */
  async init() {
    await this.loadDoctors();
    await this.loadAppointments();
    this.bindEvents();
  },

  /**
   * Bind form and filter events
   */
  bindEvents() {
    const form = document.getElementById('book-appointment-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.bookAppointment();
      });
    }

    const doctorSelect = document.getElementById('appt-doctor');
    const dateInput = document.getElementById('appt-date');
    if (doctorSelect && dateInput) {
      const loadSlots = () => {
        if (doctorSelect.value && dateInput.value) {
          this.loadAvailableSlots(doctorSelect.value, dateInput.value);
        }
      };
      doctorSelect.addEventListener('change', loadSlots);
      dateInput.addEventListener('change', loadSlots);
    }

    const statusFilter = document.getElementById('filter-status');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.currentPage = 1;
        this.loadAppointments();
      });
    }

    // Search input with debounce
    const searchInput = document.getElementById('search-appointments');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(this.searchDebounce);
        this.searchDebounce = setTimeout(() => {
          this.currentPage = 1;
          this.loadAppointments();
        }, 400);
      });
    }

    // Reschedule form bindings
    const rescheduleForm = document.getElementById('reschedule-appointment-form');
    if (rescheduleForm) {
      rescheduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.submitReschedule();
      });
    }

    const rescheduleDate = document.getElementById('reschedule-date');
    if (rescheduleDate) {
      rescheduleDate.addEventListener('change', () => {
        const doctorId = document.getElementById('reschedule-doctor-id').value;
        const date = rescheduleDate.value;
        if (doctorId && date) {
          this.loadRescheduleSlots(doctorId, date);
        }
      });
    }
  },

  /**
   * Load doctors for the booking dropdown
   */
  async loadDoctors() {
    try {
      const response = await Api.get('/doctors?limit=100');
      const select = document.getElementById('appt-doctor');
      if (!select || !response.success) return;

      select.innerHTML = '<option value="">Select a Doctor</option>';
      response.data.forEach(doc => {
        select.innerHTML += `<option value="${doc.id}">${doc.full_name} — ${doc.specialization}</option>`;
      });
    } catch (error) {
      console.error('Failed to load doctors:', error);
    }
  },

  /**
   * Load available slots for selected doctor & date
   */
  async loadAvailableSlots(doctorId, date) {
    try {
      const response = await Api.get(`/doctors/${doctorId}/slots?date=${date}`);
      const container = document.getElementById('time-slots');
      if (!container || !response.success) return;

      const { availableSlots } = response.data;
      if (!availableSlots || availableSlots.length === 0) {
        container.innerHTML = '<p class="text-warning text-sm">No available slots for this date.</p>';
        return;
      }

      container.innerHTML = availableSlots.map(slot => {
        return `<button type="button" class="btn btn--sm btn--secondary slot-btn"
                  data-time="${slot}" onclick="Appointments.selectSlot(this)">
                  ${UI.formatTime(slot)}
                </button>`;
      }).join('');
    } catch (error) {
      console.error('Failed to load slots:', error);
    }
  },

  /**
   * Select a time slot
   */
  selectSlot(btn) {
    document.querySelectorAll('.slot-btn').forEach(b => {
      b.classList.remove('btn--primary');
      b.classList.add('btn--secondary');
    });
    btn.classList.remove('btn--secondary');
    btn.classList.add('btn--primary');
    document.getElementById('appt-time').value = btn.dataset.time;
  },

  /**
   * Book an appointment
   */
  async bookAppointment() {
    try {
      const data = {
        doctor_id: parseInt(document.getElementById('appt-doctor').value),
        appointment_date: document.getElementById('appt-date').value,
        appointment_time: document.getElementById('appt-time').value,
        type: document.getElementById('appt-type')?.value || 'in_person',
        reason: document.getElementById('appt-reason')?.value || '',
      };

      if (!data.doctor_id || !data.appointment_date || !data.appointment_time) {
        UI.showToast('Please select a doctor, date, and time slot.', 'warning');
        return;
      }

      UI.showLoader();
      const response = await Api.post('/appointments', data);
      if (response.success) {
        UI.showToast('Appointment booked successfully!', 'success');
        UI.closeModal('book-appointment-modal');
        document.getElementById('book-appointment-form').reset();
        document.getElementById('time-slots').innerHTML = '<p class="text-muted text-sm">Select a doctor and date to see available slots.</p>';
        await this.loadAppointments();
      }
    } catch (error) {
      UI.showToast(error.message || 'Failed to book appointment.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Load appointments list
   */
  async loadAppointments() {
    try {
      const statusFilter = document.getElementById('filter-status')?.value || '';
      const searchVal = document.getElementById('search-appointments')?.value || '';
      let url = `/appointments?page=${this.currentPage}&limit=${CONFIG.DEFAULT_PAGE_SIZE}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;

      const response = await Api.get(url);
      const container = document.getElementById('appointments-list');
      if (!container || !response.success) return;

      if (response.data.length === 0) {
        container.innerHTML = UI.emptyState('📅', 'No Appointments', 'No appointments found matching your criteria.');
        const pagContainer = document.getElementById('appointments-pagination');
        if (pagContainer) pagContainer.innerHTML = '';
        return;
      }

      container.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Doctor / Patient</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${response.data.map(appt => `
                <tr>
                  <td>
                    <strong>${UI.formatDate(appt.appointment_date)}</strong><br>
                    <span class="text-muted text-sm">${UI.formatTime(appt.appointment_time)}</span>
                  </td>
                  <td>
                    <strong>${appt.doctor_name || appt.patient_name}</strong>
                    ${appt.specialization ? `<br><span class="text-muted text-sm">${appt.specialization}</span>` : ''}
                  </td>
                  <td>${appt.type === 'teleconsult' ? '📹 Teleconsult' : '🏥 In-Person'}</td>
                  <td>${UI.statusBadge(appt.status)}</td>
                  <td>
                    <button class="btn btn--sm btn--ghost" style="margin-right: 4px;" onclick="Appointments.viewDetails(${appt.id})">View</button>
                    ${['pending', 'scheduled', 'confirmed', 'rescheduled'].includes(appt.status) ? `
                      <button class="btn btn--sm btn--secondary" style="margin-right: 4px;" onclick="Appointments.openRescheduleModal(${appt.id})">Reschedule</button>
                      <button class="btn btn--sm btn--danger" onclick="Appointments.cancel(${appt.id})">Cancel</button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      const pagContainer = document.getElementById('appointments-pagination');
      if (pagContainer) {
        pagContainer.innerHTML = UI.renderPagination(response.pagination, 'Appointments.goToPage');
      }
    } catch (error) {
      UI.showToast('Failed to load appointments.', 'error');
    }
  },

  /**
   * View appointment details in a modal
   */
  async viewDetails(id) {
    try {
      const response = await Api.get(`/appointments/${id}`);
      if (!response.success) return;
      const a = response.data;

      const detailsEl = document.getElementById('appointment-details');
      if (detailsEl) {
        detailsEl.innerHTML = `
          <div class="detail-grid">
            <div class="detail-group">
              <div class="detail-label">Doctor</div>
              <div class="detail-value">${a.doctor_name || '—'}</div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Specialization</div>
              <div class="detail-value">${a.specialization || '—'}</div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Date</div>
              <div class="detail-value">${UI.formatDate(a.appointment_date)}</div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Time</div>
              <div class="detail-value">${UI.formatTime(a.appointment_time)}</div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Type</div>
              <div class="detail-value">${a.type === 'teleconsult' ? '📹 Teleconsult' : '🏥 In-Person'}</div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Status</div>
              <div class="detail-value">${UI.statusBadge(a.status)}</div>
            </div>
            ${a.reason ? `<div class="detail-group detail-group--full"><div class="detail-label">Reason</div><div class="detail-value">${a.reason}</div></div>` : ''}
            ${a.notes ? `<div class="detail-group detail-group--full"><div class="detail-label">Notes</div><div class="detail-value">${a.notes}</div></div>` : ''}
            ${a.cancel_reason ? `<div class="detail-group detail-group--full"><div class="detail-label">Cancel Reason</div><div class="detail-value">${a.cancel_reason}</div></div>` : ''}
            <div class="detail-group">
              <div class="detail-label">Patient</div>
              <div class="detail-value">${a.patient_name || '—'}</div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Booked On</div>
              <div class="detail-value">${UI.formatDate(a.created_at)}</div>
            </div>
          </div>
        `;
      }
      UI.openModal('appointment-detail-modal');
    } catch (error) {
      UI.showToast('Failed to load details.', 'error');
    }
  },

  /**
   * Cancel an appointment
   */
  async cancel(id) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      UI.showLoader();
      await Api.delete(`/appointments/${id}`);
      UI.showToast('Appointment cancelled successfully.', 'success');
      await this.loadAppointments();
    } catch (error) {
      UI.showToast(error.message || 'Failed to cancel.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Open reschedule modal
   */
  async openRescheduleModal(id) {
    try {
      UI.showLoader();
      const response = await Api.get(`/appointments/${id}`);
      if (!response.success) {
        UI.showToast('Failed to load appointment details.', 'error');
        return;
      }
      const appt = response.data;
      document.getElementById('reschedule-appt-id').value = id;
      document.getElementById('reschedule-doctor-id').value = appt.doctor_id;
      document.getElementById('reschedule-time').value = '';
      document.getElementById('reschedule-reason').value = '';
      
      const dateInput = document.getElementById('reschedule-date');
      if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = '';
        dateInput.setAttribute('min', today);
      }
      document.getElementById('reschedule-time-slots').innerHTML = '<p class="text-muted text-sm">Please select a date to see available slots.</p>';
      UI.openModal('reschedule-appointment-modal');
    } catch (err) {
      console.error(err);
      UI.showToast('Failed to open reschedule window.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Load slots for reschedule dialog
   */
  async loadRescheduleSlots(doctorId, date) {
    try {
      const container = document.getElementById('reschedule-time-slots');
      if (!container) return;
      container.innerHTML = '<div class="spinner spinner--sm"></div>';

      const response = await Api.get(`/doctors/${doctorId}/slots?date=${date}`);
      if (!response.success) {
        container.innerHTML = '<p class="text-danger text-sm">Failed to load slots.</p>';
        return;
      }

      const { availableSlots } = response.data;
      if (!availableSlots || availableSlots.length === 0) {
        container.innerHTML = '<p class="text-warning text-sm">No available time slots found.</p>';
        return;
      }

      container.innerHTML = availableSlots.map(slot => {
        return `<button type="button" class="btn btn--sm btn--secondary slot-btn reschedule-slot-btn"
                  data-time="${slot}" onclick="Appointments.selectRescheduleSlot(this)">
                  ${UI.formatTime(slot)}
                </button>`;
      }).join('');
    } catch (error) {
      console.error(error);
      document.getElementById('reschedule-time-slots').innerHTML = '<p class="text-danger text-sm">Error loading slots.</p>';
    }
  },

  /**
   * Select a slot button in reschedule modal
   */
  selectRescheduleSlot(btn) {
    document.querySelectorAll('.reschedule-slot-btn').forEach(b => {
      b.classList.remove('btn--primary');
      b.classList.add('btn--secondary');
    });
    btn.classList.remove('btn--secondary');
    btn.classList.add('btn--primary');
    document.getElementById('reschedule-time').value = btn.dataset.time;
  },

  /**
   * Submit reschedule request
   */
  async submitReschedule() {
    try {
      const id = document.getElementById('reschedule-appt-id').value;
      const data = {
        appointment_date: document.getElementById('reschedule-date').value,
        appointment_time: document.getElementById('reschedule-time').value,
        reason: document.getElementById('reschedule-reason').value,
      };

      if (!data.appointment_date || !data.appointment_time) {
        UI.showToast('Please select a valid date and available time slot.', 'warning');
        return;
      }

      UI.showLoader();
      const response = await Api.put(`/appointments/${id}/reschedule`, data);
      if (response.success) {
        UI.showToast('Appointment rescheduled successfully!', 'success');
        UI.closeModal('reschedule-appointment-modal');
        await this.loadAppointments();
      } else {
        UI.showToast(response.message || 'Failed to reschedule.', 'error');
      }
    } catch (error) {
      UI.showToast(error.message || 'Failed to reschedule.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Paginate list
   */
  goToPage(page) {
    this.currentPage = page;
    this.loadAppointments();
  },
};
