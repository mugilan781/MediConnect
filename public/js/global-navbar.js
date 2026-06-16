// ============================================================
// MediConnect – public/js/global-navbar.js
// Premium healthcare SaaS global navigation component
// Self-contained, renders into #global-navbar element
// ============================================================

const GlobalNavbar = {
  navLinks: [
    { href: '/index.html', label: 'Home' },
    { href: '/about.html', label: 'About' },
    { href: '/services.html', label: 'Services' },
    { href: '/doctors.html', label: 'Doctors' },
    { href: '/appointments.html', label: 'Appointments' },
    { href: '/lab-tests.html', label: 'Lab Tests' },
    { href: '/pricing.html', label: 'Pricing' },
    { href: '/contact.html', label: 'Contact' },
  ],

  languages: [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
    { code: 'bn', label: 'বাংলা', flag: '🇧🇩' },
    { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  ],

  currentLang: 'en',

  /**
   * Initialize navbar
   */
  init(containerId = 'global-navbar') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.render(container);
    this.initEventListeners(container);
    this.handleScroll();
    this.updateAuthState();
  },

  /**
   * Render navbar HTML
   */
  render(container) {
    const currentPath = window.location.pathname;
    const user = Auth.getUser();

    const centerLinks = this.navLinks.map(link => {
      const isActive = currentPath === link.href || (link.href !== '/index.html' && currentPath.startsWith(link.href.replace('.html', '')));
      return `<a href="${link.href}" class="global-navbar__link${isActive ? ' active' : ''}">${link.label}</a>`;
    }).join('');

    const profileMenuHtml = this.getProfileMenuHTML(user);

    container.innerHTML = `
      <nav class="global-navbar" id="global-navbar-inner">
        <div class="global-navbar__inner">
          <!-- Left: Logo + Brand -->
          <div class="global-navbar__left">
            <a href="/index.html" class="global-navbar__logo-link">
              <div class="global-navbar__logo-icon">M</div>
              <div class="global-navbar__brand">
                <span class="global-navbar__brand-name">MediConnect</span>
                <span class="global-navbar__brand-subtitle">Smart Clinic Management</span>
              </div>
            </a>
          </div>

          <!-- Center: Navigation -->
          <div class="global-navbar__center">
            ${centerLinks}
          </div>

          <!-- Right: Actions -->
          <div class="global-navbar__right">
            <!-- Language Switcher -->
            <div class="global-navbar__lang" id="global-navbar-lang">
              <button class="global-navbar__lang-btn" id="global-navbar-lang-btn">
                <span>🌐</span>
                <span id="global-navbar-lang-label">EN</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M5 6L0 0h10z"/></svg>
              </button>
              <div class="global-navbar__lang-menu" id="global-navbar-lang-menu">
                ${this.languages.map(lang => `
                  <button class="global-navbar__lang-option${lang.code === this.currentLang ? ' active' : ''}" data-lang="${lang.code}">
                    <span>${lang.flag}</span> ${lang.label}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Profile Dropdown -->
            <div class="global-navbar__profile" id="global-navbar-profile">
              <button class="global-navbar__profile-btn" id="global-navbar-profile-btn">
                <div class="avatar-circle">${user ? user.full_name.charAt(0).toUpperCase() : '👤'}</div>
                <span>${user ? user.full_name.split(' ')[0] : 'Account'}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M5 6L0 0h10z"/></svg>
              </button>
              ${profileMenuHtml}
            </div>

            <!-- Mobile Toggle -->
            <button class="global-navbar__mobile-toggle" id="global-navbar-mobile-toggle" aria-label="Toggle menu">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M3 5h14v2H3zm0 4h14v2H3zm0 4h14v2H3z"/></svg>
            </button>
          </div>
        </div>

        <!-- Mobile Menu -->
        <div class="global-navbar__mobile-menu" id="global-navbar-mobile-menu">
          ${this.navLinks.map(link => {
            const isActive = currentPath === link.href;
            return `<a href="${link.href}" class="global-navbar__mobile-link${isActive ? ' active' : ''}">${link.label}</a>`;
          }).join('')}
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

  /**
   * Get profile dropdown menu HTML
   */
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
        <a href="${CONFIG.DASHBOARD_ROUTES[user.role] || '/patient-dashboard.html'}" class="global-navbar__menu-item">
          <span class="menu-icon">📊</span> My Dashboard
        </a>
        <a href="/profile.html" class="global-navbar__menu-item">
          <span class="menu-icon">👤</span> Profile Settings
        </a>
        <div class="global-navbar__menu-section">Demo Access</div>
        <a href="/patient-dashboard.html" class="global-navbar__menu-item">
          <span class="menu-icon">🩺</span> Patient Dashboard
        </a>
        <a href="/doctor-dashboard.html" class="global-navbar__menu-item">
          <span class="menu-icon">👨‍⚕️</span> Doctor Dashboard
        </a>
        <a href="/admin-dashboard.html" class="global-navbar__menu-item">
          <span class="menu-icon">⚙️</span> Admin Dashboard
        </a>
        <div class="global-navbar__menu-section">Account</div>
        <button class="global-navbar__menu-item" id="global-navbar-logout-btn">
          <span class="menu-icon">🚪</span> Logout
        </button>
      `;
    } else {
      html += `
        <div class="global-navbar__menu-section">Account</div>
        <a href="/login.html" class="global-navbar__menu-item">
          <span class="menu-icon">🔑</span> Login
        </a>
        <a href="/signup.html" class="global-navbar__menu-item">
          <span class="menu-icon">📝</span> Sign Up
        </a>
        <div class="global-navbar__menu-section">Dashboards</div>
        <a href="/patient-dashboard.html" class="global-navbar__menu-item">
          <span class="menu-icon">🩺</span> Patient Dashboard
        </a>
        <a href="/doctor-dashboard.html" class="global-navbar__menu-item">
          <span class="menu-icon">👨‍⚕️</span> Doctor Dashboard
        </a>
        <a href="/admin-dashboard.html" class="global-navbar__menu-item">
          <span class="menu-icon">⚙️</span> Admin Dashboard
        </a>
      `;
    }

    html += '</div>';
    return html;
  },

  /**
   * Initialize event listeners
   */
  initEventListeners(container) {
    // Profile dropdown toggle
    const profileBtn = document.getElementById('global-navbar-profile-btn');
    const profileMenu = document.getElementById('global-navbar-profile-menu');
    if (profileBtn && profileMenu) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileMenu.classList.toggle('open');
        // Close language menu
        const langMenu = document.getElementById('global-navbar-lang-menu');
        if (langMenu) langMenu.classList.remove('open');
      });
    }

    // Language switcher toggle
    const langBtn = document.getElementById('global-navbar-lang-btn');
    const langMenu = document.getElementById('global-navbar-lang-menu');
    if (langBtn && langMenu) {
      langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        langMenu.classList.toggle('open');
        // Close profile menu
        if (profileMenu) profileMenu.classList.remove('open');
      });
    }

    // Language options
    container.querySelectorAll('.global-navbar__lang-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const lang = opt.dataset.lang;
        this.currentLang = lang;
        const label = document.getElementById('global-navbar-lang-label');
        if (label) label.textContent = lang.toUpperCase();
        langMenu.classList.remove('open');
        container.querySelectorAll('.global-navbar__lang-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        UI.showToast(`Language switched to ${opt.textContent.trim()}`, 'success');
      });
    });

    // Mobile toggle
    const mobileToggle = document.getElementById('global-navbar-mobile-toggle');
    const mobileMenu = document.getElementById('global-navbar-mobile-menu');
    if (mobileToggle && mobileMenu) {
      mobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileMenu.classList.toggle('open');
      });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      if (profileMenu) profileMenu.classList.remove('open');
      if (langMenu) langMenu.classList.remove('open');
      // Don't close mobile menu on outside click - user needs explicit close
    });

    // Logout button
    const logoutBtn = document.getElementById('global-navbar-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    }

    // Mobile logout
    const mobileLogout = document.getElementById('global-navbar-mobile-logout');
    if (mobileLogout) {
      mobileLogout.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    }
  },

  /**
   * Handle scroll event for navbar shadow
   */
  handleScroll() {
    const navbar = document.getElementById('global-navbar-inner');
    if (!navbar) return;

    const onScroll = () => {
      if (window.scrollY > 10) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  },

  /**
   * Update auth state in navbar
   */
  updateAuthState() {
    // This method updates the profile button/name when auth state changes
    // Currently handled by re-render on page load
  },
};

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  GlobalNavbar.init();
});
