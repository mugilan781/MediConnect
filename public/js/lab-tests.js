// ============================================================
// MediConnect – public/js/lab-tests.js
// Lab test catalog & booking UI
// ============================================================

const LabTests = {
  currentPage: 1,
  searchDebounce: null,

  async init() {
    await this.loadCategories();
    await this.loadTests();
    await this.loadBookings();
    this.bindEvents();
  },

  bindEvents() {
    // Search with debounce
    const searchInput = document.getElementById('lab-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(this.searchDebounce);
        this.searchDebounce = setTimeout(() => {
          this.currentPage = 1;
          this.loadTests();
        }, 400);
      });
    }

    // Category filter
    const catFilter = document.getElementById('lab-filter-category');
    if (catFilter) {
      catFilter.addEventListener('change', () => {
        this.currentPage = 1;
        this.loadTests();
      });
    }

    const form = document.getElementById('book-lab-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.bookTest();
      });
    }
  },

  async loadCategories() {
    try {
      const response = await Api.get('/lab-tests/categories');
      const select = document.getElementById('lab-filter-category');
      if (!select || !response.success) return;
      select.innerHTML = '<option value="">All Categories</option>' + response.data.map(cat => `
        <option value="${cat}">${cat}</option>
      `).join('');
    } catch (error) {
      console.error('Failed to load lab categories:', error);
    }
  },

  async loadTests() {
    try {
      const searchVal = document.getElementById('lab-search')?.value || '';
      const catFilter = document.getElementById('lab-filter-category')?.value || '';
      
      let url = `/lab-tests?limit=50&is_active=1`;
      if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
      if (catFilter) url += `&category=${encodeURIComponent(catFilter)}`;

      const response = await Api.get(url);
      const container = document.getElementById('lab-tests-catalog');
      if (!container || !response.success) return;

      if (response.data.length === 0) {
        container.innerHTML = UI.emptyState('🔬', 'No Lab Tests Found', 'No lab tests match your search criteria.');
        return;
      }

      container.innerHTML = `<div class="grid grid--3">
        ${response.data.map(test => `
          <div class="card">
            <div class="card__body" style="display:flex; flex-direction:column; justify-content:space-between; height:100%;">
              <div>
                <div class="d-flex justify-between items-center mb-3">
                  <span class="badge badge--info">${test.category || 'General'}</span>
                  <span class="font-bold text-primary">₹${parseFloat(test.price).toFixed(2)}</span>
                </div>
                <h4 class="mb-2">${test.test_name}</h4>
                <p class="text-sm text-muted mb-3">${test.description || 'Standard laboratory test.'}</p>
                <div class="text-xs text-muted mb-4">⏱ Results in ${test.turnaround_hours}h • Code: ${test.test_code}</div>
              </div>
              <button class="btn btn--primary btn--block btn--sm" onclick="LabTests.openBookModal(${test.id}, '${test.test_name.replace(/'/g, "\\'")}')">Book Test</button>
            </div>
          </div>
        `).join('')}
      </div>`;
    } catch (error) {
      UI.showToast('Failed to load lab tests.', 'error');
    }
  },

  openBookModal(testId, testName) {
    document.getElementById('book-lab-test-id').value = testId;
    document.getElementById('book-lab-test-name').textContent = testName;

    // Set min date to today
    const dateInput = document.getElementById('book-lab-date');
    if (dateInput) {
      dateInput.value = '';
      dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
    }
    
    UI.openModal('book-lab-modal');
  },

  async bookTest() {
    try {
      const data = {
        lab_test_id: parseInt(document.getElementById('book-lab-test-id').value, 10),
        booking_date: document.getElementById('book-lab-date').value,
        preferred_time: document.getElementById('book-lab-time')?.value || null,
        notes: document.getElementById('book-lab-notes')?.value || '',
      };

      if (!data.booking_date) { UI.showToast('Please select a date.', 'warning'); return; }

      UI.showLoader();
      const response = await Api.post('/lab-bookings', data);
      if (response.success) {
        UI.showToast('Lab test booked successfully!', 'success');
        UI.closeModal('book-lab-modal');
        await this.loadBookings();
      } else {
        UI.showToast(response.message || 'Booking failed.', 'error');
      }
    } catch (error) {
      UI.showToast(error.message || 'Booking failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async loadBookings() {
    try {
      const response = await Api.get(`/lab-bookings?page=${this.currentPage}&limit=${CONFIG.DEFAULT_PAGE_SIZE}`);
      const container = document.getElementById('lab-bookings-list');
      if (!container || !response.success) return;

      if (response.data.length === 0) {
        container.innerHTML = UI.emptyState('📝', 'No Bookings', 'You haven\'t booked any lab tests yet.');
        return;
      }

      container.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Test</th><th>Date</th><th>Status</th><th>Result</th><th>Actions</th></tr></thead>
            <tbody>
              ${response.data.map(b => {
                const canCancel = ['pending', 'confirmed'].includes(b.status);
                return `
                  <tr>
                    <td><strong>${b.test_name}</strong><br><span class="text-xs text-muted">${b.test_code}</span></td>
                    <td>${UI.formatDate(b.booking_date)}</td>
                    <td>${UI.statusBadge(b.status)}</td>
                    <td>${b.result_file_url ? `<a href="${b.result_file_url}" target="_blank" class="btn btn--sm btn--ghost">Download</a>` : '—'}</td>
                    <td>
                      ${canCancel ? `<button class="btn btn--sm btn--danger" onclick="LabTests.cancelBooking(${b.id})">Cancel</button>` : '—'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (error) {
      UI.showToast('Failed to load bookings.', 'error');
    }
  },

  async cancelBooking(id) {
    if (!confirm('Are you sure you want to cancel this lab test booking?')) return;
    try {
      UI.showLoader();
      const response = await Api.put(`/lab-bookings/${id}/cancel`, {});
      if (response.success) {
        UI.showToast('Booking cancelled successfully.', 'success');
        await this.loadBookings();
      } else {
        UI.showToast(response.message || 'Cancellation failed.', 'error');
      }
    } catch (error) {
      UI.showToast(error.message || 'Cancellation failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  goToPage(page) { this.currentPage = page; this.loadBookings(); },
};
