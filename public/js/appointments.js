const AppointmentsPage = {
  cmsData: null,

  async init() {
    await this.loadCMS();
    await this.loadDoctors();
    this.initScrollAnimations();
  },

  // ── CMS ──
  async loadCMS() {
    try {
      const r = await fetch(`${CONFIG.API_BASE_URL}/cms/page/appointments`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const res = await r.json();
      if (res.success && res.data) {
        this.cmsData = res.data;
        this.renderCMS();
      }
    } catch (e) {
      console.warn('Appointments CMS: Using static fallback.', e.message);
    }
  },

  renderCMS() {
    const d = this.cmsData;
    if (!d) return;
    const { page, sections } = d;
    if (page && typeof UI !== 'undefined' && UI.injectSEO) UI.injectSEO(page);
    if (!sections) return;

    const setText = (sel, val) => { const el = document.querySelector(sel); if (el && val) el.textContent = val; };
    const setHTML = (sel, val) => { const el = document.querySelector(sel); if (el && val) el.innerHTML = val; };
    const setAttr = (sel, attr, val) => { const el = document.querySelector(sel); if (el && val) el.setAttribute(attr, val); };

    if (sections.hero) {
      setHTML('.appt-hero__title', sections.hero.title);
      setText('.appt-hero__desc', sections.hero.subtitle);
      if (sections.hero.badge) setText('.appt-hero__badge', sections.hero.badge);
    }
    if (sections.cta) {
      setText('.appt-cta h2', sections.cta.title);
      setText('.appt-cta p', sections.cta.subtitle);
    }
    if (sections.faq && sections.faq.length) {
      const list = document.getElementById('appt-faq-list');
      if (list) {
        list.innerHTML = sections.faq.map(item => `
          <div class="faq-preview-item">
            <button class="faq-preview-question" onclick="toggleFaq(this)">
              ${this.escapeHtml(item.question || '')}
              <span class="faq-chevron">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            </button>
            <div class="faq-preview-answer">
              <div class="faq-preview-answer-inner">${this.escapeHtml(item.answer || '')}</div>
            </div>
          </div>
        `).join('');
      }
    }
    if (sections.timeline && sections.timeline.length) {
      const container = document.getElementById('appt-timeline-steps');
      if (container) {
        container.innerHTML = sections.timeline.map((step, i) => `
          <div class="timeline-step">
            <div class="timeline-step__number">${i + 1}</div>
            <div class="timeline-step__content">
              <h3>${this.escapeHtml(step.title || '')}</h3>
              <p>${this.escapeHtml(step.description || '')}</p>
            </div>
          </div>
        `).join('');
      }
    }
    if (sections.experiences && sections.experiences.length) {
      const grid = document.getElementById('appt-experience-grid');
      if (grid) {
        grid.innerHTML = sections.experiences.map(exp => {
          const stars = '★'.repeat(exp.rating || 5);
          const initial = exp.name ? exp.name.charAt(0).toUpperCase() : '?';
          return `
            <div class="exp-card">
              <div class="exp-card__rating">${stars}</div>
              <p class="exp-card__text">${this.escapeHtml(exp.text || '')}</p>
              <div class="exp-card__author">
                <div class="exp-card__avatar">${initial}</div>
                <div><div class="exp-card__name">${this.escapeHtml(exp.name || '')}</div><div class="exp-card__role">${this.escapeHtml(exp.role || '')}</div></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  },

  // ── DOCTORS PREVIEW ──
  async loadDoctors() {
    try {
      const response = await Api.get('/doctors?limit=4&is_available=1');
      if (!response.success || !response.data) return;

      const grid = document.getElementById('appt-doctors-grid');
      if (!grid) return;

      grid.innerHTML = response.data.map(doc => {
        const initial = doc.full_name ? doc.full_name.charAt(0).toUpperCase() : 'D';
        const fee = parseFloat(doc.consultation_fee || 0).toFixed(2);
        return `
          <div class="appt-doctor-card">
            <div class="appt-doctor-card__top">
              <div class="appt-doctor-card__avatar">${initial}</div>
              <div class="appt-doctor-card__info">
                <div class="appt-doctor-card__name">${doc.full_name}</div>
                <div class="appt-doctor-card__spec">${doc.specialization}</div>
              </div>
            </div>
            <div class="appt-doctor-card__meta">
              <span>${MediIcons.icon('clipboard')} ${doc.qualification}</span>
              <span>${MediIcons.icon('file')} ${doc.experience_years} yrs</span>
              <span>${MediIcons.icon('chart')} ₹${fee}</span>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.warn('Doctor preview load failed:', e);
    }
  },


  // ── SCROLL ANIMATIONS ──
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
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  AppointmentsPage.init();
});
