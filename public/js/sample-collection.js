// ============================================================
// MediConnect – public/js/sample-collection.js
// Premium Home Sample Collection — Request, Status & Tracking
// ============================================================

const SampleCollection = {
  currentPage: 1,

  async init() {
    this.loadFAQs();
    this.loadRequests();
    this.bindEvents();
    this.initCountUp();
    this.initScrollAnimations();
  },

  bindEvents() {
    const form = document.getElementById('sample-collection-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.submitRequest();
      });
    }

    document.addEventListener('click', (e) => {
      const faqBtn = e.target.closest('[data-sc-faq-toggle]');
      if (faqBtn) {
        this.toggleFaq(faqBtn);
      }
    });
  },

  // ── Request Modal ──
  async openRequestModal() {
    if (!Auth.isAuthenticated()) {
      UI.showToast('Please log in to request a pickup.', 'warning');
      sessionStorage.setItem('redirect_after_login', window.location.pathname);
      window.location.href = '/login.html';
      return;
    }
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
        document.getElementById('sample-collection-form')?.reset();
        await this.loadRequests();
      } else {
        UI.showToast(response.message || 'Request failed.', 'error');
      }
    } catch (error) {
      UI.showToast(error.message || 'Request failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  // ── Load & Render Requests ──
  async loadRequests() {
    try {
      const response = await Api.get(`/sample-collections?page=${this.currentPage}&limit=${CONFIG.DEFAULT_PAGE_SIZE}`);
      const container = document.getElementById('sample-requests-list');
      if (!container || !response.success) return;

      if (response.data.length === 0) {
        container.innerHTML = `
          <div class="sc-request-empty">
            <div class="sc-request-empty__icon">\uD83C\uDFE0</div>
            <div class="sc-request-empty__title">No Collection Requests</div>
            <div class="sc-request-empty__text">Book a lab test first, then request a home pickup.</div>
            <a href="/lab-tests.html" class="btn btn--primary" style="margin-top:var(--space-4)">Browse Lab Tests</a>
          </div>
        `;
        this.updateStatusFlow(null);
        return;
      }

      const hasActive = response.data.some(r => r.status !== 'cancelled');
      if (hasActive) {
        const latestActive = response.data
          .filter(r => r.status !== 'cancelled')
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        this.updateStatusFlow(latestActive.status);
      } else {
        this.updateStatusFlow(null);
      }

      container.innerHTML = `
        <table class="sc-requests-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Date & Time</th>
              <th>Collector</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${response.data.map(r => this.renderRequestRow(r)).join('')}
          </tbody>
        </table>
      `;
    } catch (error) {
      UI.showToast('Failed to load requests.', 'error');
    }
  },

  renderRequestRow(r) {
    const isRequested = r.status === 'requested';
    const statusFlow = this.getStatusFlowSteps(r.status);

    return `
      <tr>
        <td><strong>${this.escapeHtml(r.test_name)}</strong></td>
        <td>
          ${UI.formatDate(r.preferred_date)}<br>
          <span class="text-xs text-muted">${r.preferred_time_slot || 'Any time'}</span>
        </td>
        <td>
          ${r.collector_name ? `
            <strong>${this.escapeHtml(r.collector_name)}</strong><br>
            <span class="text-xs text-muted">${r.collector_phone || ''}</span>
          ` : '<span class="text-muted">—</span>'}
        </td>
        <td>${UI.statusBadge(r.status)}</td>
        <td>
          ${isRequested ? `
            <button class="btn btn--sm btn--danger" onclick="SampleCollection.cancelRequest(${r.id})">Cancel</button>
          ` : '—'}
        </td>
      </tr>
    `;
  },

  getStatusFlowSteps(status) {
    const order = ['requested', 'assigned', 'collected', 'testing', 'report_ready', 'delivered'];
    const idx = order.indexOf(status);
    return order.map((s, i) => ({
      name: s,
      active: i === idx,
      completed: i < idx,
    }));
  },

  updateStatusFlow(currentStatus) {
    const items = document.querySelectorAll('.sc-status-flow__item');
    const lines = document.querySelectorAll('.sc-status-flow__line');
    if (!items.length) return;

    const order = ['requested', 'assigned', 'collected', 'testing', 'report_ready', 'delivered'];
    const idx = currentStatus ? order.indexOf(currentStatus) : -1;

    items.forEach((item, i) => {
      item.classList.remove('active', 'completed');
      if (idx >= 0) {
        if (i < idx) item.classList.add('completed');
        else if (i === idx) item.classList.add('active');
      }
    });

    lines.forEach((line, i) => {
      line.classList.remove('completed');
      if (idx >= 0 && i < idx) line.classList.add('completed');
    });
  },

  async cancelRequest(id) {
    if (!confirm('Are you sure you want to cancel this sample collection request?')) return;
    try {
      UI.showLoader();
      const response = await Api.put(`/sample-collections/${id}/cancel`, { reason: 'Cancelled by patient' });
      if (response.success) {
        UI.showToast('Request cancelled successfully.', 'success');
        await this.loadRequests();
      } else {
        UI.showToast(response.message || 'Cancellation failed.', 'error');
      }
    } catch (error) {
      UI.showToast(error.message || 'Cancellation failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  goToPage(page) {
    this.currentPage = page;
    this.loadRequests();
  },

  // ── Section 9: FAQ ──
  async loadFAQs() {
    const container = document.getElementById('sc-faq-list');
    if (!container) return;

    try {
      const response = await Api.get('/cms/faqs');
      if (response.success && response.data.length > 0) {
        container.innerHTML = response.data.map(faq => `
          <div class="sc-faq-item">
            <button class="sc-faq-question" data-sc-faq-toggle>
              <span>${this.escapeHtml(faq.question)}</span>
              <span class="sc-faq-toggle">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </button>
            <div class="sc-faq-answer">
              <div class="sc-faq-answer-inner">${this.escapeHtml(faq.answer)}</div>
            </div>
          </div>
        `).join('');
        return;
      }
    } catch (error) {
      // Silently fall back
    }

    container.innerHTML = this.getFallbackFAQs();
  },

  getFallbackFAQs() {
    const faqs = [
      { q: 'How do I request a home sample collection?', a: 'First, book a lab test from our catalog. Once you have an active booking, go to the Sample Collection page and click "Request Pickup". Select the booking, enter your address, choose a date and time slot, and submit.' },
      { q: 'Is home sample collection free?', a: 'Yes! Home sample collection is completely free with every lab test booking on MediConnect. There are no hidden charges.' },
      { q: 'How do I prepare for the visit?', a: 'Ensure your address is easily accessible. Keep your ID ready for verification. Follow any test-specific preparation instructions (like fasting) provided during booking.' },
      { q: 'What time slots are available?', a: 'We offer four time slots: 9:00–11:00 AM, 11:00 AM–1:00 PM, 2:00–4:00 PM, and 4:00–6:00 PM. You can choose the most convenient slot during the request.' },
      { q: 'How are samples transported to the lab?', a: 'Samples are transported in temperature-controlled containers following strict cold chain protocols to maintain sample integrity until they reach our lab.' },
      { q: 'Can I cancel or reschedule a collection?', a: 'You can cancel a collection request as long as its status is "Requested" (before a collector is assigned). For rescheduling, cancel and create a new request.' },
      { q: 'How do I track my collection request?', a: 'You can track your request status in real-time on this page. The status flow shows Requested, Assigned, Collected, Testing, Report Ready, and Delivered.' },
      { q: 'What safety measures are followed?', a: 'Our phlebotomists use sterile single-use equipment, wear full PPE, follow hand hygiene protocols, and practice safe biohazard disposal after every collection.' },
    ];
    return faqs.map(faq => `
      <div class="sc-faq-item">
        <button class="sc-faq-question" data-sc-faq-toggle>
          <span>${this.escapeHtml(faq.q)}</span>
          <span class="sc-faq-toggle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </button>
        <div class="sc-faq-answer">
          <div class="sc-faq-answer-inner">${this.escapeHtml(faq.a)}</div>
        </div>
      </div>
    `).join('');
  },

  toggleFaq(btn) {
    const item = btn.closest('.sc-faq-item');
    if (!item) return;
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.sc-faq-item.open').forEach(el => {
      if (el !== item) el.classList.remove('open');
    });
    item.classList.toggle('open', !isOpen);
  },

  // ── Count-Up Animation ──
  initCountUp() {
    const counters = document.querySelectorAll('.count-up');
    if (!counters.length) return;
    let counted = false;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !counted) {
          counted = true;
          counters.forEach(counter => {
            const target = parseInt(counter.dataset.target, 10);
            if (isNaN(target)) return;
            this.animateCount(counter, target);
          });
          observer.disconnect();
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => observer.observe(c));
  },

  animateCount(el, target) {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        el.textContent = target;
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(current);
      }
    }, duration / steps);
  },

  // ── Scroll Animations ──
  initScrollAnimations() {
    if (typeof Animations !== 'undefined' && Animations.init) {
      Animations.init();
    }
  },

  // ── Helpers ──
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
