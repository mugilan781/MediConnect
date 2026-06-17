// ============================================================
// MediConnect – public/js/consultations.js
// Consultation requests & records management UI logic
// ============================================================

const Consultations = {
  currentPage: 1,
  userRole: 'patient',

  async init() {
    const user = Auth.getUser();
    this.userRole = user?.role || 'patient';

    // Show request button and load doctors only for patient
    if (this.userRole === 'patient') {
      const btn = document.getElementById('btn-request-consultation');
      if (btn) btn.style.display = 'block';
      await this.loadDoctors();
      
      const dateInput = document.getElementById('request-date');
      if (dateInput) {
        dateInput.value = '';
        dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
      }
    }

    await this.loadConsultations();
    this.bindEvents();
  },

  bindEvents() {
    // Status filter
    const statusFilter = document.getElementById('filter-consultation-status');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.currentPage = 1;
        this.loadConsultations();
      });
    }

    // Patient: Submit request form
    const requestForm = document.getElementById('request-consultation-form');
    if (requestForm) {
      requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.submitRequest();
      });
    }

    // Doctor: Submit reject request form
    const rejectForm = document.getElementById('reject-consultation-form');
    if (rejectForm) {
      rejectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.submitReject();
      });
    }

    // Doctor: Submit schedule form
    const scheduleForm = document.getElementById('schedule-consultation-form');
    if (scheduleForm) {
      scheduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.submitSchedule();
      });
    }

    // Doctor: Submit complete form
    const completeForm = document.getElementById('complete-consultation-form');
    if (completeForm) {
      completeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.submitComplete();
      });
    }
  },

  /**
   * Load doctors for Patient Request Form dropdown
   */
  async loadDoctors() {
    try {
      const response = await Api.get('/doctors?limit=100&is_available=1');
      const select = document.getElementById('request-doctor');
      if (!select || !response.success) return;

      select.innerHTML = '<option value="">Select a Doctor</option>';
      response.data.forEach(doc => {
        select.innerHTML += `<option value="${doc.id}">${doc.full_name} — ${doc.specialization}</option>`;
      });
    } catch (error) {
      console.error('Failed to load doctors for request form:', error);
    }
  },

  /**
   * Submit patient request
   */
  async submitRequest() {
    try {
      const data = {
        doctor_id: parseInt(document.getElementById('request-doctor').value, 10),
        preferred_date: document.getElementById('request-date').value,
        symptoms: document.getElementById('request-symptoms').value,
        health_concerns: document.getElementById('request-concerns').value || null,
        additional_notes: document.getElementById('request-notes').value || null,
      };

      if (!data.doctor_id || !data.preferred_date || !data.symptoms) {
        UI.showToast('Please fill in all required fields.', 'warning');
        return;
      }

      UI.showLoader();
      const response = await Api.post('/consultations', data);
      if (response.success) {
        UI.showToast('Consultation request submitted successfully!', 'success');
        UI.closeModal('request-consultation-modal');
        document.getElementById('request-consultation-form').reset();
        await this.loadConsultations();
      } else {
        UI.showToast(response.message || 'Failed to submit request.', 'error');
      }
    } catch (error) {
      UI.showToast(error.message || 'Failed to submit request.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Load consultations list table
   */
  async loadConsultations() {
    try {
      const statusFilter = document.getElementById('filter-consultation-status')?.value || '';
      let url = `/consultations?page=${this.currentPage}&limit=${CONFIG.DEFAULT_PAGE_SIZE}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const response = await Api.get(url);
      const container = document.getElementById('consultations-list');
      if (!container || !response.success) return;

      if (response.data.length === 0) {
        container.innerHTML = UI.emptyState('clipboard', 'No Consultations', 'No consultation records or requests found.');
        const pagContainer = document.getElementById('consultations-pagination');
        if (pagContainer) pagContainer.innerHTML = '';
        return;
      }

      container.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date Details</th>
                <th>Doctor / Patient</th>
                <th>Primary Symptoms</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${response.data.map(c => {
                let dateDisplay = '';
                if (c.status === 'requested') {
                  dateDisplay = `<span>Pref: <strong>${UI.formatDate(c.preferred_date)}</strong></span>`;
                } else if (c.consultation_date) {
                  dateDisplay = `<span>Sched: <strong>${UI.formatDate(c.consultation_date)}</strong></span><br><span class="text-muted text-sm">${UI.formatTime(c.consultation_time)} (${c.duration}m)</span>`;
                } else {
                  dateDisplay = `<span>Created: <strong>${UI.formatDate(c.created_at)}</strong></span>`;
                }

                return `
                  <tr>
                    <td>${dateDisplay}</td>
                    <td>
                      <strong>${this.userRole === 'patient' ? c.doctor_name : c.patient_name}</strong>
                      ${c.specialization && this.userRole === 'patient' ? `<br><span class="text-muted text-sm">${c.specialization}</span>` : ''}
                    </td>
                    <td class="truncate" style="max-width:220px;" title="${c.symptoms || ''}">${c.symptoms || '—'}</td>
                    <td>${UI.statusBadge(c.status || 'completed')}</td>
                    <td>
                      <div class="d-flex gap-2">
                        <button class="btn btn--sm btn--ghost" onclick="Consultations.viewDetails(${c.id})">View</button>
                        ${this.renderActionButtons(c)}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

      const pagContainer = document.getElementById('consultations-pagination');
      if (pagContainer) {
        pagContainer.innerHTML = UI.renderPagination(response.pagination, 'Consultations.goToPage');
      }
    } catch (error) {
      UI.showToast('Failed to load consultations list.', 'error');
    }
  },

  /**
   * Helper to render custom status-dependent buttons
   */
  renderActionButtons(c) {
    if (this.userRole === 'patient') {
      if (c.status === 'requested') {
        return `<button class="btn btn--sm btn--danger" onclick="Consultations.cancelRequest(${c.id})">Cancel</button>`;
      }
    } else if (this.userRole === 'doctor') {
      if (c.status === 'requested') {
        return `
          <button class="btn btn--sm btn--primary" onclick="Consultations.acceptRequest(${c.id})">Accept</button>
          <button class="btn btn--sm btn--danger" onclick="Consultations.openRejectModal(${c.id})">Decline</button>
        `;
      } else if (c.status === 'accepted') {
        return `<button class="btn btn--sm btn--primary" onclick="Consultations.openScheduleModal(${c.id})">Schedule</button>`;
      } else if (c.status === 'scheduled') {
        return `
          <button class="btn btn--sm btn--primary" onclick="Consultations.startConsultation(${c.id})">Start Video</button>
          <button class="btn btn--sm btn--secondary" onclick="Consultations.openScheduleModal(${c.id})">Reschedule</button>
        `;
      } else if (c.status === 'in_progress') {
        return `<button class="btn btn--sm btn--primary" onclick="Consultations.openCompleteModal(${c.id})">Complete</button>`;
      }
    } else if (this.userRole === 'admin') {
      if (!['completed', 'cancelled', 'rejected'].includes(c.status)) {
        return `<button class="btn btn--sm btn--danger" onclick="Consultations.cancelRequest(${c.id})">Override Cancel</button>`;
      }
    }
    return '';
  },

  /**
   * Cancel request (Patient/Admin)
   */
  async cancelRequest(id) {
    if (!confirm('Are you sure you want to cancel this consultation request?')) return;
    try {
      UI.showLoader();
      const response = await Api.put(`/consultations/${id}/cancel`, {});
      if (response.success) {
        UI.showToast('Consultation cancelled successfully.', 'success');
        await this.loadConsultations();
      }
    } catch (error) {
      UI.showToast(error.message || 'Failed to cancel request.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Accept request (Doctor)
   */
  async acceptRequest(id) {
    try {
      UI.showLoader();
      const response = await Api.put(`/consultations/${id}/accept`, {});
      if (response.success) {
        UI.showToast('Consultation accepted! Please schedule date/time next.', 'success');
        await this.loadConsultations();
      }
    } catch (error) {
      UI.showToast(error.message || 'Failed to accept request.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Reject request modals and triggers (Doctor)
   */
  openRejectModal(id) {
    document.getElementById('reject-consultation-id').value = id;
    document.getElementById('reject-reason').value = '';
    UI.openModal('reject-consultation-modal');
  },

  async submitReject() {
    try {
      const id = document.getElementById('reject-consultation-id').value;
      const data = { reason: document.getElementById('reject-reason').value };
      if (!data.reason) {
        UI.showToast('Please provide a reason for declining.', 'warning');
        return;
      }

      UI.showLoader();
      const response = await Api.put(`/consultations/${id}/reject`, data);
      if (response.success) {
        UI.showToast('Request declined successfully.', 'success');
        UI.closeModal('reject-consultation-modal');
        await this.loadConsultations();
      }
    } catch (error) {
      UI.showToast(error.message || 'Failed to decline request.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Scheduling modals and triggers (Doctor)
   */
  openScheduleModal(id) {
    document.getElementById('schedule-consultation-id').value = id;
    document.getElementById('schedule-date').value = '';
    document.getElementById('schedule-time').value = '';
    document.getElementById('schedule-duration').value = '30';
    document.getElementById('schedule-notes').value = '';
    
    const dateInput = document.getElementById('schedule-date');
    if (dateInput) {
      dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
    }
    UI.openModal('schedule-consultation-modal');
  },

  async submitSchedule() {
    try {
      const id = document.getElementById('schedule-consultation-id').value;
      const data = {
        consultation_date: document.getElementById('schedule-date').value,
        consultation_time: document.getElementById('schedule-time').value,
        duration: parseInt(document.getElementById('schedule-duration').value, 10),
        notes: document.getElementById('schedule-notes').value || null,
      };

      if (!data.consultation_date || !data.consultation_time) {
        UI.showToast('Please provide a valid date and start time.', 'warning');
        return;
      }

      UI.showLoader();
      const response = await Api.put(`/consultations/${id}/schedule`, data);
      if (response.success) {
        UI.showToast('Consultation session scheduled.', 'success');
        UI.closeModal('schedule-consultation-modal');
        await this.loadConsultations();
      }
    } catch (error) {
      UI.showToast(error.message || 'Failed to save schedule.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Start video session (Doctor)
   */
  async startConsultation(id) {
    try {
      UI.showLoader();
      const response = await Api.put(`/consultations/${id}/start`, {});
      if (response.success) {
        UI.showToast('Consultation started! Live session in progress.', 'success');
        await this.loadConsultations();
      }
    } catch (error) {
      UI.showToast(error.message || 'Failed to start consultation.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Completion modals and triggers (Doctor)
   */
  openCompleteModal(id) {
    document.getElementById('complete-consultation-id').value = id;
    document.getElementById('complete-diagnosis').value = '';
    document.getElementById('complete-recommendations').value = '';
    document.getElementById('complete-prescription').value = '';
    document.getElementById('complete-followup').value = '';
    UI.openModal('complete-consultation-modal');
  },

  async submitComplete() {
    try {
      const id = document.getElementById('complete-consultation-id').value;
      const data = {
        diagnosis: document.getElementById('complete-diagnosis').value,
        recommendations: document.getElementById('complete-recommendations').value || null,
        prescription_notes: document.getElementById('complete-prescription').value || null,
        follow_up_date: document.getElementById('complete-followup').value || null,
      };

      if (!data.diagnosis) {
        UI.showToast('Please provide a diagnosis to complete the consultation.', 'warning');
        return;
      }

      UI.showLoader();
      const response = await Api.put(`/consultations/${id}/complete`, data);
      if (response.success) {
        UI.showToast('Consultation completed and clinical notes saved!', 'success');
        UI.closeModal('complete-consultation-modal');
        await this.loadConsultations();
      }
    } catch (error) {
      UI.showToast(error.message || 'Failed to complete consultation.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * View details in modal
   */
  async viewDetails(id) {
    try {
      UI.showLoader();
      const response = await Api.get(`/consultations/${id}`);
      if (!response.success) return;
      const c = response.data;

      const detailsEl = document.getElementById('consultation-details');
      if (detailsEl) {
        let scheduleInfo = 'Not Scheduled';
        if (c.consultation_date) {
          scheduleInfo = `${MediIcons.icon('calendar')} ${UI.formatDate(c.consultation_date)} at ${UI.formatTime(c.consultation_time)} (${c.duration} mins)`;
        }

        detailsEl.innerHTML = `
          <div class="detail-grid">
            <div class="detail-group">
              <div class="detail-label">Doctor</div>
              <div class="detail-value">${c.doctor_name}</div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Specialization</div>
              <div class="detail-value">${c.specialization || '—'}</div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Patient</div>
              <div class="detail-value">${c.patient_name}</div>
            </div>
            <div class="detail-group">
              <div class="detail-label">Status</div>
              <div class="detail-value">${UI.statusBadge(c.status || 'completed')}</div>
            </div>
            <div class="detail-group detail-group--full">
              <div class="detail-label">Schedule Info</div>
              <div class="detail-value"><strong>${scheduleInfo}</strong></div>
            </div>
            ${c.preferred_date ? `
              <div class="detail-group">
                <div class="detail-label">Preferred Date</div>
                <div class="detail-value">${UI.formatDate(c.preferred_date)}</div>
              </div>
            ` : ''}
            ${c.follow_up_date ? `
              <div class="detail-group">
                <div class="detail-label">Follow-up Date</div>
                <div class="detail-value">${UI.formatDate(c.follow_up_date)}</div>
              </div>
            ` : ''}
            <div class="detail-group detail-group--full">
              <div class="detail-label">Symptoms / Patient Concerns</div>
              <div class="detail-value">${c.symptoms || '—'}</div>
            </div>
            ${c.health_concerns ? `
              <div class="detail-group detail-group--full">
                <div class="detail-label">Chronic Health Concerns</div>
                <div class="detail-value">${c.health_concerns}</div>
              </div>
            ` : ''}
            ${c.additional_notes ? `
              <div class="detail-group detail-group--full">
                <div class="detail-label">Additional Request Notes</div>
                <div class="detail-value">${c.additional_notes}</div>
              </div>
            ` : ''}
            ${c.scheduled_notes ? `
              <div class="detail-group detail-group--full">
                <div class="detail-label">Scheduling Notes / Meeting Link</div>
                <div class="detail-value">${c.scheduled_notes}</div>
              </div>
            ` : ''}

            <!-- Clinical Notes section if completed -->
            ${c.status === 'completed' ? `
              <div class="detail-group detail-group--full" style="border-top: 1px dashed var(--color-border); padding-top: var(--space-4); margin-top: var(--space-4);">
                <h4 style="color:var(--color-primary-dark);margin-bottom:var(--space-2);">Clinical Prescription & Diagnosis</h4>
              </div>
              <div class="detail-group detail-group--full">
                <div class="detail-label">Diagnosis</div>
                <div class="detail-value"><strong>${c.notes_diagnosis || c.diagnosis || '—'}</strong></div>
              </div>
              ${c.recommendations ? `
                <div class="detail-group detail-group--full">
                  <div class="detail-label">Doctor Recommendations</div>
                  <div class="detail-value">${c.recommendations}</div>
                </div>
              ` : ''}
              ${c.prescription_notes || c.prescription ? `
                <div class="detail-group detail-group--full">
                  <div class="detail-label">Prescription (Rx)</div>
                  <div class="detail-value" style="background:#f0fcf9;border:1px solid #d0f3eb;padding:12px;border-radius:6px;font-family:monospace;white-space:pre-wrap;">${c.prescription_notes || c.prescription}</div>
                </div>
              ` : ''}
              ${c.follow_up_advice ? `
                <div class="detail-group detail-group--full">
                  <div class="detail-label">Follow-up Advice</div>
                  <div class="detail-value">${c.follow_up_advice}</div>
                </div>
              ` : ''}
            ` : ''}
          </div>
        `;
      }
      UI.openModal('consultation-detail-modal');
    } catch (error) {
      console.error(error);
      UI.showToast('Failed to load details.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  goToPage(page) {
    this.currentPage = page;
    this.loadConsultations();
  },
};
