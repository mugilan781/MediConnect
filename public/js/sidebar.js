// ============================================================
// MediConnect – public/js/sidebar.js
// Dynamic sidebar & topbar renderer – single source of truth
// Eliminates duplicate sidebar HTML across 11 pages
// ============================================================

const Sidebar = {
  /**
   * Navigation definitions per role
   */
  navItems: {
    patient: [
      { section: 'Main', items: [
        { href: '/patient-dashboard.html', icon: '📊', label: 'Dashboard' },
        { href: '/doctors.html', icon: '🔍', label: 'Find a Doctor' },
        { href: '/appointments.html', icon: '📅', label: 'Appointments' },
        { href: '/consultations.html', icon: '🩺', label: 'Consultations' },
      ]},
      { section: 'Lab & Reports', items: [
        { href: '/lab-tests.html', icon: '🔬', label: 'Lab Tests' },
        { href: '/sample-collection.html', icon: '🏠', label: 'Sample Collection' },
        { href: '/reports.html', icon: '📄', label: 'Reports' },
        { href: '/history.html', icon: '📜', label: 'History' },
      ]},
      { section: 'Other', items: [
        { href: '/notifications.html', icon: '🔔', label: 'Notifications' },
        { href: '/profile.html', icon: '👤', label: 'My Profile' },
        { href: '/contact.html', icon: '📞', label: 'Contact' },
        { href: '/about.html', icon: 'ℹ️', label: 'About' },
      ]},
    ],
    doctor: [
      { section: 'Main', items: [
        { href: '/doctor-dashboard.html', icon: '📊', label: 'Dashboard' },
        { href: '/appointments.html', icon: '📅', label: 'Appointments' },
        { href: '/consultations.html', icon: '🩺', label: 'Consultations' },
      ]},
      { section: 'Lab & Reports', items: [
        { href: '/lab-tests.html', icon: '🔬', label: 'Lab Tests' },
        { href: '/reports.html', icon: '📄', label: 'Reports' },
        { href: '/history.html', icon: '📜', label: 'History' },
      ]},
      { section: 'Other', items: [
        { href: '/contact.html', icon: '📞', label: 'Contact' },
        { href: '/about.html', icon: 'ℹ️', label: 'About' },
      ]},
    ],
    admin: [
      { section: 'Main', items: [
        { href: '/admin-dashboard.html', icon: '📊', label: 'Dashboard' },
        { href: '/appointments.html', icon: '📅', label: 'Appointments' },
        { href: '/consultations.html', icon: '🩺', label: 'Consultations' },
      ]},
      { section: 'Lab & Reports', items: [
        { href: '/lab-tests.html', icon: '🔬', label: 'Lab Tests' },
        { href: '/sample-collection.html', icon: '🏠', label: 'Sample Collection' },
        { href: '/reports.html', icon: '📄', label: 'Reports' },
        { href: '/history.html', icon: '📜', label: 'History' },
      ]},
      { section: 'Other', items: [
        { href: '/notifications.html', icon: '🔔', label: 'Notifications' },
        { href: '/contact.html', icon: '📞', label: 'Contact' },
        { href: '/about.html', icon: 'ℹ️', label: 'About' },
      ]},
    ],
  },

  /**
   * Render the sidebar into the #sidebar element
   */
  render() {
    const container = document.getElementById('sidebar');
    if (!container) return;

    const user = Auth.getUser();
    const role = user?.role || 'patient';
    const sections = this.navItems[role] || this.navItems.patient;
    const currentPath = window.location.pathname;

    let navHtml = '';
    sections.forEach(section => {
      navHtml += `<div class="sidebar__section-title">${section.section}</div>`;
      section.items.forEach(item => {
        const isActive = currentPath === item.href ? ' active' : '';
        navHtml += `<a href="${item.href}" class="sidebar__link${isActive}"><span class="sidebar__link-icon">${item.icon}</span> ${item.label}</a>`;
      });
    });

    container.innerHTML = `
      <div class="sidebar__logo">
        <div class="sidebar__logo-icon">M</div>
        <span class="sidebar__logo-text">MediConnect</span>
      </div>
      <nav class="sidebar__nav">
        ${navHtml}
      </nav>
      <div class="sidebar__footer">
        <a href="#" class="sidebar__link" id="logout-btn"><span class="sidebar__link-icon">🚪</span> Logout</a>
      </div>
    `;
  },

  /**
   * Render the topbar into the #topbar element
   * @param {string} title - Page title
   * @param {string} breadcrumb - Breadcrumb text
   */
  renderTopbar(title, breadcrumb) {
    const container = document.getElementById('topbar');
    if (!container) return;

    container.innerHTML = `
      <div class="topbar__left">
        <button class="topbar__toggle" id="sidebar-toggle">☰</button>
        <div>
          <div class="topbar__title">${title}</div>
          <div class="topbar__breadcrumb">${breadcrumb}</div>
        </div>
      </div>
      <div class="topbar__right">
        <button class="topbar__notification" onclick="Router.navigate('/notifications.html')">
          🔔<span class="topbar__notification-badge" id="notification-badge" style="display:none;">0</span>
        </button>
        <div class="topbar__user">
          <div class="avatar avatar-placeholder" id="topbar-user-avatar">P</div>
          <div class="hide-mobile">
            <div class="topbar__user-name" id="topbar-user-name">User</div>
            <div class="topbar__user-role" id="topbar-user-role">Role</div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Initialize: render sidebar + topbar, then let UI and Router set active states
   */
  init(title, breadcrumb) {
    this.render();
    this.renderTopbar(title || 'Dashboard', breadcrumb || 'Home');
  },
};
