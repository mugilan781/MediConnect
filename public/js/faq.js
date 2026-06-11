// ============================================================
// MediConnect – public/js/faq.js
// Dynamic FAQ content loader, search filter, and accordion widget
// ============================================================

const FAQPage = {
  faqs: [],
  pageMeta: null,

  async init() {
    try {
      // 1. Load Page configurations and SEO settings
      await this.loadPageConfig();

      // 2. Fetch FAQs from API
      await this.fetchFaqs();

      // 3. Bind search filter listener
      this.bindSearch();
    } catch (error) {
      console.error('FAQ initialization failed:', error.message);
      this.renderFallback();
    }
  },

  async loadPageConfig() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/cms/page/faq`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          this.pageMeta = result.data.page;
          if (typeof UI !== 'undefined' && UI.injectSEO && this.pageMeta) {
            UI.injectSEO(this.pageMeta);
          }
          
          // Render hero if dynamic data is present
          if (this.pageMeta.title) {
            const heroTitle = document.getElementById('faq-hero-title');
            if (heroTitle) heroTitle.textContent = this.pageMeta.title;
          }
        }
      }
    } catch (err) {
      console.warn('FAQ CMS config load error:', err.message);
    }
  },

  async fetchFaqs() {
    const response = await fetch(`${CONFIG.API_BASE_URL}/cms/faqs`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (result.success && result.data) {
      this.faqs = result.data;
      this.renderFaqs(this.faqs);
    } else {
      throw new Error(result.message || 'Failed to load FAQs.');
    }
  },

  renderFaqs(list) {
    const container = document.getElementById('faq-list-container');
    const noResults = document.getElementById('faq-no-results');
    if (!container) return;

    if (list.length === 0) {
      container.style.display = 'none';
      if (noResults) noResults.style.display = 'block';
      return;
    }

    if (noResults) noResults.style.display = 'none';
    container.style.display = 'flex';

    container.innerHTML = list.map(item => `
      <div class="faq-item" data-id="${item.id}">
        <button class="faq-header">
          <span>${this.escapeHtml(item.question)}</span>
          <span class="faq-toggle-icon">▼</span>
        </button>
        <div class="faq-content">
          <div class="faq-content-inner">
            ${this.escapeHtml(item.answer)}
          </div>
        </div>
      </div>
    `).join('');

    this.bindAccordions();
  },

  bindAccordions() {
    const headers = document.querySelectorAll('.faq-header');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const content = header.nextElementSibling;
        const isActive = header.classList.contains('active');

        // Close all other accordions for single-expand behavior
        document.querySelectorAll('.faq-header').forEach(h => {
          if (h !== header) {
            h.classList.remove('active');
            h.nextElementSibling.style.maxHeight = null;
          }
        });

        // Toggle active accordion
        if (isActive) {
          header.classList.remove('active');
          content.style.maxHeight = null;
        } else {
          header.classList.add('active');
          content.style.maxHeight = content.scrollHeight + 'px';
        }
      });
    });
  },

  bindSearch() {
    const searchInput = document.getElementById('faq-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        this.renderFaqs(this.faqs);
        return;
      }

      const filtered = this.faqs.filter(faq => 
        faq.question.toLowerCase().includes(query) || 
        faq.answer.toLowerCase().includes(query)
      );

      this.renderFaqs(filtered);
    });
  },

  renderFallback() {
    const container = document.getElementById('faq-list-container');
    if (container) {
      container.innerHTML = `
        <div class="faq-item">
          <button class="faq-header">
            <span>How do I book an appointment?</span>
            <span class="faq-toggle-icon">▼</span>
          </button>
          <div class="faq-content">
            <div class="faq-content-inner">
              Go to the Patient Dashboard, select the Appointments tab, search for your preferred doctor, select an available date/slot, and click Book Appointment.
            </div>
          </div>
        </div>
        <div class="faq-item">
          <button class="faq-header">
            <span>What is the refund policy for cancellations?</span>
            <span class="faq-toggle-icon">▼</span>
          </button>
          <div class="faq-content">
            <div class="faq-content-inner">
              Cancellations made up to 24 hours before the scheduled time slot receive a full refund. Same-day cancellations may incur a processing fee.
            </div>
          </div>
        </div>
      `;
      this.bindAccordions();
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  FAQPage.init();
});
