// ============================================================
// MediConnect – public/js/lab-tests.js
// Premium Lab Test Catalog, Booking & Diagnostic Page
// ============================================================

const LabTests = {
  searchDebounce: null,
  currentTestId: null,

  async init() {
    this.loadCategories();
    this.loadTests();
    this.loadFAQs();
    this.bindEvents();
    this.initCountUp();
    this.initScrollAnimations();
  },

  bindEvents() {
    const searchInput = document.getElementById('lab-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(this.searchDebounce);
        this.searchDebounce = setTimeout(() => this.loadTests(), 400);
      });
    }

    const catFilter = document.getElementById('lab-filter-category');
    if (catFilter) {
      catFilter.addEventListener('change', () => this.loadTests());
    }

    const filterBtn = document.getElementById('lab-filter-btn');
    if (filterBtn) {
      filterBtn.addEventListener('click', () => this.loadTests());
    }

    const form = document.getElementById('book-lab-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.bookTest();
      });
    }

    document.addEventListener('click', (e) => {
      const detailBtn = e.target.closest('[data-test-detail]');
      if (detailBtn) {
        const id = parseInt(detailBtn.dataset.testDetail, 10);
        this.openDetail(id);
      }
      const bookBtn = e.target.closest('[data-book-test]');
      if (bookBtn) {
        const id = parseInt(bookBtn.dataset.bookTest, 10);
        const name = bookBtn.dataset.testName;
        this.openBookModal(id, name);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDetail();
      }
    });

    const overlay = document.getElementById('lab-detail-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeDetail();
      });
    }
  },

  // ── Section 3: Load Categories ──
  async loadCategories() {
    try {
      const response = await Api.get('/lab-tests/categories');
      if (!response.success) return;

      const categories = response.data;
      const grid = document.getElementById('lab-categories-grid');
      if (!grid) return;

      const categoryIcons = {
        'Blood': '\uD83D\uDD0C',
        'Diabetes': '\uD83C\uDF4E',
        'Thyroid': '\uD83E\uDDEA',
        'Liver': '\uD83C\uDF4C',
        'Vitamin': '\uD83C\uDF3F',
        'Preventive': '\uD83D\uDEE1\uFE0F',
      };

      const categoryColors = [
        'lab-category-card__icon',
      ];

      if (categories.length === 0) {
        grid.innerHTML = this.getCategoryFallbackHTML();
        return;
      }

      grid.innerHTML = categories.map(cat => {
        const icon = Object.keys(categoryIcons).find(k => cat.toLowerCase().includes(k.toLowerCase()));
        const emoji = categoryIcons[icon] || '\uD83D\uDD2C';
        return `
          <button class="lab-category-card" data-category-filter="${cat}">
            <div class="lab-category-card__icon">${emoji}</div>
            <div class="lab-category-card__info">
              <h4>${this.escapeHtml(cat)}</h4>
              <span>View all tests in this category \u2192</span>
            </div>
            <div class="lab-category-card__arrow">\u2192</div>
          </button>
        `;
      }).join('');

      grid.querySelectorAll('.lab-category-card').forEach(card => {
        card.addEventListener('click', () => {
          const cat = card.dataset.categoryFilter;
          const filter = document.getElementById('lab-filter-category');
          if (filter) {
            filter.value = cat;
            this.loadTests();
            document.getElementById('test-catalog')?.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });
    } catch (error) {
      console.error('Failed to load categories:', error);
      const grid = document.getElementById('lab-categories-grid');
      if (grid) grid.innerHTML = this.getCategoryFallbackHTML();
    }
  },

  getCategoryFallbackHTML() {
    const fallbackCats = [
      { name: 'Blood Tests', icon: '\uD83D\uDD0C' },
      { name: 'Diabetes Tests', icon: '\uD83C\uDF4E' },
      { name: 'Thyroid Tests', icon: '\uD83E\uDDEA' },
      { name: 'Liver Function Tests', icon: '\uD83C\uDF4C' },
      { name: 'Vitamin Tests', icon: '\uD83C\uDF3F' },
      { name: 'Preventive Health Packages', icon: '\uD83D\uDEE1\uFE0F' },
    ];
    return fallbackCats.map(cat => `
      <button class="lab-category-card" data-category-filter="${cat.name}">
        <div class="lab-category-card__icon">${cat.icon}</div>
        <div class="lab-category-card__info">
          <h4>${cat.name}</h4>
          <span>View all tests \u2192</span>
        </div>
        <div class="lab-category-card__arrow">\u2192</div>
      </button>
    `).join('');
  },

  // ── Section 4 & 5: Search & Load Tests ──
  async loadTests() {
    try {
      const searchVal = document.getElementById('lab-search')?.value || '';
      const catFilter = document.getElementById('lab-filter-category')?.value || '';

      let url = '/lab-tests?limit=50&is_active=1';
      if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
      if (catFilter) url += `&category=${encodeURIComponent(catFilter)}`;

      const response = await Api.get(url);
      const container = document.getElementById('lab-tests-catalog');
      const countEl = document.getElementById('lab-tests-count');
      if (!container) return;

      if (!response.success || response.data.length === 0) {
        container.innerHTML = `
          <div class="lab-no-results">
            <div class="lab-no-results__icon">\uD83D\uDD2C</div>
            <div class="lab-no-results__title">No Tests Found</div>
            <div class="lab-no-results__text">No lab tests match your search criteria. Try a different search term or category.</div>
          </div>
        `;
        if (countEl) countEl.textContent = '';
        return;
      }

      if (countEl) {
        countEl.textContent = `${response.data.length} test${response.data.length !== 1 ? 's' : ''} found`;
      }

      container.innerHTML = `<div class="lab-tests-grid">
        ${response.data.map(test => this.renderTestCard(test)).join('')}
      </div>`;
    } catch (error) {
      UI.showToast('Failed to load lab tests.', 'error');
    }
  },

  renderTestCard(test) {
    const price = parseFloat(test.price).toFixed(2);
    const name = this.escapeHtml(test.test_name);
    const desc = this.escapeHtml(test.description || 'Standard laboratory diagnostic test.');
    const category = this.escapeHtml(test.category || 'General');
    const hours = test.turnaround_hours || 24;
    const code = this.escapeHtml(test.test_code);

    return `
      <div class="lab-test-card">
        <div class="lab-test-card__header">
          <span class="lab-test-card__category">${category}</span>
          <span class="lab-test-card__price">\u20B9${price}</span>
        </div>
        <div class="lab-test-card__body">
          <h3 class="lab-test-card__name">${name}</h3>
          <p class="lab-test-card__desc">${desc}</p>
          <div class="lab-test-card__meta">
            <span class="lab-test-card__meta-item">\u23F1 ${hours}h</span>
            <span class="lab-test-card__meta-item">\uD83D\uDCC4 Digital</span>
            <span class="lab-test-card__meta-item">\uD83D\uDD0D ${code}</span>
          </div>
          <div class="lab-test-card__actions">
            <button class="btn btn--ghost lab-test-card__view-btn btn--sm" data-test-detail="${test.id}">
              View Details
            </button>
            <button class="btn btn--primary btn--sm" data-book-test="${test.id}" data-test-name="${name.replace(/"/g, '&quot;')}">
              Book Now
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ── Section 6: Test Detail Showcase ──
  async openDetail(testId) {
    const overlay = document.getElementById('lab-detail-overlay');
    const loading = document.getElementById('lab-detail-loading');
    const content = document.getElementById('lab-detail-content');
    if (!overlay) return;

    loading.style.display = 'flex';
    content.style.display = 'none';
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
      const response = await Api.get(`/lab-tests/${testId}`);
      if (!response.success || !response.data) {
        UI.showToast('Failed to load test details.', 'error');
        this.closeDetail();
        return;
      }

      const test = response.data;
      this.currentTestId = testId;

      document.getElementById('detail-category').textContent = test.category || 'General';
      document.getElementById('detail-name').textContent = test.test_name;
      document.getElementById('detail-code').textContent = test.test_code;
      document.getElementById('detail-description').textContent = test.description || 'No description available.';
      document.getElementById('detail-preparation').textContent = test.preparation_instructions || 'No special preparation required. Follow any instructions provided by your healthcare provider.';
      document.getElementById('detail-turnaround').textContent = `${test.turnaround_hours || 24} hours`;
      document.getElementById('detail-price').textContent = `\u20B9${parseFloat(test.price).toFixed(2)}`;

      const bookBtn = document.getElementById('detail-book-btn');
      if (bookBtn) {
        const name = test.test_name.replace(/"/g, '&quot;');
        bookBtn.setAttribute('data-book-test', test.id);
        bookBtn.setAttribute('data-test-name', name);
      }

      loading.style.display = 'none';
      content.style.display = 'block';
    } catch (error) {
      UI.showToast('Failed to load test details.', 'error');
      this.closeDetail();
    }
  },

  closeDetail() {
    const overlay = document.getElementById('lab-detail-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // ── Booking Modal ──
  openBookModal(testId, testName) {
    if (!Auth.isAuthenticated()) {
      UI.showToast('Please log in to book a test.', 'warning');
      const currentPath = window.location.pathname;
      sessionStorage.setItem('redirect_after_login', currentPath);
      window.location.href = '/login.html';
      return;
    }

    document.getElementById('book-lab-test-id').value = testId;
    document.getElementById('book-lab-test-name').textContent = testName;

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

      if (!data.booking_date) {
        UI.showToast('Please select a date.', 'warning');
        return;
      }

      UI.showLoader();
      const response = await Api.post('/lab-bookings', data);
      if (response.success) {
        UI.showToast('Lab test booked successfully!', 'success');
        UI.closeModal('book-lab-modal');
        document.getElementById('book-lab-form')?.reset();
      } else {
        UI.showToast(response.message || 'Booking failed.', 'error');
      }
    } catch (error) {
      UI.showToast(error.message || 'Booking failed.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  // ── Section 9: FAQ ──
  async loadFAQs() {
    const container = document.getElementById('lab-faq-list');
    if (!container) return;

    try {
      const response = await Api.get('/cms/faqs');
      if (response.success && response.data.length > 0) {
        container.innerHTML = response.data.map(faq => `
          <div class="faq-preview-item">
            <button class="faq-preview-question" onclick="toggleFaq(this)">
              ${this.escapeHtml(faq.question)}
              <span class="faq-chevron">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </button>
            <div class="faq-preview-answer">
              <div class="faq-preview-answer-inner">${this.escapeHtml(faq.answer)}</div>
            </div>
          </div>
        `).join('');
        return;
      }
    } catch (error) {
      // Silently fall back to static FAQ
    }

    container.innerHTML = this.getFallbackFAQs();
  },

  getFallbackFAQs() {
    const faqs = [
      { q: 'How do I book a lab test?', a: 'Simply browse our test catalog, select the test you need, choose a convenient date, and confirm your booking. If you\'re a new user, you\'ll need to create an account first.' },
      { q: 'Can I get my samples collected from home?', a: 'Yes! We offer free home sample collection with every test booking. A certified phlebotomist will visit your home at your preferred time.' },
      { q: 'How long do test results take?', a: 'Most test results are delivered within 24–48 hours. Some specialized tests may take longer. Urgent results can be available in as little as 6 hours for select tests.' },
      { q: 'How will I receive my test reports?', a: 'Reports are uploaded to your secure MediConnect account as digital PDFs. You\'ll receive an email notification when your report is ready. You can download, view, or share them anytime.' },
      { q: 'Can I cancel or reschedule a booking?', a: 'Yes, you can cancel a booking as long as it\'s in "pending" or "confirmed" status. Simply go to your bookings and click the cancel button.' },
      { q: 'Are my reports shared with my doctor?', a: 'You can easily share any report with your healthcare provider directly from your MediConnect account. You control who has access to your reports.' },
      { q: 'What is the accuracy of your tests?', a: 'All our partner labs are NABL-accredited and follow strict quality control protocols. Every report is reviewed by qualified pathologists before release.' },
      { q: 'How do I prepare for a blood test?', a: 'Preparation depends on the test. Common instructions include fasting for 8–12 hours, staying hydrated, and avoiding alcohol. Specific instructions are shown on the test details page.' },
    ];
    return faqs.map(faq => `
      <div class="faq-preview-item">
        <button class="faq-preview-question" onclick="toggleFaq(this)">
          ${this.escapeHtml(faq.q)}
          <span class="faq-chevron">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </button>
        <div class="faq-preview-answer">
          <div class="faq-preview-answer-inner">${this.escapeHtml(faq.a)}</div>
        </div>
      </div>
    `).join('');
  },

  // ── Count-Up Animation ──
  initCountUp() {
    const counters = document.querySelectorAll('.count-up');
    if (counters.length === 0) return;

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
