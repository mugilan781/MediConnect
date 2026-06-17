const AboutPage = {
  data: null,
  _countersObserved: false,

  async init() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/cms/page/about`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.success && result.data) {
        this.data = result.data;
        this.renderAll();
      }
    } catch (error) {
      console.warn('About CMS: Using static fallback.', error.message);
    }
    this.initScrollAnimations();
  },

  renderAll() {
    const { page, sections } = this.data;
    const about = sections && sections.about;

    // SEO
    if (typeof UI !== 'undefined' && UI.injectSEO && page) {
      UI.injectSEO(page);
    }

    if (about) this.renderAbout(about);
    if (sections) {
      if (sections.impact) this.renderImpact(sections.impact);
      if (sections.timeline) this.renderTimeline(sections.timeline);
      if (sections.leadership) this.renderLeadership(sections.leadership);
      if (sections.tech) this.renderTech(sections.tech);
      if (sections.whyPatients) this.renderWhyPatients(sections.whyPatients);
      if (sections.whyDoctors) this.renderWhyDoctors(sections.whyDoctors);
      if (sections.roadmap) this.renderRoadmap(sections.roadmap);
      if (sections.statistics) this.renderStatistics(sections.statistics);
      if (sections.cta) this.renderCTA(sections.cta);
    }

    this.initScrollAnimations();
  },

  // ── About (Hero + Story + Mission/Vision + Values + CTA) ──
  renderAbout(about) {
    // Hero
    const heroTitle = document.getElementById('about-hero-title');
    if (heroTitle && about.title) {
      heroTitle.innerHTML = this.escapeHtml(about.title).replace('MediConnect', '<span class="text-gradient">MediConnect</span>');
    }
    const heroSub = document.getElementById('about-hero-subtitle');
    if (heroSub && about.subtitle) heroSub.textContent = about.subtitle;

    // Story
    const mainTitle = document.getElementById('about-main-title');
    if (mainTitle && about.title) mainTitle.textContent = about.title;
    const mainDesc = document.getElementById('about-main-desc');
    if (mainDesc && about.description) mainDesc.textContent = about.description;
    const mainDesc2 = document.getElementById('about-main-desc-secondary');
    if (mainDesc2 && about.description_secondary) mainDesc2.textContent = about.description_secondary;

    // Mission
    const missionTitle = document.getElementById('about-mission-title');
    if (missionTitle && about.mission_title) missionTitle.textContent = about.mission_title;
    const missionDesc = document.getElementById('about-mission-desc');
    if (missionDesc && about.mission_desc) missionDesc.textContent = about.mission_desc;

    // Vision
    const visionTitle = document.getElementById('about-vision-title');
    if (visionTitle && about.vision_title) visionTitle.textContent = about.vision_title;
    const visionDesc = document.getElementById('about-vision-desc');
    if (visionDesc && about.vision_desc) visionDesc.textContent = about.vision_desc;

    // Values
    const valuesTitle = document.getElementById('about-values-title');
    if (valuesTitle && about.values_title) valuesTitle.textContent = about.values_title;
    const valuesGrid = document.getElementById('about-values-grid');
    if (valuesGrid && about.values && about.values.length > 0) {
      valuesGrid.innerHTML = about.values.map(v => `
        <div class="value-card">
          <div class="value-card__icon">${MediIcons.getIconHtml(v.icon || 'hospital')}</div>
          <h3>${this.escapeHtml(v.title || '')}</h3>
          <p>${this.escapeHtml(v.description || '')}</p>
        </div>
      `).join('');
    }
  },

  // ── Impact ──
  renderImpact(impact) {
    const grid = document.getElementById('about-impact-grid');
    if (!grid || !impact.length) return;
    grid.innerHTML = impact.map(item => `
      <div class="impact-card">
        <div class="impact-card__icon">${MediIcons.getIconHtml(item.icon || 'chart')}</div>
        <div class="impact-card__value">${this.escapeHtml(item.value || '0')}</div>
        <div class="impact-card__label">${this.escapeHtml(item.label || '')}</div>
      </div>
    `).join('');
  },

  // ── Timeline ──
  renderTimeline(timeline) {
    const container = document.getElementById('about-timeline');
    if (!container || !timeline.length) return;
    container.innerHTML = timeline.map(item => `
      <div class="timeline-item">
        <div class="timeline-item__dot"></div>
        <div class="timeline-item__date">${this.escapeHtml(item.date || '')}</div>
        <h3>${this.escapeHtml(item.title || '')}</h3>
        <p>${this.escapeHtml(item.description || '')}</p>
      </div>
    `).join('');
  },

  // ── Leadership ──
  renderLeadership(leaders) {
    const grid = document.getElementById('about-leadership-grid');
    if (!grid || !leaders.length) return;
    grid.innerHTML = leaders.map(leader => {
      const initials = this.getInitials(leader.name);
      return `
        <div class="leader-card">
          <div class="leader-card__avatar">${initials}</div>
          <div class="leader-card__name">${this.escapeHtml(leader.name || '')}</div>
          <div class="leader-card__role">${this.escapeHtml(leader.role || '')}</div>
          <div class="leader-card__bio">${this.escapeHtml(leader.bio || '')}</div>
        </div>
      `;
    }).join('');
  },

  // ── Tech Stack ──
  renderTech(tech) {
    const grid = document.getElementById('about-tech-grid');
    if (!grid || !tech.length) return;
    grid.innerHTML = tech.map(t => `
      <div class="tech-card">
        <div class="tech-card__icon">${MediIcons.getIconHtml(t.icon || 'video')}</div>
        <div class="tech-card__name">${this.escapeHtml(t.name || '')}</div>
      </div>
    `).join('');
  },

  // ── Why Patients ──
  renderWhyPatients(items) {
    const container = document.getElementById('about-why-patients');
    if (!container || !items.length) return;
    container.innerHTML = items.map(item => `
      <div class="why-card-about">
        <div class="why-card-about__icon">${MediIcons.getIconHtml(item.icon || 'star')}</div>
        <div>
          <h4>${this.escapeHtml(item.title || '')}</h4>
          <p>${this.escapeHtml(item.description || '')}</p>
        </div>
      </div>
    `).join('');
  },

  // ── Why Doctors ──
  renderWhyDoctors(items) {
    const container = document.getElementById('about-why-doctors');
    if (!container || !items.length) return;
    container.innerHTML = items.map(item => `
      <div class="why-card-about">
        <div class="why-card-about__icon">${MediIcons.getIconHtml(item.icon || 'star')}</div>
        <div>
          <h4>${this.escapeHtml(item.title || '')}</h4>
          <p>${this.escapeHtml(item.description || '')}</p>
        </div>
      </div>
    `).join('');
  },

  // ── Roadmap ──
  renderRoadmap(roadmap) {
    const grid = document.getElementById('about-roadmap-grid');
    if (!grid || !roadmap.length) return;
    grid.innerHTML = roadmap.map(item => `
      <div class="roadmap-card">
        <div class="roadmap-card__phase">${this.escapeHtml(item.phase || '')}</div>
        <div class="roadmap-card__icon">${MediIcons.getIconHtml(item.icon || 'rocket')}</div>
        <h4>${this.escapeHtml(item.title || '')}</h4>
        <ul>
          ${(item.features || []).map(f => `<li>${this.escapeHtml(f)}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  },

  // ── Statistics ──
  renderStatistics(stats) {
    const setStat = (id, value) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.setAttribute('data-target', value);
      el.textContent = '0';
    };
    if (stats.total_patients != null) setStat('about-stat-patients', stats.total_patients);
    if (stats.total_doctors != null) setStat('about-stat-doctors', stats.total_doctors);
    if (stats.total_appointments != null) setStat('about-stat-appointments', stats.total_appointments);
    if (stats.total_lab_tests != null) setStat('about-stat-labtests', stats.total_lab_tests);
  },

  // ── CTA ──
  renderCTA(cta) {
    const titleEl = document.getElementById('about-ready-title');
    const subtitleEl = document.getElementById('about-ready-subtitle');
    const btnEl = document.getElementById('about-ready-btn');
    if (titleEl && cta.title) titleEl.textContent = cta.title;
    if (subtitleEl && cta.subtitle) subtitleEl.textContent = cta.subtitle;
    if (btnEl && cta.button_text) {
      btnEl.textContent = `Create Free Account ${cta.button_text || '→'}`;
      if (cta.button_link) btnEl.href = cta.button_link;
    }
  },

  // ── Counter Animation ──
  observeCounters() {
    if (this._countersObserved) return;
    this._countersObserved = true;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const counters = entry.target.querySelectorAll('.about-stat-card__number');
          counters.forEach(c => this.animateCounter(c));
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    const grid = document.getElementById('about-stats-grid');
    if (grid) observer.observe(grid);
  },

  animateCounter(el) {
    const target = parseInt(el.getAttribute('data-target'), 10) || 0;
    if (!target) { el.textContent = '0'; return; }
    const duration = 2000;
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target).toLocaleString('en-IN');
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString('en-IN');
    };
    requestAnimationFrame(step);
  },

  // ── Scroll Animations ──
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
    this.observeCounters();
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
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().substring(0, 2);
  },
};

document.addEventListener('DOMContentLoaded', () => {
  AboutPage.init();
});
