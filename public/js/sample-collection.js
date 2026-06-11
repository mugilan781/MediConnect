// ============================================================
// MediConnect – public/js/sample-collection.js
// Sample pickup request UI
// ============================================================

const SampleCollection = {
  currentPage: 1,

  async init() {
    await this.loadRequests();
    this.bindEvents();
  },

  bindEvents() {
    const form = document.getElementById('sample-collection-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.submitRequest();
      });
    }
  },

  async openRequestModal() {
    await this.loadEligibleBookings();
    UI.openModal('sample-collection-modal');
  },

  async loadEligibleBookings() {
    try {
      const [bookingsRes, collectionsRes] = await Promise.all([
        Api.get('/lab-bookings?limit=100'),
        Api.get('/sample-collections?limit=100')
      ]);

      if (!bookingsRes.success || !collectionsRes.success) return;

      const activeBookingIds = new Set(
        collectionsRes.data
          .filter(c => c.status !== 'cancelled')
          .map(c => c.lab_booking_id)
      );

      const eligibleBookings = bookingsRes.data.filter(b => 
        ['pending', 'confirmed'].includes(b.status) && !activeBookingIds.has(b.id)
      );

      const select = document.getElementById('sc-booking-id');
      if (!select) return;

      if (eligibleBookings.length === 0) {
        select.innerHTML = '<option value="">No eligible bookings found</option>';
        return;
      }

      select.innerHTML = '<option value="">Select a Lab Booking</option>' + 
        eligibleBookings.map(b => `
          <option value="${b.id}">${b.test_name} - ${UI.formatDate(b.booking_date)} (${b.status.toUpperCase()})</option>
        `).join('');
    } catch (error) {
      console.error('Error loading eligible bookings:', error);
    }
  },

  async submitRequest() {
    try {
      const data = {
        lab_booking_id: parseInt(document.getElementById('sc-booking-id').value),
        collection_address: document.getElementById('sc-address').value,
        preferred_date: document.getElementById('sc-date').value,
        preferred_time_slot: document.getElementById('sc-time-slot')?.value || '',
        notes: document.getElementById('sc-notes')?.value || '',
      };

      if (!data.lab_booking_id || !data.collection_address || !data.preferred_date) {
        UI.showToast('Please fill in all required fields.', 'warning');
        return;
      }

      UI.showLoader();
      const response = await Api.post('/sample-collections', data);
      if (response.success) {
        UI.showToast('Sample collection request submitted!', 'success');
        UI.closeModal('sample-collection-modal');
        await this.loadRequests();
      }
    } catch (error) {
      UI.showToast(error.message || 'Request failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  async loadRequests() {
    try {
      const response = await Api.get(`/sample-collections?page=${this.currentPage}&limit=${CONFIG.DEFAULT_PAGE_SIZE}`);
      const container = document.getElementById('sample-requests-list');
      if (!container || !response.success) return;

      if (response.data.length === 0) {
        container.innerHTML = UI.emptyState('🏠', 'No Requests', 'No sample collection requests yet.');
        return;
      }

      container.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>Test</th><th>Preferred Date</th><th>Collector Info</th><th>Status Tracking</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${response.data.map(r => {
                const isRequested = r.status === 'requested';
                const isAssigned = ['assigned', 'scheduled', 'in_transit', 'collected', 'testing', 'report_ready', 'delivered'].includes(r.status);
                const isCollected = ['collected', 'testing', 'report_ready', 'delivered'].includes(r.status);
                const isTesting = ['testing', 'report_ready', 'delivered'].includes(r.status);
                const isDelivered = ['delivered'].includes(r.status);

                return `
                  <tr>
                    <td><strong>${r.test_name}</strong></td>
                    <td>${UI.formatDate(r.preferred_date)}<br><span class="text-xs text-muted">${r.preferred_time_slot || '—'}</span></td>
                    <td>
                      ${r.collector_name ? `
                        <strong>${r.collector_name}</strong><br>
                        <span class="text-xs text-muted">${r.collector_phone || ''}</span>
                        ${r.collection_date ? `<br><span class="text-xs text-muted">Sched: ${UI.formatDate(r.collection_date)} ${r.collection_time || ''}</span>` : ''}
                      ` : '<span class="text-muted">Not assigned</span>'}
                    </td>
                    <td>
                      <div style="display:flex; gap: 5px; font-size: 11px; align-items: center;">
                        <span style="color: ${isAssigned ? '#0d9488' : '#9ca3af'}; font-weight: ${isAssigned ? 'bold' : 'normal'};">Assigned</span> →
                        <span style="color: ${isCollected ? '#0d9488' : '#9ca3af'}; font-weight: ${isCollected ? 'bold' : 'normal'};">Collected</span> →
                        <span style="color: ${isTesting ? '#0d9488' : '#9ca3af'}; font-weight: ${isTesting ? 'bold' : 'normal'};">Testing</span> →
                        <span style="color: ${isDelivered ? '#0d9488' : '#9ca3af'}; font-weight: ${isDelivered ? 'bold' : 'normal'};">Delivered</span>
                      </div>
                    </td>
                    <td>${UI.statusBadge(r.status)}</td>
                    <td>
                      ${isRequested ? `
                        <button class="btn btn--danger btn--xs" onclick="SampleCollection.cancelRequest(${r.id})">Cancel</button>
                      ` : '—'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (error) {
      UI.showToast('Failed to load requests.', 'error');
    }
  },

  async cancelRequest(id) {
    if (!confirm('Are you sure you want to cancel this sample collection request?')) return;
    try {
      UI.showLoader();
      const response = await Api.put(`/sample-collections/${id}/cancel`, { reason: 'Cancelled by patient' });
      if (response.success) {
        UI.showToast('Request cancelled successfully.', 'success');
        await this.loadRequests();
      }
    } catch (error) {
      UI.showToast(error.message || 'Cancellation failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  goToPage(page) { this.currentPage = page; this.loadRequests(); },
};

