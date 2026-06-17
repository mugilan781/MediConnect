const Homepage = {
  data: null,

  async init() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/cms/homepage`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.success && result.data) {
        this.data = result.data;
        if (typeof UI !== 'undefined' && UI.injectSEO && this.data.page) {
          UI.injectSEO(this.data.page);
        }
        this.renderAll();
      }
    } catch (error) {
      console.warn('Homepage CMS: Using static fallback.', error.message);
      this.hideLoadingStates();
    }

    // Always init scroll animations and counters, even without API data
    this.initScrollAnimations();
  },

  renderAll() {
    const { sections, doctors, labTests, statistics, contactInfo } = this.data;

    if (sections.hero) this.renderHero(sections.hero);
    if (sections.features) this.renderFeatures(sections.features);
    if (sections.cta) this.renderCTA(sections.cta);
    if (statistics) this.renderStatistics(statistics);
    if (doctors && doctors.length > 0) this.renderDoctors(doctors);
    if (labTests && labTests.length > 0) this.renderLabTests(labTests);
    if (contactInfo && Object.keys(contactInfo).length > 0) this.renderContact(contactInfo);

    this.hideLoadingStates();
    this.initScrollAnimations();
  },

  // ── Hero ──
  renderHero(hero) {
    const titleEl = document.getElementById('hero-title');
    const subtitleEl = document.getElementById('hero-subtitle');
    const badgeEl = document.getElementById('hero-badge');

    if (titleEl && hero.title) {
      titleEl.innerHTML = `${this.escapeHtml(hero.title)} <span class="highlight">${this.escapeHtml(hero.highlight || 'Intelligently')}</span> ${this.escapeHtml(hero.title_suffix || 'Managed')}`;
    }
    if (subtitleEl && hero.subtitle) {
      subtitleEl.textContent = hero.subtitle;
    }
    if (badgeEl && hero.badge) {
      badgeEl.textContent = hero.badge;
    }
  },

  // ── Why Choose (Features) ──
  renderFeatures(features) {
    const titleEl = document.getElementById('features-title');
    const gridEl = document.getElementById('why-grid');

    if (titleEl && features.title) titleEl.textContent = features.title;

    if (gridEl && features.cards && features.cards.length > 0) {
      gridEl.innerHTML = features.cards.map(card => `
        <div class="why-card animate-on-scroll">
          <div class="why-card__icon">${MediIcons.getIconHtml(card.icon || 'star')}</div>
          <h3 class="why-card__title">${this.escapeHtml(card.title)}</h3>
          <p class="why-card__desc">${this.escapeHtml(card.description || card.desc)}</p>
        </div>
      `).join('');
    }
  },

  // ── CTA ──
  renderCTA(cta) {
    const titleEl = document.getElementById('cta-title');
    const subtitleEl = document.getElementById('cta-subtitle');
    const btnEl = document.getElementById('cta-button');

    if (titleEl && cta.title) titleEl.textContent = cta.title;
    if (subtitleEl && cta.subtitle) subtitleEl.textContent = cta.subtitle;
    if (btnEl && cta.button_text) {
      btnEl.textContent = `Get Started Free ${cta.button_text || '→'}`;
      if (cta.button_link) btnEl.href = cta.button_link;
    }
  },

  // ── Statistics (updates existing grid) ──
  renderStatistics(stats) {
    const setStat = (id, value) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.setAttribute('data-target', value);
      el.textContent = '0';
    };

    if (stats.total_patients) setStat('stat-patients', stats.total_patients);
    if (stats.total_doctors) setStat('stat-doctors', stats.total_doctors);
    if (stats.total_appointments) setStat('stat-appointments', stats.total_appointments);
    if (stats.total_lab_tests) setStat('stat-labtests', stats.total_lab_tests);
  },

  // ── Doctors (renders into #doctors-grid) ──
  renderDoctors(doctors) {
    const container = document.getElementById('doctors-grid');
    if (!container) return;

    container.innerHTML = doctors.slice(0, 6).map(doc => {
      const initials = this.getInitials(doc.full_name);
      const avatar = doc.avatar_url
        ? `<img src="${this.escapeHtml(doc.avatar_url)}" alt="${this.escapeHtml(doc.full_name)}">`
        : initials;

      return `
        <a href="/doctors.html" class="doctor-card animate-on-scroll">
          <div class="doctor-card__avatar">${avatar}</div>
          <div class="doctor-card__info">
            <div class="doctor-card__name">${this.escapeHtml(doc.full_name)}</div>
            <div class="doctor-card__specialization">${this.escapeHtml(doc.specialization)}</div>
            <div class="doctor-card__meta">
              <span>${MediIcons.icon('clipboard')} ${doc.experience_years || 0} yrs exp</span>
              <span class="doctor-card__fee">₹${Number(doc.consultation_fee || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </a>
      `;
    }).join('');
  },

  // ── Lab Tests (renders into #lab-tests-grid) ──
  renderLabTests(labTests) {
    const container = document.getElementById('lab-tests-grid');
    if (!container) return;

    container.innerHTML = labTests.slice(0, 6).map(test => `
      <div class="lab-test-card animate-on-scroll">
        <div class="lab-test-card__header">
          <span class="lab-test-card__category">${this.escapeHtml(test.category || 'Diagnostic')}</span>
          <span class="lab-test-card__price">₹${Number(test.price || 0).toLocaleString('en-IN')}</span>
        </div>
        <h3 class="lab-test-card__name">${this.escapeHtml(test.test_name)}</h3>
        <p class="lab-test-card__desc">${this.escapeHtml(test.description || 'Comprehensive diagnostic test')}</p>
        <div class="lab-test-card__footer">
          <span>${MediIcons.icon('clock')} ${test.turnaround_hours || 24}h results</span>
          <a href="/lab-tests.html" class="lab-test-card__book-btn">Book Now</a>
        </div>
      </div>
    `).join('');
  },

  // ── Contact ──
  renderContact(info) {
    const container = document.getElementById('contact-section');
    if (!container) return;

    const items = [];
    if (info.clinic_name) items.push({ icon: 'hospital', label: 'Clinic', value: info.clinic_name });
    if (info.clinic_phone) items.push({ icon: 'phone', label: 'Phone', value: info.clinic_phone });
    if (info.clinic_email) items.push({ icon: 'mail', label: 'Email', value: info.clinic_email });
    if (info.clinic_address) items.push({ icon: 'pin', label: 'Address', value: info.clinic_address });

    if (items.length === 0) return;

    container.innerHTML = `
      <div class="section-header">
        <span class="section-header__label">Contact</span>
        <h2 class="section-header__title">Get in Touch</h2>
        <p class="section-header__subtitle">We're here to help. Reach out to us for appointments, inquiries, or support.</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-6);margin-top:var(--space-8);">
        ${items.map(item => `
          <div style="padding:var(--space-6);border-radius:var(--radius-xl);border:1px solid var(--color-border);text-align:center;">
            <div style="font-size:2rem;margin-bottom:var(--space-3);height:1em;display:flex;justify-content:center;align-items:center;">${MediIcons.icon(item.icon)}</div>
            <div style="font-size:var(--font-size-sm);color:var(--color-text-light);margin-bottom:var(--space-1);">${this.escapeHtml(item.label)}</div>
            <div style="font-size:var(--font-size-base);font-weight:var(--font-weight-semibold);color:var(--color-gray-800);">${this.escapeHtml(item.value)}</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // ── Counter animation for stats section ──
  observeCounters() {
    if (this._countersObserved) return;
    this._countersObserved = true;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const counters = entry.target.querySelectorAll('.stat-card__number');
          counters.forEach(counter => this.animateCounter(counter));
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    const grid = document.getElementById('stats-grid');
    if (grid) observer.observe(grid);
  },

  animateCounter(el) {
    const target = parseInt(el.getAttribute('data-target'), 10) || 0;
    if (target === 0) { el.textContent = '0'; return; }

    const duration = 2000;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      el.textContent = current.toLocaleString('en-IN');
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target.toLocaleString('en-IN');
      }
    };

    requestAnimationFrame(step);
  },

  // ── Scroll Animations ──
  initScrollAnimations() {
    const els = document.querySelectorAll('.animate-on-scroll');
    if (!els.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    els.forEach(el => observer.observe(el));

    // Also trigger counter animation on stats section
    this.observeCounters();
  },

  // ── Loading States ──
  hideLoadingStates() {
    document.querySelectorAll('.homepage-loading').forEach(el => {
      el.style.display = 'none';
    });
  },

  // ── Utilities ──
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  getInitials(name) {
    if (!name) return '?';
    return name.split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  },
};

function toggleFaq(btn) {
  const item = btn.closest('.faq-preview-item');
  const answer = item.querySelector('.faq-preview-answer');
  const isOpen = btn.classList.contains('open');

  // Close all other open FAQs
  document.querySelectorAll('.faq-preview-question.open').forEach(q => {
    if (q !== btn) {
      q.classList.remove('open');
      const ans = q.closest('.faq-preview-item').querySelector('.faq-preview-answer');
      if (ans) ans.style.maxHeight = null;
    }
  });

  if (isOpen) {
    btn.classList.remove('open');
    if (answer) answer.style.maxHeight = null;
  } else {
    btn.classList.add('open');
    if (answer) answer.style.maxHeight = answer.scrollHeight + 'px';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  Homepage.init();
});
