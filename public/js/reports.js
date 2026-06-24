// ============================================================
// MediConnect – public/js/reports.js
// Premium Medical Reports & Records Page
// ============================================================

const Reports = {
  currentPage: 1,

  async init() {
    this.loadCategories();
    this.loadReports();
    this.loadFAQs();
    this.bindEvents();
    this.initCountUp();
    this.initScrollAnimations();
  },

  bindEvents() {
    document.addEventListener('click', (e) => {
      const dashboardTab = e.target.closest('.rpt-dashboards__tab');
      if (dashboardTab) {
        this.switchDashboardTab(dashboardTab.dataset.role);
      }

      const faqBtn = e.target.closest('[data-rpt-faq-toggle]');
      if (faqBtn) {
        this.toggleFaq(faqBtn);
      }
    });
  },

  // ── Section 3: Load Categories ──
  async loadCategories() {
    const grid = document.getElementById('rpt-categories-grid');
    if (!grid) return;

    try {
      const response = await Api.get('/reports/categories');
      if (response.success && response.data.length > 0) {
        const catIcons = {
          'Consultation Report': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
          'Diagnosis Report': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14l2 2 4-4"/></svg>',
          'Prescription Report': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="10" rx="5"/><circle cx="15" cy="12" r="1"/><path d="M9 12h.01"/></svg>',
          'Blood Test Report': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
          'General Medical Report': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/></svg>',
          'X-Ray Report': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="12" cy="12" r="3"/><path d="M12 9v6"/><path d="M9 12h6"/></svg>',
          'Scan Report': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
          'MRI Report': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
          'Ultrasound Report': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
          'CBC Report': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H15M10 9H14M3 14C3 19 7 21 12 21C17 21 21 19 21 14C21 9 15 9 15 9V3H9V9C9 9 3 9 3 14Z"/></svg>',
          'Thyroid Report': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>',
          'Liver Function Report': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10a6 6 0 1 1-12 0 6 6 0 1 1 12 0Z"/><path d="M12 16v6"/></svg>',
          'Vitamin Report': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="10" rx="5"/><circle cx="15" cy="12" r="1"/></svg>',
          'Custom Lab Report': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/></svg>',
          'Default': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/></svg>'
        };
        grid.innerHTML = response.data.map(cat => {
          const icon = catIcons[cat.category_name] || catIcons['Default'];
          return `
            <div class="rpt-category-card">
              <div class="rpt-category-card__icon">${icon}</div>
              <div class="rpt-category-card__info">
                <h4>${this.escapeHtml(cat.category_name)}</h4>
                <span>Medical document category</span>
              </div>
            </div>
          `;
        }).join('');
        return;
      }
    } catch (error) {
      // Fall through to fallback
    }

    grid.innerHTML = this.getCategoryFallback();
  },

  getCategoryFallback() {
    const cats = [
      { name: 'Consultation Reports', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
      { name: 'Diagnosis Reports', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14l2 2 4-4"/></svg>' },
      { name: 'Prescription Reports', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="10" rx="5"/><circle cx="15" cy="12" r="1"/><path d="M9 12h.01"/></svg>' },
      { name: 'Lab Reports', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/></svg>' },
      { name: 'Imaging Reports', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' },
    ];
    return cats.map(cat => `
      <div class="rpt-category-card">
        <div class="rpt-category-card__icon">${cat.icon}</div>
        <div class="rpt-category-card__info">
          <h4>${cat.name}</h4>
          <span>Medical document category</span>
        </div>
      </div>
    `).join('');
  },

  // ── Section 8: Dashboard Tab Switching ──
  switchDashboardTab(role) {
    document.querySelectorAll('.rpt-dashboards__tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.rpt-dashboard-panel').forEach(p => p.classList.remove('active'));

    const tab = document.querySelector(`.rpt-dashboards__tab[data-role="${role}"]`);
    if (tab) tab.classList.add('active');

    const panel = document.getElementById(`rpt-dash-${role}`);
    if (panel) panel.classList.add('active');
  },

  // ── Section 10: Load Reports ──
  async loadReports() {
    const container = document.getElementById('reports-list');
    if (!container) return;

    if (!Auth.isAuthenticated()) {
      container.innerHTML = `
        <div class="rpt-auth-prompt">
          <div class="rpt-auth-prompt__icon">\uD83D\uDD12</div>
          <h3>Sign in to View Your Reports</h3>
          <p>Please log in to access your medical reports and records.</p>
          <a href="/login.html" class="btn btn--primary btn--lg">Sign In</a>
          <p class="rpt-auth-prompt__signup">Don't have an account? <a href="/signup.html">Create one</a></p>
        </div>
      `;
      return;
    }

    try {
      const response = await Api.get(`/reports?page=${this.currentPage}&limit=${CONFIG.DEFAULT_PAGE_SIZE}`);
      if (!response.success) {
        container.innerHTML = `<div class="rpt-auth-prompt"><p>Failed to load reports.</p></div>`;
        return;
      }

      if (response.data.length === 0) {
        container.innerHTML = `
          <div class="rpt-auth-prompt">
            <div class="rpt-auth-prompt__icon">\uD83D\uDCC4</div>
            <h3>No Reports Yet</h3>
            <p>You don't have any medical reports yet. They will appear here once your doctor uploads them.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="table-container">
          <table class="rpt-reports-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Type</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Size</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${response.data.map(r => `
                <tr>
                  <td><strong>${this.escapeHtml(r.title)}</strong></td>
                  <td><span class="badge badge--info">${this.escapeHtml(r.category || 'General')}</span></td>
                  <td>${this.statusBadge(r.report_type)}</td>
                  <td>${this.escapeHtml(r.doctor_name || '\u2014')}</td>
                  <td>${UI.formatDate(r.created_at)}</td>
                  <td><span class="text-sm text-muted">${this.formatBytes(r.file_size)}</span></td>
                  <td>
                    ${r.file_url ? `<button onclick="Reports.downloadReport(${r.id}, '${(r.original_filename || 'medical_report.pdf').replace(/'/g, "\\'")}')" class="btn btn--sm btn--primary">Download</button>` : '<span class="text-muted text-sm">N/A</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${UI.renderPagination(response.pagination, 'Reports.goToPage')}
      `;
    } catch (error) {
      UI.showToast('Failed to load reports.', 'error');
    }
  },

  formatBytes(bytes, decimals = 1) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  statusBadge(type) {
    const map = CONFIG.STATUS_BADGES || {};
    const badgeClass = map[type] || 'badge--gray';
    const label = (type || 'other').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `<span class="badge ${badgeClass}">${label}</span>`;
  },

  async downloadReport(id, filename) {
    try {
      const token = localStorage.getItem(CONFIG.TOKEN_KEY) || sessionStorage.getItem(CONFIG.TOKEN_KEY);
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${CONFIG.API_BASE_URL}/reports/${id}/download`, {
        method: 'GET',
        headers: headers
      });
      if (!response.ok) {
        throw new Error('Failed to download report');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename || 'medical-report.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      UI.showToast('Report downloaded successfully.', 'success');
    } catch (error) {
      console.error(error);
      UI.showToast('Failed to download report.', 'error');
    }
  },

  goToPage(page) {
    this.currentPage = page;
    this.loadReports();
  },

  // ── Section 9: FAQ ──
  async loadFAQs() {
    const container = document.getElementById('rpt-faq-list');
    if (!container) return;

    try {
      const response = await Api.get('/cms/faqs');
      if (response.success && response.data.length > 0) {
        container.innerHTML = response.data.map(faq => `
          <div class="rpt-faq-item">
            <button class="rpt-faq-question" data-rpt-faq-toggle>
              <span>${this.escapeHtml(faq.question)}</span>
              <span class="rpt-faq-toggle">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </button>
            <div class="rpt-faq-answer">
              <div class="rpt-faq-answer-inner">${this.escapeHtml(faq.answer)}</div>
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
      { q: 'How do I access my medical reports?', a: 'Simply log in to your MediConnect account and navigate to the Medical Reports page. All your reports that have been shared with you will be listed there.' },
      { q: 'What types of reports can I view?', a: 'You can view lab test results, prescriptions, imaging reports (X-ray, MRI, CT scan), discharge summaries, consultation notes, and other medical documents uploaded by your healthcare providers.' },
      { q: 'How are reports uploaded?', a: 'Reports are uploaded by your doctor or healthcare provider directly through our secure platform. Lab results are automatically uploaded when tests are completed.' },
      { q: 'Can I share my reports with another doctor?', a: 'Yes! You can download any report as PDF and share it directly. Coming soon: secure link sharing with controlled access.' },
      { q: 'Is my data secure?', a: 'Absolutely. All reports are encrypted at rest and in transit. Access is role-based and every action is logged in our HIPAA-compliant audit trail.' },
      { q: 'How long are reports stored?', a: 'Your medical reports are stored securely for as long as your account is active. We recommend downloading important reports for your personal records.' },
      { q: 'Can I upload my own reports?', a: 'Currently, reports are uploaded by healthcare providers. If you have external reports you\'d like to add, please share them with your doctor who can upload them to your record.' },
      { q: 'How do I download a report?', a: 'Click the "Download" button next to any report in your list. The file will be downloaded as a PDF (or original format) to your device.' },
    ];
    return faqs.map(faq => `
      <div class="rpt-faq-item">
        <button class="rpt-faq-question" data-rpt-faq-toggle>
          <span>${this.escapeHtml(faq.q)}</span>
          <span class="rpt-faq-toggle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </span>
        </button>
        <div class="rpt-faq-answer">
          <div class="rpt-faq-answer-inner">${this.escapeHtml(faq.a)}</div>
        </div>
      </div>
    `).join('');
  },

  toggleFaq(btn) {
    const item = btn.closest('.rpt-faq-item');
    if (!item) return;
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.rpt-faq-item.open').forEach(el => {
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
            const target = parseFloat(counter.dataset.target);
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
    const isDecimal = target % 1 !== 0;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        el.textContent = isDecimal ? target.toFixed(1) : target;
        clearInterval(timer);
      } else {
        el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
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
