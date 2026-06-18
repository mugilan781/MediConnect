// ============================================================
// MediConnect - public/js/global-navbar.js
// Global navigation component with dropdown menus
// ============================================================

const NavbarIcons = {
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 0 20"/><path d="M12 2a15.3 15.3 0 0 0 0 20"/>',
  user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="5" rx="1"/><rect x="12" y="8" width="3" height="9" rx="1"/><rect x="17" y="5" width="3" height="12" rx="1"/>',
  stethoscope: '<path d="M4 4v6a4 4 0 0 0 8 0V4"/><path d="M8 14v2a4 4 0 0 0 8 0v-3"/><circle cx="19" cy="10" r="3"/><path d="M6 4H4M12 4h-2"/>',
  doctor: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M4 22a8 8 0 0 1 16 0"/><path d="M15 18h4M17 16v4"/>',
  settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.67.22 1.55.86 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
};

const navIcon = name => `<svg class="mc-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${NavbarIcons[name] || NavbarIcons.user}</svg>`;

const GlobalNavbar = {
  // Navigation items — supports dropdowns via `children` array
  navLinks: [
    { href: '/index.html', label: 'Home' },
    { href: '/about.html', label: 'About' },
    { href: '/services.html', label: 'Services' },
    { href: '/doctors.html', label: 'Doctors' },
    {
      label: 'Appointments',
      children: [
        { href: '/appointments.html', label: 'Appointments' },
        { href: '/consultations.html', label: 'Consultations' },
      ],
    },
    {
      label: 'Lab Tests',
      children: [
        { href: '/lab-tests.html', label: 'Lab Tests' },
        { href: '/sample-collection.html', label: 'Home Sample Collection' },
        { href: '/reports.html', label: 'Reports' },
      ],
    },
    { href: '/pricing.html', label: 'Pricing' },
    { href: '/contact.html', label: 'Contact' },
  ],


  init(containerId = 'global-navbar') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.render(container);
    this.initEventListeners(container);
    this.handleScroll();
  },

  _isActiveLink(href) {
    const p = window.location.pathname;
    return p === href || (href !== '/index.html' && p.startsWith(href.replace('.html', '')));
  },

  _isDropdownActive(children) {
    return children.some(c => this._isActiveLink(c.href));
  },

  _chevronSvg() {
    return '<svg class="nav-dropdown__chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  },

  render(container) {
    const currentPath = window.location.pathname;
    const user = Auth.getUser();

    // Build center nav links
    const centerLinks = this.navLinks.map((item, idx) => {
      if (item.children) {
        const isActive = this._isDropdownActive(item.children);
        const dropdownItems = item.children.map(child => {
          const childActive = this._isActiveLink(child.href);
          return `<a href="${child.href}" class="nav-dropdown__item${childActive ? ' active' : ''}">${child.label}</a>`;
        }).join('');
        return `
          <div class="nav-dropdown" data-dropdown-idx="${idx}">
            <button type="button" class="global-navbar__link nav-dropdown__trigger${isActive ? ' active' : ''}" aria-expanded="false" aria-haspopup="true">
              ${item.label}${this._chevronSvg()}
            </button>
            <div class="nav-dropdown__menu" role="menu">
              ${dropdownItems}
            </div>
          </div>
        `;
      }
      const isActive = this._isActiveLink(item.href);
      return `<a href="${item.href}" class="global-navbar__link${isActive ? ' active' : ''}">${item.label}</a>`;
    }).join('');

    // Build mobile menu links
    const mobileLinks = this.navLinks.map((item, idx) => {
      if (item.children) {
        const isActive = this._isDropdownActive(item.children);
        const subLinks = item.children.map(child => {
          const childActive = this._isActiveLink(child.href);
          return `<a href="${child.href}" class="global-navbar__mobile-sublink${childActive ? ' active' : ''}">${child.label}</a>`;
        }).join('');
        return `
          <div class="global-navbar__mobile-dropdown" data-mobile-dropdown="${idx}">
            <button type="button" class="global-navbar__mobile-link global-navbar__mobile-dropdown-trigger${isActive ? ' active' : ''}">
              ${item.label}${this._chevronSvg()}
            </button>
            <div class="global-navbar__mobile-dropdown-menu">
              ${subLinks}
            </div>
          </div>
        `;
      }
      const isActive = currentPath === item.href;
      return `<a href="${item.href}" class="global-navbar__mobile-link${isActive ? ' active' : ''}">${item.label}</a>`;
    }).join('');

    container.innerHTML = `
      <nav class="global-navbar" id="global-navbar-inner">
        <div class="global-navbar__inner">
          <div class="global-navbar__left">
            <a href="/index.html" class="global-navbar__logo-link">
              <div class="global-navbar__logo-icon">M</div>
              <div class="global-navbar__brand">
                <span class="global-navbar__brand-name">MediConnect</span>
                <span class="global-navbar__brand-subtitle">Smart Clinic Management</span>
              </div>
            </a>
          </div>

          <div class="global-navbar__center">${centerLinks}</div>

          <div class="global-navbar__right">
            <div class="global-navbar__profile" id="global-navbar-profile">
              <button class="global-navbar__profile-btn" id="global-navbar-profile-btn" type="button">
                ${navIcon('user')}
                ${navIcon('chevron')}
              </button>
              ${this.getProfileMenuHTML(user)}
            </div>

            <button class="global-navbar__mobile-toggle" id="global-navbar-mobile-toggle" type="button" aria-label="Toggle menu">
              ${navIcon('menu')}
            </button>
          </div>
        </div>

        <div class="global-navbar__mobile-menu" id="global-navbar-mobile-menu">
          ${mobileLinks}
          <div class="global-navbar__mobile-section">Account</div>
          ${user ? `
            <a href="${CONFIG.DASHBOARD_ROUTES[user.role] || '/patient-dashboard.html'}" class="global-navbar__mobile-link">My Dashboard</a>
            <a href="#" class="global-navbar__mobile-link" id="global-navbar-mobile-logout">Logout</a>
          ` : `
            <a href="/login.html" class="global-navbar__mobile-link">Login</a>
            <a href="/signup.html" class="global-navbar__mobile-link">Sign Up</a>
          `}
          <div class="global-navbar__mobile-section">Dashboards</div>
          <a href="/patient-dashboard.html" class="global-navbar__mobile-link">Patient Dashboard</a>
          <a href="/doctor-dashboard.html" class="global-navbar__mobile-link">Doctor Dashboard</a>
          <a href="/admin-dashboard.html" class="global-navbar__mobile-link">Admin Dashboard</a>
        </div>
      </nav>
    `;
  },

  getProfileMenuHTML(user) {
    let html = '<div class="global-navbar__profile-menu" id="global-navbar-profile-menu">';

    if (user) {
      html += `
        <div class="global-navbar__profile-header">
          <div class="global-navbar__profile-avatar">${user.full_name.charAt(0).toUpperCase()}</div>
          <div class="global-navbar__profile-info">
            <div class="global-navbar__profile-name">${user.full_name}</div>
            <div class="global-navbar__profile-role">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</div>
          </div>
        </div>
        <div class="global-navbar__menu-section">Dashboard</div>
        <a href="${CONFIG.DASHBOARD_ROUTES[user.role] || '/patient-dashboard.html'}" class="global-navbar__menu-item"><span class="menu-icon">${navIcon('chart')}</span> My Dashboard</a>
        <a href="/profile.html" class="global-navbar__menu-item"><span class="menu-icon">${navIcon('user')}</span> Profile Settings</a>
        <div class="global-navbar__menu-section">Demo Access</div>
        <a href="/patient-dashboard.html" class="global-navbar__menu-item"><span class="menu-icon">${navIcon('stethoscope')}</span> Patient Dashboard</a>
        <a href="/doctor-dashboard.html" class="global-navbar__menu-item"><span class="menu-icon">${navIcon('doctor')}</span> Doctor Dashboard</a>
        <a href="/admin-dashboard.html" class="global-navbar__menu-item"><span class="menu-icon">${navIcon('settings')}</span> Admin Dashboard</a>
        <div class="global-navbar__menu-section">Account</div>
        <button class="global-navbar__menu-item" id="global-navbar-logout-btn" type="button"><span class="menu-icon">${navIcon('logout')}</span> Logout</button>
      `;
    } else {
      html += `
        <div class="global-navbar__menu-section">Account</div>
        <a href="/login.html" class="global-navbar__menu-item"><span class="menu-icon">${navIcon('lock')}</span> Login</a>
        <a href="/signup.html" class="global-navbar__menu-item"><span class="menu-icon">${navIcon('edit')}</span> Sign Up</a>
        <div class="global-navbar__menu-section">Dashboards</div>
        <a href="/patient-dashboard.html" class="global-navbar__menu-item"><span class="menu-icon">${navIcon('stethoscope')}</span> Patient Dashboard</a>
        <a href="/doctor-dashboard.html" class="global-navbar__menu-item"><span class="menu-icon">${navIcon('doctor')}</span> Doctor Dashboard</a>
        <a href="/admin-dashboard.html" class="global-navbar__menu-item"><span class="menu-icon">${navIcon('settings')}</span> Admin Dashboard</a>
      `;
    }

    return `${html}</div>`;
  },

  initEventListeners(container) {
    // ── Profile dropdown ──
    const profileBtn = document.getElementById('global-navbar-profile-btn');
    const profileMenu = document.getElementById('global-navbar-profile-menu');

    if (profileBtn && profileMenu) {
      profileBtn.addEventListener('click', event => {
        event.stopPropagation();
        profileMenu.classList.toggle('open');
      });
    }

    // ── Mobile toggle ──
    const mobileToggle = document.getElementById('global-navbar-mobile-toggle');
    const mobileMenu = document.getElementById('global-navbar-mobile-menu');
    if (mobileToggle && mobileMenu) {
      mobileToggle.addEventListener('click', event => {
        event.stopPropagation();
        mobileMenu.classList.toggle('open');
      });
    }

    // ── Nav dropdowns (desktop: hover + click, keyboard) ──
    const dropdowns = container.querySelectorAll('.nav-dropdown');
    dropdowns.forEach(dd => {
      const trigger = dd.querySelector('.nav-dropdown__trigger');
      const menu = dd.querySelector('.nav-dropdown__menu');
      if (!trigger || !menu) return;

      let hoverTimeout;

      // Desktop hover open
      dd.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
        this._closeAllDropdowns(container, dd);
        dd.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      });

      dd.addEventListener('mouseleave', () => {
        hoverTimeout = setTimeout(() => {
          dd.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }, 120);
      });

      // Click toggle (also serves as accessible trigger)
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = dd.classList.contains('open');
        this._closeAllDropdowns(container);
        if (!isOpen) {
          dd.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
          // Focus first item
          const firstItem = menu.querySelector('.nav-dropdown__item');
          if (firstItem) firstItem.focus();
        }
      });

      // Keyboard navigation
      trigger.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          dd.classList.add('open');
          trigger.setAttribute('aria-expanded', 'true');
          const firstItem = menu.querySelector('.nav-dropdown__item');
          if (firstItem) firstItem.focus();
        }
      });

      menu.addEventListener('keydown', e => {
        const items = [...menu.querySelectorAll('.nav-dropdown__item')];
        const idx = items.indexOf(document.activeElement);

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = items[idx + 1] || items[0];
          next.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = items[idx - 1] || items[items.length - 1];
          prev.focus();
        } else if (e.key === 'Escape') {
          dd.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
          trigger.focus();
        } else if (e.key === 'Tab') {
          dd.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    });

    // ── Mobile dropdowns ──
    const mobileDropdowns = container.querySelectorAll('.global-navbar__mobile-dropdown-trigger');
    mobileDropdowns.forEach(trigger => {
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        const parent = trigger.closest('.global-navbar__mobile-dropdown');
        if (parent) parent.classList.toggle('open');
      });
    });

    // ── Click outside to close all ──
    document.addEventListener('click', () => {
      if (profileMenu) profileMenu.classList.remove('open');
      this._closeAllDropdowns(container);
    });

    // ── ESC to close all ──
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (profileMenu) profileMenu.classList.remove('open');
        this._closeAllDropdowns(container);
        if (mobileMenu) mobileMenu.classList.remove('open');
      }
    });

    // ── Logout ──
    const logoutBtn = document.getElementById('global-navbar-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', event => {
      event.preventDefault();
      Auth.logout();
    });

    const mobileLogout = document.getElementById('global-navbar-mobile-logout');
    if (mobileLogout) mobileLogout.addEventListener('click', event => {
      event.preventDefault();
      Auth.logout();
    });
  },

  _closeAllDropdowns(container, except = null) {
    container.querySelectorAll('.nav-dropdown.open').forEach(dd => {
      if (dd !== except) {
        dd.classList.remove('open');
        const trigger = dd.querySelector('.nav-dropdown__trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    });
  },

  handleScroll() {
    const navbar = document.getElementById('global-navbar-inner');
    if (!navbar) return;

    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  },
};

document.addEventListener('DOMContentLoaded', () => {
  GlobalNavbar.init();
});

if (typeof window.toggleFaq === 'undefined') {
  window.toggleFaq = function(btn) {
    const item = btn.closest('.faq-preview-item');
    if (!item) return;
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
  };
}


