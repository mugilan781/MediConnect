// ============================================================
// MediConnect – public/js/doctors.js
// Doctor search directory and slot-booking driver logic
// ============================================================

const Doctors = {
  currentPage: 1,
  searchDebounce: null,
  selectedDoctorId: null,

  /**
   * Initialize the Find a Doctor page
   */
  async init() {
    this.bindEvents();
    await this.loadDoctors();
  },

  /**
   * Bind event listeners for searching, filtering and booking
   */
  bindEvents() {
    // Search input with debounce
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

    // Specialization filter change
    const specFilter = document.getElementById('filter-specialization');
    if (specFilter) {
      specFilter.addEventListener('change', () => {
        this.currentPage = 1;
        this.loadDoctors();
      });
    }

    // Date change listener inside booking modal
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        const date = dateInput.value;
        if (this.selectedDoctorId && date) {
          this.loadAvailableSlots(this.selectedDoctorId, date);
        }
      });
    }

    // Booking form submission
    const form = document.getElementById('booking-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.bookAppointment();
      });
    }
  },

  /**
   * Load and render list of doctors
   */
  async loadDoctors() {
    try {
      const searchVal = document.getElementById('search-doctors')?.value || '';
      const specFilter = document.getElementById('filter-specialization')?.value || '';
      
      let url = `/doctors?page=${this.currentPage}&limit=12&is_available=1`;
      if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
      if (specFilter) url += `&specialization=${encodeURIComponent(specFilter)}`;

      const grid = document.getElementById('doctors-grid');
      if (!grid) return;

      const response = await Api.get(url);
      if (!response.success) {
        grid.innerHTML = '<div class="empty-state">Failed to load doctors.</div>';
        return;
      }

      const doctors = response.data;
      if (doctors.length === 0) {
        grid.innerHTML = UI.emptyState('🔍', 'No Doctors Found', 'Try expanding your search or selecting a different specialization.');
        document.getElementById('doctors-pagination').innerHTML = '';
        return;
      }

      grid.innerHTML = doctors.map(doc => {
        const initial = doc.full_name ? doc.full_name.charAt(0).toUpperCase() : 'D';
        return `
          <div class="doctor-card">
            <div>
              <div class="doctor-card__header">
                <div class="doctor-card__avatar">${initial}</div>
                <div class="doctor-card__info">
                  <h3 class="doctor-card__name">${doc.full_name}</h3>
                  <div class="doctor-card__spec">${doc.specialization}</div>
                </div>
              </div>
              <div class="doctor-card__meta">
                <span>🎓 <strong>Qual:</strong> ${doc.qualification}</span>
                <span>💼 <strong>Experience:</strong> ${doc.experience_years} years</span>
                <span>⭐ <strong>License:</strong> ${doc.license_number}</span>
              </div>
            </div>
            <div class="doctor-card__footer">
              <span class="doctor-card__fee">₹${parseFloat(doc.consultation_fee).toFixed(2)}</span>
              <button class="btn btn--primary btn--sm" onclick="Doctors.openBookingModal(${doc.id})">Book Appointment</button>
            </div>
          </div>
        `;
      }).join('');

      // Render pagination
      const pagContainer = document.getElementById('doctors-pagination');
      if (pagContainer && response.pagination) {
        pagContainer.innerHTML = UI.renderPagination(response.pagination, 'Doctors.goToPage');
      }
    } catch (error) {
      console.error('Failed to load doctors:', error);
      UI.showToast('Failed to load doctor directory.', 'error');
    }
  },

  /**
   * Open booking modal for a specific doctor
   */
  async openBookingModal(doctorId) {
    try {
      UI.showLoader();
      const response = await Api.get(`/doctors/${doctorId}`);
      if (!response.success) {
        UI.showToast('Failed to load doctor profile.', 'error');
        return;
      }

      const doc = response.data;
      this.selectedDoctorId = doctorId;

      // Reset form fields
      document.getElementById('booking-doctor-id').value = doctorId;
      document.getElementById('booking-time').value = '';
      document.getElementById('booking-reason').value = '';
      document.getElementById('booking-slots').innerHTML = '<p class="text-muted text-sm">Please select a date to view available time slots.</p>';

      // Set min date to today
      const dateInput = document.getElementById('booking-date');
      if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = '';
        dateInput.setAttribute('min', today);
      }

      // Populate doctor profile details
      const detailContainer = document.getElementById('doctor-profile-detail');
      if (detailContainer) {
        const initial = doc.full_name ? doc.full_name.charAt(0).toUpperCase() : 'D';
        detailContainer.innerHTML = `
          <div class="doctor-detail-header">
            <div class="doctor-detail-avatar">${initial}</div>
            <div>
              <h3 style="margin: 0; color: var(--color-gray-800);">${doc.full_name}</h3>
              <p style="margin: var(--space-1) 0; color: var(--color-primary); font-weight: 600;">${doc.specialization}</p>
              <p style="margin: 0; font-size: var(--font-size-sm); color: var(--color-text-light);">${doc.qualification}</p>
            </div>
          </div>
          <div style="background: var(--color-gray-50); padding: var(--space-4); border-radius: var(--radius-md); font-size: var(--font-size-sm); margin-bottom: var(--space-4);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span class="text-muted">Experience:</span>
              <span style="font-weight: 600; color: var(--color-gray-800);">${doc.experience_years} Years</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span class="text-muted">Consultation Fee:</span>
              <span style="font-weight: 600; color: var(--color-gray-800);">₹${parseFloat(doc.consultation_fee).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span class="text-muted">Doctor Availability Days:</span>
              <span style="font-weight: 600; color: var(--color-primary);">${doc.available_days || 'Mon, Tue, Wed, Thu, Fri'}</span>
            </div>
          </div>
        `;
      }

      UI.openModal('book-modal');
    } catch (error) {
      console.error('Failed to open booking modal:', error);
      UI.showToast('An error occurred opening the profile.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Load slots dynamically based on doctor and date
   */
  async loadAvailableSlots(doctorId, date) {
    try {
      const slotsContainer = document.getElementById('booking-slots');
      if (!slotsContainer) return;

      slotsContainer.innerHTML = '<div class="spinner spinner--sm"></div>';

      const response = await Api.get(`/doctors/${doctorId}/slots?date=${date}`);
      if (!response.success) {
        slotsContainer.innerHTML = '<p class="text-danger text-sm">Failed to load available slots.</p>';
        return;
      }

      const { availableSlots } = response.data;
      if (!availableSlots || availableSlots.length === 0) {
        slotsContainer.innerHTML = '<p class="text-warning text-sm">No available time slots found for this date. (Doctor may be off-duty or fully booked).</p>';
        return;
      }

      slotsContainer.innerHTML = availableSlots.map(slot => {
        return `
          <button type="button" class="btn btn--sm btn--secondary slot-btn"
                  data-time="${slot}" onclick="Doctors.selectSlot(this)">
            ${UI.formatTime(slot)}
          </button>
        `;
      }).join('');
    } catch (error) {
      console.error('Failed to load slots:', error);
      document.getElementById('booking-slots').innerHTML = '<p class="text-danger text-sm">Error loading slots.</p>';
    }
  },

  /**
   * Select a slot button
   */
  selectSlot(btn) {
    document.querySelectorAll('.slot-btn').forEach(b => {
      b.classList.remove('btn--primary');
      b.classList.add('btn--secondary');
    });
    btn.classList.remove('btn--secondary');
    btn.classList.add('btn--primary');
    document.getElementById('booking-time').value = btn.dataset.time;
  },

  /**
   * Book an appointment
   */
  async bookAppointment() {
    try {
      const data = {
        doctor_id: parseInt(document.getElementById('booking-doctor-id').value),
        appointment_date: document.getElementById('booking-date').value,
        appointment_time: document.getElementById('booking-time').value,
        type: document.getElementById('booking-type').value,
        reason: document.getElementById('booking-reason').value,
      };

      if (!data.doctor_id || !data.appointment_date || !data.appointment_time) {
        UI.showToast('Please select a valid date and available time slot.', 'warning');
        return;
      }

      UI.showLoader();
      const response = await Api.post('/appointments', data);
      if (response.success) {
        UI.showToast('Appointment booked successfully!', 'success');
        UI.closeModal('book-modal');
        // Redirect to appointments list page or load doctors again
        setTimeout(() => {
          window.location.href = '/appointments.html';
        }, 1500);
      } else {
        UI.showToast(response.message || 'Failed to book appointment.', 'error');
      }
    } catch (error) {
      console.error('Booking failed:', error);
      UI.showToast(error.message || 'Failed to book appointment.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Paginate list
   */
  goToPage(page) {
    this.currentPage = page;
    this.loadDoctors();
  },
};
