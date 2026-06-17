const ServicesPage = {
  data: null,

  async init() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/cms/page/services`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.success && result.data) {
        this.data = result.data;
        this.renderAll();
      }
    } catch (error) {
      console.warn('Services CMS: Using static fallback.', error.message);
    }
    this.initScrollAnimations();
  },

  renderAll() {
    const { page, sections } = this.data;

    if (typeof UI !== 'undefined' && UI.injectSEO && page) {
      UI.injectSEO(page);
    }

    if (sections) {
      if (sections.hero) this.renderHero(sections.hero);
      if (sections.categories) this.renderCategories(sections.categories);
      if (sections.appointments) this.renderDetail('appointment-management', sections.appointments);
      if (sections.consultation) this.renderDetail('online-consultation', sections.consultation);
      if (sections.labTests) this.renderDetail('lab-test-booking', sections.labTests);
      if (sections.sampleCollection) this.renderDetail('sample-collection', sections.sampleCollection);
      if (sections.medicalReports) this.renderDetail('medical-reports', sections.medicalReports);
      if (sections.patientHistory) this.renderDetail('patient-history', sections.patientHistory);
      if (sections.notifications) this.renderDetail('notifications', sections.notifications);
      if (sections.clinic) this.renderDetail('clinic-management', sections.clinic);
      if (sections.analytics) this.renderDetail('analytics', sections.analytics);
      if (sections.faq) this.renderFAQ(sections.faq);
      if (sections.cta) this.renderCTA(sections.cta);
    }
    this.initScrollAnimations();
  },

  renderHero(hero) {
    const h1 = document.querySelector('.services-hero h1');
    if (h1 && hero.title) {
      let titleText = hero.title;
      if (titleText.endsWith(',')) {
        titleText = titleText.slice(0, -1);
      }
      h1.innerHTML = this.escapeHtml(titleText)
        .replace('Health', '<span class="text-gradient">Health</span>')
        .replace('Services', '<span class="text-gradient">Services</span>');
    }
    const p = document.querySelector('.services-hero p');
    if (p && hero.subtitle) p.textContent = hero.subtitle;
  },

  renderCategories(categories) {
    const grid = document.querySelector('.categories-grid');
    if (!grid || !categories.length) return;
    grid.innerHTML = categories.map(cat => `
      <a href="${this.escapeHtml(cat.link || '#')}" class="cat-card">
        <div class="cat-card__icon">${MediIcons.getIconHtml(cat.icon || 'star')}</div>
        <div class="cat-card__title">${this.escapeHtml(cat.title || '')}</div>
      </a>
    `).join('');
  },

  renderDetail(sectionId, data) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const badge = section.querySelector('.service-detail__badge');
    if (badge && data.badge) badge.textContent = data.badge;
    const heading = section.querySelector('h2');
    if (heading && data.title) heading.textContent = data.title;
    const desc = section.querySelector('p');
    if (desc && data.description) desc.textContent = data.description;
    const visualTitle = section.querySelector('.service-detail__visual-title');
    if (visualTitle && data.visual_title) visualTitle.textContent = data.visual_title;
    const visualDesc = section.querySelector('.service-detail__visual-desc');
    if (visualDesc && data.visual_desc) visualDesc.textContent = data.visual_desc;
    const visualIcon = section.querySelector('.service-detail__visual-icon');
    if (visualIcon && data.icon) visualIcon.textContent = data.icon;
    const ul = section.querySelector('.service-benefits');
    if (ul && data.benefits && data.benefits.length > 0) {
      ul.innerHTML = data.benefits.map(b => `<li>${this.escapeHtml(b)}</li>`).join('');
    }
    const cta = section.querySelector('.service-cta');
    if (cta && data.cta_text) cta.textContent = data.cta_text;
    if (cta && data.cta_link) cta.href = data.cta_link;
  },

  renderFAQ(faq) {
    const list = document.getElementById('services-faq-list') || document.querySelector('.faq-preview-list');
    if (!list || !faq.length) return;
    list.innerHTML = faq.map((item, i) => `
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
  },

  renderCTA(cta) {
    const section = document.querySelector('.services-cta');
    if (!section) return;
    const h2 = section.querySelector('h2');
    if (h2 && cta.title) h2.textContent = cta.title;
    const p = section.querySelector('p');
    if (p && cta.subtitle) p.textContent = cta.subtitle;
    const btn = section.querySelector('.btn');
    if (btn && cta.button_text) btn.textContent = cta.button_text;
    if (btn && cta.button_link) btn.href = cta.button_link;
  },

  initScrollAnimations() {
    const els = document.querySelectorAll('.animate-on-scroll');
    if (els.length) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      els.forEach(el => observer.observe(el));
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  ServicesPage.init();
});
