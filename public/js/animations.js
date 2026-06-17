// ============================================================
// MediConnect – public/js/animations.js
// Scroll reveal, number counters, parallax effects
// ============================================================

const MediIcons = {
  icons: {
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    stethoscope: '<path d="M4 4v6a4 4 0 0 0 8 0V4"/><path d="M8 14v2a4 4 0 0 0 8 0v-3"/><circle cx="19" cy="10" r="3"/><path d="M6 4H4M12 4h-2"/>',
    microscope: '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 0 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 2h4v6H9z"/><path d="M6 10l3-2"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M8 12h8M8 16h5"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    hospital: '<path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16"/><path d="M9 21v-6h6v6"/><path d="M12 7v5M9.5 9.5h5"/>',
    chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="5" rx="1"/><rect x="12" y="8" width="3" height="9" rx="1"/><rect x="17" y="5" width="3" height="12" rx="1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    doctor: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M4 22a8 8 0 0 1 16 0"/><path d="M15 18h4M17 16v4"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    brain: '<path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5.6A3.5 3.5 0 0 0 7.5 17H9"/><path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5.6A3.5 3.5 0 0 1 16.5 17H15"/><path d="M9 3v18M15 3v18M9 9h6M9 15h6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-5"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    zap: '<path d="M13 2 3 14h8l-1 8 10-12h-8z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 0 20"/><path d="M12 2a15.3 15.3 0 0 0 0 20"/>',
    pill: '<path d="m10.5 20.5 10-10a4.24 4.24 0 1 0-6-6l-10 10a4.24 4.24 0 0 0 6 6z"/><path d="m8.5 8.5 7 7"/>',
    video: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 9 4-2v10l-4-2z"/>',
    message: '<path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    camera: '<path d="M14.5 4 13 2h-2L9.5 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="4"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.67.22 1.55.86 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1z"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.3-2 4-2 4s2.7-.5 4-2c.8-.8.8-2.1 0-2.8a2 2 0 0 0-2 0z"/><path d="M9 15 4 10l2-4 5 5"/><path d="M14 4c4-1 6 1 6 1s2 2-1 6l-7 7-5-5z"/><path d="M15 9h.01"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    cloud: '<path d="M17.5 19H7a5 5 0 1 1 1.3-9.8A7 7 0 0 1 22 12a4 4 0 0 1-4.5 7z"/>',
    palette: '<path d="M12 22a10 10 0 1 1 10-10c0 2.2-1.8 4-4 4h-1.5a2 2 0 0 0-1.4 3.4c.4.4.6.9.6 1.4 0 .7-.6 1.2-1.3 1.2z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/><circle cx="16.5" cy="11.5" r="1"/>',
    bot: '<rect x="5" y="8" width="14" height="10" rx="3"/><path d="M12 8V4"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 18v2M15 18v2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r=".5"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
  },

  emojiMap: {
    '\u{1F4C5}': 'calendar', '\u{1F4C6}': 'calendar', '\u{1FA7B}': 'stethoscope', '\u{1F52C}': 'microscope', '\u{1F9EA}': 'microscope', '\u{1F3E0}': 'home',
    '\u{1F4C4}': 'file', '\u{1F4CB}': 'clipboard', '\u{1F514}': 'bell', '\u{1F3E5}': 'hospital', '\u{1F4CA}': 'chart', '\u{1F4C8}': 'chart',
    '\u{1F465}': 'users', '\u{1F464}': 'user', '\u{1F468}\u{200D}\u{2695}\u{FE0F}': 'doctor', '\u{2764}\u{FE0F}': 'heart', '\u{2764}': 'heart', '\u{1F9E0}': 'brain', '\u{1F476}': 'user',
    '\u{1F9B4}': 'stethoscope', '\u{1F6E1}\u{FE0F}': 'shield', '\u{1F512}': 'lock', '\u{1F510}': 'lock', '\u{26A1}': 'zap', '\u{1F30D}': 'globe', '\u{1F310}': 'globe',
    '\u{1F91D}': 'users', '\u{1F48A}': 'pill', '\u{1F4BB}': 'video', '\u{1F4AC}': 'message', '\u{1F4DE}': 'phone', '\u{1F4E7}': 'mail', '\u{2709}\u{FE0F}': 'mail',
    '\u{1F4CD}': 'pin', '\u{1F550}': 'clock', '\u{1F4F7}': 'camera', '\u{1F50D}': 'search', '\u{2699}\u{FE0F}': 'settings', '\u{1F527}': 'settings',
    '\u{2705}': 'check', '\u2713': 'check', '\u{2714}\u{FE0F}': 'check', '\u2715': 'x', '\u{274C}': 'x', '\u{26A0}\u{FE0F}': 'alert', '\u{26A0}': 'alert', '\u{2139}': 'info',
    '\u2605': 'star', '\u2B50': 'star', '\u{2728}': 'star', '\u{1F680}': 'rocket', '\u{1F3AF}': 'chart', '\u{1F52D}': 'search', '\u{1F5C4}\u{FE0F}': 'database', '\u{2601}\u{FE0F}': 'cloud',
    '\u{1F3A8}': 'palette', '\u{1F916}': 'bot', '\u{1F4F1}': 'phone', '\u{1F3E2}': 'hospital', '\u{2753}': 'info', '\u{1F517}': 'link', '\u{1F5BC}\u{FE0F}': 'image',
    '\u{1F3F7}\u{FE0F}': 'tag', '\u{1F441}\u{FE0F}': 'eye', '\u{1F507}': 'bell', '\u{1F3D6}\u{FE0F}': 'calendar', '\u{1F4DD}': 'clipboard', '\u{1FA7C}': 'file', '\u{1F4BE}': 'database',
    '\u{1F4DC}': 'clipboard', '\u{1F3EA}': 'hospital', '\u{1F4B8}': 'chart', '\u{1F4B0}': 'chart', '\u{1F6A8}': 'alert', '\u{1F6AA}': 'logout', '\u{1F511}': 'lock',
    '\u{1F393}': 'clipboard', '\u{1F4BC}': 'file', '\u{1F4E2}': 'bell', '\u{1F5D1}\u{FE0F}': 'x', '\u{1F4C2}': 'file', '\u{1F504}': 'arrow', '\u{1F338}': 'heart', '\u{1F9F4}': 'stethoscope',
    '\u2630': 'menu', '\u25BC': 'chevron', '\u25B6\u{FE0F}': 'arrow', '\u2192': 'arrow', '\u21B3': 'arrow', '\u{23F3}': 'clock', '\u{23F0}': 'clock', '\u{1F44B}': 'message',
    '\u{1F9E4}': 'shield', '\u{1F4E8}': 'mail'
  },

  icon(name, className = '') {
    const path = this.icons[name] || this.icons.info;
    return `<svg class="mc-icon ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${path}</svg>`;
  },

  getIconHtml(iconNameOrEmoji) {
    if (!iconNameOrEmoji) return '';
    const name = this.emojiMap[iconNameOrEmoji] || iconNameOrEmoji;
    return this.icon(name);
  },

  init() {
    this.replaceEmojiIcons(document.body);
    this.observe();
  },

  replaceEmojiIcons(root = document.body) {
    if (!root) return;
    const keys = Object.keys(this.emojiMap).sort((a, b) => b.length - a.length);
    const regex = new RegExp(keys.map(key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'SVG'].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!regex.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        regex.lastIndex = 0;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      if (node.parentElement && node.parentElement.tagName === 'OPTION') {
        node.nodeValue = node.nodeValue.replace(regex, '').trimStart();
        return;
      }

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      const text = node.nodeValue;
      text.replace(regex, (match, offset) => {
        if (offset > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
        const holder = document.createElement('span');
        holder.innerHTML = this.icon(this.emojiMap[match]);
        fragment.appendChild(holder.firstElementChild);
        lastIndex = offset + match.length;
        return match;
      });
      if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      node.parentNode.replaceChild(fragment, node);
    });
  },

  observe() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) this.replaceEmojiIcons(node);
          if (node.nodeType === Node.TEXT_NODE && node.parentElement) this.replaceEmojiIcons(node.parentElement);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },
};

