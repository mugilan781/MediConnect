// ============================================================
// MediConnect - public/js/sidebar.js
// Dynamic sidebar and topbar renderer
// ============================================================

const SidebarIcons = {
  chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="5" rx="1"/><rect x="12" y="8" width="3" height="9" rx="1"/><rect x="17" y="5" width="3" height="12" rx="1"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  stethoscope: '<path d="M4 4v6a4 4 0 0 0 8 0V4"/><path d="M8 14v2a4 4 0 0 0 8 0v-3"/><circle cx="19" cy="10" r="3"/><path d="M6 4H4M12 4h-2"/>',
  microscope: '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 0 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 2h4v6H9z"/><path d="M6 10l3-2"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M8 12h8M8 16h5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.67.22 1.55.86 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/>',
};

const sideIcon = name => `<svg class="mc-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${SidebarIcons[name]}</svg>`;

const Sidebar = {
  navItems: {
    patient: [
      { section: 'MAIN', items: [
        { dashboardPath: '/patient-dashboard.html', dataTab: 'overview', icon: 'chart', label: 'Dashboard' },
        { dashboardPath: '/patient-dashboard.html', dataTab: 'doctors', icon: 'search', label: 'Find a Doctor' },
      ] },
      { section: 'CARE', items: [
        { dashboardPath: '/patient-dashboard.html', dataTab: 'appointments', icon: 'calendar', label: 'Appointments' },
        { dashboardPath: '/patient-dashboard.html', dataTab: 'consultations', icon: 'stethoscope', label: 'Consultations' },
      ] },
      { section: 'LAB & REPORTS', items: [
        { dashboardPath: '/patient-dashboard.html', dataTab: 'lab-tests', icon: 'microscope', label: 'Lab Tests' },
        { dashboardPath: '/patient-dashboard.html', dataTab: 'sample-collection', icon: 'home', label: 'Sample Collection' },
        { dashboardPath: '/patient-dashboard.html', dataTab: 'reports', icon: 'file', label: 'Reports' },
        { dashboardPath: '/patient-dashboard.html', dataTab: 'history', icon: 'clipboard', label: 'History' },
      ] },
      { section: 'ACCOUNT', items: [
        { dashboardPath: '/patient-dashboard.html', dataTab: 'notifications', icon: 'bell', label: 'Notifications' },
        { dashboardPath: '/patient-dashboard.html', dataTab: 'profile', icon: 'user', label: 'My Profile' },
      ] },
    ],
    doctor: [
      { section: 'MAIN', items: [
        { dashboardPath: '/doctor-dashboard.html', dataTab: 'overview', icon: 'chart', label: 'Dashboard' },
      ] },
      { section: 'PATIENT CARE', items: [
        { dashboardPath: '/doctor-dashboard.html', dataTab: 'appointments', icon: 'calendar', label: 'Appointments' },
        { dashboardPath: '/doctor-dashboard.html', dataTab: 'consultations', icon: 'stethoscope', label: 'Consultations' },
        { dashboardPath: '/doctor-dashboard.html', dataTab: 'patients', icon: 'user', label: 'Patient Records' },
      ] },
      { section: 'SCHEDULING', items: [
        { dashboardPath: '/doctor-dashboard.html', dataTab: 'schedule', icon: 'calendar', label: 'Weekly Schedule' },
        { dashboardPath: '/doctor-dashboard.html', dataTab: 'slots', icon: 'search', label: 'Custom Slots' },
        { dashboardPath: '/doctor-dashboard.html', dataTab: 'leaves', icon: 'info', label: 'Leaves' },
      ] },
      { section: 'LAB & REPORTS', items: [
        { dashboardPath: '/doctor-dashboard.html', dataTab: 'reports', icon: 'file', label: 'Reports' },
      ] },
      { section: 'ACCOUNT', items: [
        { dashboardPath: '/doctor-dashboard.html', dataTab: 'notifications', icon: 'bell', label: 'Notifications' },
        { dashboardPath: '/doctor-dashboard.html', dataTab: 'profile', icon: 'settings', label: 'Profile Settings' },
      ] },
    ],
    admin: [
      { section: 'MAIN', items: [
        { dashboardPath: '/admin-dashboard.html', dataTab: 'overview', icon: 'chart', label: 'Dashboard' },
        { dashboardPath: '/admin-dashboard.html', dataTab: 'analytics', icon: 'chart', label: 'Analytics' },
      ] },
      { section: 'MANAGEMENT', items: [
        { dashboardPath: '/admin-dashboard.html', dataTab: 'patients', icon: 'user', label: 'Patients' },
        { dashboardPath: '/admin-dashboard.html', dataTab: 'doctors', icon: 'stethoscope', label: 'Doctors' },
        { dashboardPath: '/admin-dashboard.html', dataTab: 'appointments', icon: 'calendar', label: 'Appointments' },
        { dashboardPath: '/admin-dashboard.html', dataTab: 'consultations', icon: 'stethoscope', label: 'Consultations' },
      ] },
      { section: 'LAB & REPORTS', items: [
        { dashboardPath: '/admin-dashboard.html', dataTab: 'lab-tests', icon: 'microscope', label: 'Lab Tests' },
        { dashboardPath: '/admin-dashboard.html', dataTab: 'samples', icon: 'home', label: 'Samples' },
        { dashboardPath: '/admin-dashboard.html', dataTab: 'reports', icon: 'file', label: 'Reports' },
      ] },
      { section: 'SYSTEM', items: [
        { dashboardPath: '/admin-dashboard.html', dataTab: 'notifications', icon: 'bell', label: 'Notifications' },
      ] },
    ],
  },

  render() {
    const container = document.getElementById('sidebar');
    if (!container) return;

    const user = Auth.getUser();
    // On dashboard pages, ALWAYS use page-inferred role for sidebar nav
    // This prevents role leakage (e.g. admin logged in visiting doctor dashboard)
    const pageRole = typeof DemoAuth !== 'undefined' ? DemoAuth.inferRoleFromPage() : null;
    const isDashboardPage = window.location.pathname.includes('-dashboard');
    const role = isDashboardPage ? (pageRole || user?.role || 'patient') : (user?.role || pageRole || 'patient');
    const sections = this.navItems[role] || this.navItems.patient;
    const currentPath = window.location.pathname;

    let navHtml = '';
    sections.forEach(section => {
      navHtml += `<div class="sidebar__section-title">${section.section}</div>`;
      section.items.forEach(item => {
        let href = item.href;
        let classes = 'sidebar__link';
        let extraAttrs = '';
        let isActive = '';

        if (item.dataTab) {
          if (currentPath === item.dashboardPath) {
            href = 'javascript:void(0);';
            // Do NOT add 'tab-btn' class, as it introduces horizontal tab styling overrides!
            extraAttrs = ` data-tab="${item.dataTab}"`;
            
            const urlParams = new URLSearchParams(window.location.search);
            const currentTab = urlParams.get('tab') || 'overview';
            if (currentTab === item.dataTab) isActive = ' active';
          } else {
            href = `${item.dashboardPath}?tab=${item.dataTab}`;
          }
        } else {
          isActive = currentPath === item.href ? ' active' : '';
        }

        navHtml += `<a href="${href}" class="${classes}${isActive}"${extraAttrs}><span class="sidebar__link-icon">${sideIcon(item.icon)}</span> ${item.label}</a>`;
      });
    });

    container.innerHTML = `
      <nav class="sidebar__nav" style="padding-top:var(--space-4);">${navHtml}</nav>
      <div class="sidebar__footer">
        <a href="#" class="sidebar__link" id="logout-btn"><span class="sidebar__link-icon">${sideIcon('logout')}</span> Logout</a>
      </div>
    `;
  },

  renderTopbar(title, breadcrumb) {
    const container = document.getElementById('topbar');
    if (!container) return;

    container.innerHTML = `
      <div class="topbar__left">
        <button class="topbar__toggle" id="sidebar-toggle" type="button" aria-label="Toggle sidebar">${sideIcon('menu')}</button>
        <div>
          <div class="topbar__title">${title}</div>
          <div class="topbar__breadcrumb">${breadcrumb}</div>
        </div>
      </div>
      <div class="topbar__right">
        <button class="topbar__notification" onclick="Router.navigate('/notifications.html')" type="button" aria-label="Notifications">
          ${sideIcon('bell')}<span class="topbar__notification-badge" id="notification-badge" style="display:none;">0</span>
        </button>
        <div class="topbar__user">
          <div class="avatar avatar-placeholder" id="topbar-user-avatar">P</div>
        </div>
        <span class="demo-badge" id="demo-mode-badge" style="display:none;">Demo Mode</span>
      </div>
    `;
  },

  init(title, breadcrumb) {
    this.render();
    this.renderTopbar(title || 'Dashboard', breadcrumb || 'Home');
    this._applyDemoContext();
    this.initToggle();
  },

  /**
   * Initialize mobile sidebar toggle behavior:
   * - Hamburger button opens/closes sidebar
   * - Overlay appears behind sidebar, clicking it closes
   * - Body scroll is locked when sidebar is open
   * - Clicking a nav link closes the sidebar on mobile
   * - Resizing to desktop auto-resets mobile state
   */
  initToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (!sidebar || !toggleBtn) return;

    // Create overlay element (appended to body for proper stacking)
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    // Track scroll position for scroll lock
    let scrollY = 0;

    const openSidebar = () => {
      // Save scroll position before locking
      scrollY = window.scrollY;
      sidebar.classList.add('open');
      overlay.classList.add('active');
      document.body.classList.add('sidebar-open');
      document.body.style.top = `-${scrollY}px`;
    };

    const closeSidebar = () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
      document.body.classList.remove('sidebar-open');
      document.body.style.top = '';
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };

    // Hamburger toggle
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (sidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    // Overlay click closes sidebar (both mouse and touch)
    overlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSidebar();
    });

    overlay.addEventListener('touchstart', (e) => {
      e.preventDefault();
      closeSidebar();
    }, { passive: false });

    // Clicking a sidebar nav link closes sidebar on mobile/tablet
    sidebar.addEventListener('click', (e) => {
      const link = e.target.closest('.sidebar__link');
      if (link && window.innerWidth <= 1024) {
        // Small delay so navigation action fires first
        setTimeout(() => closeSidebar(), 100);
      }
    });

    // Auto-reset when resizing past breakpoint
    const mql = window.matchMedia('(min-width: 1025px)');
    const handleResize = (e) => {
      if (e.matches) {
        closeSidebar();
      }
    };
    if (mql.addEventListener) {
      mql.addEventListener('change', handleResize);
    } else {
      mql.addListener(handleResize);
    }
  },

  /**
   * Apply demo user context to topbar if no real user is logged in.
   */
  _applyDemoContext() {
    if (typeof DemoAuth === 'undefined') return;
    const role = DemoAuth.inferRoleFromPage();
    const { user, isDemo } = DemoAuth.getCurrentUserOrDemo(role);

    // Populate topbar with user info (real or demo)
    const avatarEl = document.getElementById('topbar-user-avatar');
    const demoBadge = document.getElementById('demo-mode-badge');

    if (user) {
      if (avatarEl) avatarEl.textContent = user.full_name.charAt(0).toUpperCase();
    }

    if (demoBadge) {
      demoBadge.style.display = isDemo ? 'inline-flex' : 'none';
    }
  },
};
