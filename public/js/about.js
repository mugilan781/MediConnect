// ============================================================
// MediConnect – public/js/about.js
// Dynamic About Us content loader with graceful fallback
// ============================================================

const AboutPage = {
  data: null,

  async init() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/cms/page/about`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.success && result.data) {
        this.data = result.data;
        this.render();
      }
    } catch (error) {
      console.warn('About CMS: Using static fallback.', error.message);
    }
  },

  render() {
    const { page, sections } = this.data;

    // 1. Inject SEO Metadata
    if (typeof UI !== 'undefined' && UI.injectSEO && page) {
      UI.injectSEO(page);
    }

    // 2. Render Page Content Sections
    const aboutData = sections && sections.about;
    if (!aboutData) return;

    const heroTitleEl = document.getElementById('about-hero-title');
    const heroSubtitleEl = document.getElementById('about-hero-subtitle');
    const mainTitleEl = document.getElementById('about-main-title');
    const mainDescEl = document.getElementById('about-main-desc');
    const mainDescSecondaryEl = document.getElementById('about-main-desc-secondary');
    const missionTitleEl = document.getElementById('about-mission-title');
    const missionDescEl = document.getElementById('about-mission-desc');
    const visionTitleEl = document.getElementById('about-vision-title');
    const visionDescEl = document.getElementById('about-vision-desc');
    const valuesGridEl = document.getElementById('about-values-grid');

    if (heroTitleEl && aboutData.title) {
      heroTitleEl.innerHTML = this.escapeHtml(aboutData.title).replace('MediConnect', '<span class="text-primary">MediConnect</span>');
    }
    if (heroSubtitleEl && aboutData.subtitle) {
      heroSubtitleEl.textContent = aboutData.subtitle;
    }
    if (mainTitleEl && aboutData.title) {
      mainTitleEl.textContent = aboutData.title;
    }
    if (mainDescEl && aboutData.description) {
      mainDescEl.textContent = aboutData.description;
    }
    if (mainDescSecondaryEl && aboutData.description_secondary) {
      mainDescSecondaryEl.textContent = aboutData.description_secondary;
    }
    if (missionTitleEl && aboutData.mission_title) {
      missionTitleEl.textContent = aboutData.mission_title;
    }
    if (missionDescEl && aboutData.mission_desc) {
      missionDescEl.textContent = aboutData.mission_desc;
    }
    if (visionTitleEl && aboutData.vision_title) {
      visionTitleEl.textContent = aboutData.vision_title;
    }
    if (visionDescEl && aboutData.vision_desc) {
      visionDescEl.textContent = aboutData.vision_desc;
    }

    // Render values
    if (valuesGridEl && aboutData.values && aboutData.values.length > 0) {
      valuesGridEl.innerHTML = aboutData.values.map(val => `
        <div class="value-card">
          <div class="value-card__icon">${this.escapeHtml(val.icon || '🏥')}</div>
          <h3 class="value-card__title">${this.escapeHtml(val.title || '')}</h3>
          <p class="value-card__desc">${this.escapeHtml(val.description || '')}</p>
        </div>
      `).join('');
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
  AboutPage.init();
});