const ThemeEnhancer = {
  sectionSelector: 'main > section, .content > section, .dashboard-section, .doc-section, .card, .auth-form',
  cardSelector: [
    '.card', '.stat-card', '.doc-section', '.doc-analytics-card', '.doctor-card', '.doc-card',
    '.lab-test-card', '.quick-action', '.access-card', '.service-card', '.cat-card',
    '.dept-card', '.spec-card', '.benefit-card', '.screenshot-card', '.pricing-card',
    '.faq-item', '.faq-preview-item', '.services-faq-item', '.appt-faq-item',
    '.contact-option', '.contact-info-card', '.report-card', '.notif-item',
    '.testimonial-card', '.exp-card', '.consult-test-card', '.sc-story-card',
    '.value-card', '.impact-card', '.tech-card', '.roadmap-card',
  ].join(', '),

  init() {
    document.body.classList.add('theme-premium');
    this.enhanceSections();
    this.enhanceCards();
    this.enhanceControls();
    this.enhanceTables();
    this.initPointerBackdrop();
  },

  enhanceSections() {
    document.querySelectorAll(this.sectionSelector).forEach((section, index) => {
      section.classList.add('theme-section');
      if (!section.classList.contains('revealed') && !section.classList.contains('animate-on-scroll')) {
        section.classList.add('reveal');
      }
      section.style.setProperty('--section-index', index % 6);
    });
  },

  enhanceCards() {
    document.querySelectorAll(this.cardSelector).forEach((card, index) => {
      card.classList.add('theme-card', 'mc-motion-card');
      card.style.setProperty('--stagger', `${Math.min(index % 8, 7) * 65}ms`);
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--spot-x', `${((event.clientX - rect.left) / rect.width * 100).toFixed(2)}%`);
        card.style.setProperty('--spot-y', `${((event.clientY - rect.top) / rect.height * 100).toFixed(2)}%`);
      });
    });
  },

  enhanceControls() {
    const controls = 'button, .btn, input, select, textarea, .form-input, .form-select, .filter-select, .tab-btn, .nested-tab-btn';
    document.querySelectorAll(controls).forEach(control => {
      control.classList.add('theme-control');
    });
  },

  enhanceTables() {
    document.querySelectorAll('table, .table-container, .table-responsive, .data-table').forEach(table => {
      table.classList.add('theme-table');
    });
  },

  initPointerBackdrop() {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    let ticking = false;
    window.addEventListener('pointermove', event => {
      if (ticking) return;
      window.requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--page-x', `${event.clientX}px`);
        document.documentElement.style.setProperty('--page-y', `${event.clientY}px`);
        ticking = false;
      });
      ticking = true;
    }, { passive: true });
  },
};

