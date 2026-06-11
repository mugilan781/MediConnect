// ============================================================
// MediConnect – public/js/homepage.js
// Dynamic homepage content loader with graceful fallback
// ============================================================

const Homepage = {
  data: null,

  /**
   * Initialize homepage – fetch CMS data and render dynamic sections
   */
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
      // Static HTML content is already in place – no action needed
      // Just hide any loading indicators
      this.hideLoadingStates();
    }
  },

  /**
   * Render all dynamic sections from the API response
   */
  renderAll() {
    const { sections, doctors, labTests, statistics, contactInfo } = this.data;

    // Update CMS-driven text sections
    if (sections.hero) this.renderHero(sections.hero);
    if (sections.features) this.renderFeatures(sections.features);
    if (sections.cta) this.renderCTA(sections.cta);
    if (sections.footer) this.renderFooter(sections.footer);

    // Render live data sections
    if (statistics) this.renderStatistics(statistics, sections.stats);
    if (doctors && doctors.length > 0) this.renderDoctors(doctors);
    if (labTests && labTests.length > 0) this.renderLabTests(labTests);
    if (contactInfo && Object.keys(contactInfo).length > 0) this.renderContact(contactInfo);

    // Hide loading states
    this.hideLoadingStates();

    // Trigger scroll animations
    this.initScrollAnimations();
  },

  // ── Hero Section ──────────────────────────────────────────
  renderHero(hero) {
    const titleEl = document.getElementById('hero-title');
    const subtitleEl = document.getElementById('hero-subtitle');

    if (titleEl && hero.title) {
      titleEl.innerHTML = `${this.escapeHtml(hero.title)} <span>${this.escapeHtml(hero.highlight || '')}</span> ${this.escapeHtml(hero.title_suffix || '')}`;
    }
    if (subtitleEl && hero.subtitle) {
      subtitleEl.textContent = hero.subtitle;
    }
  },

  // ── Features Section ──────────────────────────────────────
  renderFeatures(features) {
    const titleEl = document.getElementById('features-title');
    const subtitleEl = document.getElementById('features-subtitle');
    const gridEl = document.getElementById('features-grid');

    if (titleEl && features.title) titleEl.textContent = features.title;
    if (subtitleEl && features.subtitle) subtitleEl.textContent = features.subtitle;

    if (gridEl && features.cards && features.cards.length > 0) {
      gridEl.innerHTML = features.cards.map(card => `
        <div class="feature-card section-animate">
          <div class="feature-card__icon">${this.escapeHtml(card.icon)}</div>
          <h3 class="feature-card__title">${this.escapeHtml(card.title)}</h3>
          <p class="feature-card__desc">${this.escapeHtml(card.description)}</p>
        </div>
      `).join('');
    }
  },

  // ── CTA Section ───────────────────────────────────────────
  renderCTA(cta) {
    const titleEl = document.getElementById('cta-title');
    const subtitleEl = document.getElementById('cta-subtitle');
    const btnEl = document.getElementById('cta-button');

    if (titleEl && cta.title) titleEl.textContent = cta.title;
    if (subtitleEl && cta.subtitle) subtitleEl.textContent = cta.subtitle;
    if (btnEl && cta.button_text) {
      btnEl.textContent = cta.button_text;
      if (cta.button_link) btnEl.href = cta.button_link;
    }
  },

  // ── Footer Section ────────────────────────────────────────
  renderFooter(footer) {
    const brandEl = document.getElementById('footer-brand');
    const descEl = document.getElementById('footer-desc');
    const copyEl = document.getElementById('footer-copyright');

    if (brandEl && footer.brand_name) brandEl.textContent = footer.brand_name;
    if (descEl && footer.brand_description) descEl.textContent = footer.brand_description;
    if (copyEl && footer.copyright_year) {
      copyEl.innerHTML = `&copy; ${this.escapeHtml(footer.copyright_year)} MediConnect. All rights reserved.`;
    }
  },

  // ── Statistics Section ────────────────────────────────────
  renderStatistics(stats, sectionConfig) {
    const container = document.getElementById('stats-section');
    if (!container) return;

    const title = sectionConfig?.title || 'Trusted by Healthcare Professionals';
    const subtitle = sectionConfig?.subtitle || 'Our platform powers clinics and hospitals across the country.';

    const statItems = [
      { icon: '👨‍⚕️', value: stats.total_doctors || 0, label: 'Doctors', suffix: '+' },
      { icon: '👥', value: stats.total_patients || 0, label: 'Patients', suffix: '+' },
      { icon: '📅', value: stats.total_appointments || 0, label: 'Appointments', suffix: '+' },
      { icon: '🔬', value: stats.total_lab_tests || 0, label: 'Lab Tests', suffix: '' },
    ];

    container.innerHTML = `
      <h2 class="stats-section__title">${this.escapeHtml(title)}</h2>
      <p class="stats-section__subtitle">${this.escapeHtml(subtitle)}</p>
      <div class="stats-grid">
        ${statItems.map(item => `
          <div class="stat-card section-animate">
            <div class="stat-card__icon">${item.icon}</div>
            <div class="stat-card__number" data-target="${item.value}">0</div>
            <div class="stat-card__label">${this.escapeHtml(item.label)}</div>
          </div>
        `).join('')}
      </div>
    `;

    // Animate counters when visible
    this.observeCounters(container);
  },

  // ── Doctors Section ───────────────────────────────────────
  renderDoctors(doctors) {
    const container = document.getElementById('doctors-section');
    if (!container) return;

    container.innerHTML = `
      <div class="doctors-section__header">
        <h2 class="doctors-section__title">Our Expert Doctors</h2>
        <p class="doctors-section__subtitle">Experienced healthcare professionals ready to provide you with the best care.</p>
      </div>
      <div class="doctors-grid">
        ${doctors.map(doc => {
          const initials = this.getInitials(doc.full_name);
          const avatar = doc.avatar_url
            ? `<img src="${this.escapeHtml(doc.avatar_url)}" alt="${this.escapeHtml(doc.full_name)}">`
            : initials;

          return `
            <div class="doctor-card section-animate">
              <div class="doctor-card__avatar">${avatar}</div>
              <div class="doctor-card__info">
                <div class="doctor-card__name">${this.escapeHtml(doc.full_name)}</div>
                <div class="doctor-card__specialization">${this.escapeHtml(doc.specialization)}</div>
                <div class="doctor-card__meta">
                  <span>🎓 ${doc.experience_years} yrs exp</span>
                  <span class="doctor-card__fee">₹${Number(doc.consultation_fee).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="text-align: center;">
        <a href="/signup.html" class="section-view-all">View All Doctors →</a>
      </div>
    `;
  },

  // ── Lab Tests Section ─────────────────────────────────────
  renderLabTests(labTests) {
    const container = document.getElementById('lab-tests-section');
    if (!container) return;

    container.innerHTML = `
      <div class="lab-tests-section__header">
        <h2 class="lab-tests-section__title">Popular Lab Tests</h2>
        <p class="lab-tests-section__subtitle">Book diagnostic tests at affordable prices with quick turnaround times.</p>
      </div>
      <div class="lab-tests-grid">
        ${labTests.map(test => `
          <div class="lab-test-card section-animate">
            <div class="lab-test-card__header">
              <span class="lab-test-card__category">${this.escapeHtml(test.category || 'General')}</span>
              <span class="lab-test-card__price">₹${Number(test.price).toLocaleString('en-IN')}</span>
            </div>
            <h3 class="lab-test-card__name">${this.escapeHtml(test.test_name)}</h3>
            <p class="lab-test-card__desc">${this.escapeHtml(test.description || '')}</p>
            <div class="lab-test-card__footer">
              <span class="lab-test-card__turnaround">⏱️ ${test.turnaround_hours}h results</span>
              <a href="/signup.html" class="lab-test-card__book-btn">Book Now</a>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="text-align: center;">
        <a href="/signup.html" class="section-view-all">View All Lab Tests →</a>
      </div>
    `;
  },

  // ── Contact Section ───────────────────────────────────────
  renderContact(info) {
    const container = document.getElementById('contact-section');
    if (!container) return;

    const contactItems = [];

    if (info.clinic_name) {
      contactItems.push({ icon: '🏥', label: 'Clinic', value: info.clinic_name });
    }
    if (info.clinic_phone) {
      contactItems.push({ icon: '📞', label: 'Phone', value: info.clinic_phone });
    }
    if (info.clinic_email) {
      contactItems.push({ icon: '✉️', label: 'Email', value: info.clinic_email });
    }
    if (info.clinic_address) {
      contactItems.push({ icon: '📍', label: 'Address', value: info.clinic_address });
    }

    if (contactItems.length === 0) return;

    container.innerHTML = `
      <div class="contact-section__header">
        <h2 class="contact-section__title">Get in Touch</h2>
        <p class="contact-section__subtitle">We're here to help. Reach out to us for appointments, inquiries, or support.</p>
      </div>
      <div class="contact-grid">
        ${contactItems.map(item => `
          <div class="contact-card section-animate">
            <div class="contact-card__icon">${item.icon}</div>
            <div class="contact-card__label">${this.escapeHtml(item.label)}</div>
            <div class="contact-card__value">${this.escapeHtml(item.value)}</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // ── Animated Number Counters ──────────────────────────────
  observeCounters(container) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const counters = container.querySelectorAll('.stat-card__number');
          counters.forEach(counter => this.animateCounter(counter));
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    observer.observe(container);
  },

  animateCounter(el) {
    const target = parseInt(el.getAttribute('data-target'), 10) || 0;
    if (target === 0) {
      el.textContent = '0';
      return;
    }

    const duration = 1500; // ms
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      el.textContent = current.toLocaleString('en-IN') + '+';
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target.toLocaleString('en-IN') + '+';
      }
    };

    requestAnimationFrame(step);
  },

  // ── Scroll Animations ─────────────────────────────────────
  initScrollAnimations() {
    const animElements = document.querySelectorAll('.section-animate');
    if (!animElements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    animElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });
  },

  // ── Loading States ────────────────────────────────────────
  hideLoadingStates() {
    document.querySelectorAll('.homepage-loading').forEach(el => {
      el.style.display = 'none';
    });
  },

  // ── Utilities ─────────────────────────────────────────────
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Homepage.init();
});
