const ConsultPage = {
  cmsData: null,

  async init() {
    await this.loadCMS();
    await this.loadDoctors();
    this.initScrollAnimations();
  },

  // ── CMS ──
  async loadCMS() {
    try {
      const r = await fetch(`${CONFIG.API_BASE_URL}/cms/page/online-consultation`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const res = await r.json();
      if (res.success && res.data) {
        this.cmsData = res.data;
        this.renderCMS();
      }
    } catch (e) {
      console.warn('Consultation CMS: Using static fallback.', e.message);
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

    if (sections.hero) {
      setHTML('.consult-hero__title', sections.hero.title);
      setText('.consult-hero__desc', sections.hero.subtitle);
      if (sections.hero.badge) setText('.consult-hero__badge', sections.hero.badge);
    }
    if (sections.cta) {
      setText('.consult-cta h2', sections.cta.title);
      setText('.consult-cta p', sections.cta.subtitle);
    }
    if (sections.faq && sections.faq.length) {
      const list = document.getElementById('consult-faq-list');
      if (list) {
        list.innerHTML = sections.faq.map(item => `
          <div class="consult-faq-item">
            <button class="consult-faq-question" onclick="ConsultPage.toggleFaq(this)">
              ${this.escapeHtml(item.question || '')}
              <span class="icon">▼</span>
            </button>
            <div class="consult-faq-answer">
              <div class="consult-faq-answer-inner">${this.escapeHtml(item.answer || '')}</div>
            </div>
          </div>
        `).join('');
      }
    }
    if (sections.timeline && sections.timeline.length) {
      const container = document.querySelector('.consult-timeline');
      if (container) {
        container.innerHTML = sections.timeline.map((step, i) => `
          <div class="consult-tl-step">
            <div class="consult-tl-step__num">${i + 1}</div>
            <div class="consult-tl-step__content">
              <h3>${this.escapeHtml(step.title || '')}</h3>
              <p>${this.escapeHtml(step.description || '')}</p>
            </div>
          </div>
        `).join('');
      }
    }
    if (sections.testimonials && sections.testimonials.length) {
      const grid = document.getElementById('consult-test-grid');
      if (grid) {
        grid.innerHTML = sections.testimonials.map(t => {
          const stars = '★'.repeat(t.rating || 5);
          const initial = t.name ? t.name.charAt(0).toUpperCase() : '?';
          return `
            <div class="consult-test-card">
              <div class="consult-test-card__stars">${stars}</div>
              <p class="consult-test-card__text">${this.escapeHtml(t.text || '')}</p>
              <div class="consult-test-card__author">
                <div class="consult-test-card__avatar">${initial}</div>
                <div><div class="consult-test-card__name">${this.escapeHtml(t.name || '')}</div><div class="consult-test-card__role">${this.escapeHtml(t.role || '')}</div></div>
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

      const grid = document.getElementById('consult-doctors-grid');
      if (!grid) return;

      grid.innerHTML = response.data.map(doc => {
        const initial = doc.full_name ? doc.full_name.charAt(0).toUpperCase() : 'D';
        const fee = parseFloat(doc.consultation_fee || 0).toFixed(2);
        return `
          <div class="consult-doc-card">
            <div class="consult-doc-card__top">
              <div class="consult-doc-card__avatar">${initial}</div>
              <div class="consult-doc-card__info">
                <div class="consult-doc-card__name">${doc.full_name}</div>
                <div class="consult-doc-card__spec">${doc.specialization}</div>
              </div>
            </div>
            <div class="consult-doc-card__meta">
              <span>🎓 ${doc.qualification}</span>
              <span>💼 ${doc.experience_years} yrs</span>
              <span>💰 ₹${fee}</span>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.warn('Doctor preview load failed:', e);
    }
  },

  // ── FAQ ──
  toggleFaq(btn) {
    const item = btn.closest('.consult-faq-item');
    const isOpen = item.classList.contains('is-open');
    document.querySelectorAll('.consult-faq-item.is-open').forEach(el => el.classList.remove('is-open'));
    if (!isOpen) item.classList.add('is-open');
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
  ConsultPage.init();
});