const Animations = {
  /**
   * Initialize all animation systems
   */
  init() {
    MediIcons.init();
    ThemeEnhancer.init();
    this.initScrollReveal();
    this.initCounters();
    this.initAnimatedElements();
    this.initMagneticCards();
  },

  /**
   * Scroll reveal - reveal elements when they enter viewport
   */
  initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .animate-on-scroll, .theme-section');

    if (!revealElements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed', 'is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    });

    revealElements.forEach(el => observer.observe(el));
  },

  /**
   * Animated number counters
   */
  initCounters() {
    const counters = document.querySelectorAll('.counter');

    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target;
          const targetValue = parseInt(target.dataset.target) || parseInt(target.textContent.replace(/[^0-9]/g, '')) || 0;
          const suffix = target.dataset.suffix || '';
          const duration = parseInt(target.dataset.duration) || 2000;
          const startTime = performance.now();

          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(eased * targetValue);

            target.textContent = currentValue.toLocaleString() + suffix;

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              target.textContent = targetValue.toLocaleString() + suffix;
            }
          };

          requestAnimationFrame(animate);
          observer.unobserve(target);
        }
      });
    }, { threshold: 0.3 });

    counters.forEach(el => observer.observe(el));
  },

  /**
   * Animate elements with CSS animation classes on scroll
   */
  initAnimatedElements() {
    const animatedElements = document.querySelectorAll('[data-animate]');

    if (!animatedElements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const animation = el.dataset.animate || 'fadeInUp';
          const delay = el.dataset.delay || '0';

          el.style.animation = `${animation} 0.6s ease forwards`;
          if (delay) el.style.animationDelay = `${delay}ms`;
          el.style.opacity = '0';

          observer.unobserve(el);
        }
      });
    }, { threshold: 0.1 });

    animatedElements.forEach(el => observer.observe(el));
  },

  /**
   * Add cursor-aware highlights to cards without changing page templates.
   */
  initMagneticCards() {
    const selector = '.card, .stat-card, .doc-section, .doc-analytics-card, .doctor-card, .lab-test-card, .quick-action, .access-card, .service-card, .cat-card, .dept-card, .spec-card, .benefit-card, .screenshot-card, .pricing-card, .faq-item, .services-faq-item, .appt-faq-item, .contact-option, .contact-info-card, .report-card, .notif-item';
    document.querySelectorAll(selector).forEach(card => {
      card.classList.add('mc-motion-card');
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--spot-x', `${((event.clientX - rect.left) / rect.width * 100).toFixed(2)}%`);
        card.style.setProperty('--spot-y', `${((event.clientY - rect.top) / rect.height * 100).toFixed(2)}%`);
      });
    });
  },

  /**
   * Smooth scroll to element
   */
  scrollTo(elementId, offset = 0) {
    const el = document.getElementById(elementId);
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  },

  /**
   * Parallax effect on background elements
   */
  initParallax(selector, speed = 0.3) {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
              const offset = rect.top * speed;
              el.style.transform = `translateY(${offset}px)`;
            }
          });
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  },
};

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  Animations.init();
});
