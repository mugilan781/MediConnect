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
};

const sideIcon = name => `<svg class="mc-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${SidebarIcons[name]}</svg>`;

const Sidebar = {
  navItems: {
    patient: [
      { section: 'Main', items: [
        { href: '/patient-dashboard.html', icon: 'chart', label: 'Dashboard' },
        { href: '/doctors.html', icon: 'search', label: 'Find a Doctor' },
        { href: '/appointments.html', icon: 'calendar', label: 'Appointments' },
        { href: '/consultations.html', icon: 'stethoscope', label: 'Consultations' },
      ] },
      { section: 'Lab & Reports', items: [
        { href: '/lab-tests.html', icon: 'microscope', label: 'Lab Tests' },
        { href: '/sample-collection.html', icon: 'home', label: 'Sample Collection' },
        { href: '/reports.html', icon: 'file', label: 'Reports' },
        { href: '/history.html', icon: 'clipboard', label: 'History' },
      ] },
      { section: 'Other', items: [
        { href: '/notifications.html', icon: 'bell', label: 'Notifications' },
        { href: '/profile.html', icon: 'user', label: 'My Profile' },
        { href: '/contact.html', icon: 'phone', label: 'Contact' },
        { href: '/about.html', icon: 'info', label: 'About' },
      ] },
    ],
    doctor: [
      { section: 'Main', items: [
        { href: '/doctor-dashboard.html', icon: 'chart', label: 'Dashboard' },
        { href: '/appointments.html', icon: 'calendar', label: 'Appointments' },
        { href: '/consultations.html', icon: 'stethoscope', label: 'Consultations' },
      ] },
      { section: 'Lab & Reports', items: [
        { href: '/lab-tests.html', icon: 'microscope', label: 'Lab Tests' },
        { href: '/reports.html', icon: 'file', label: 'Reports' },
        { href: '/history.html', icon: 'clipboard', label: 'History' },
      ] },
      { section: 'Other', items: [
        { href: '/contact.html', icon: 'phone', label: 'Contact' },
        { href: '/about.html', icon: 'info', label: 'About' },
      ] },
    ],
    admin: [
      { section: 'Main', items: [
        { href: '/admin-dashboard.html', icon: 'chart', label: 'Dashboard' },
        { href: '/appointments.html', icon: 'calendar', label: 'Appointments' },
        { href: '/consultations.html', icon: 'stethoscope', label: 'Consultations' },
      ] },
      { section: 'Lab & Reports', items: [
        { href: '/lab-tests.html', icon: 'microscope', label: 'Lab Tests' },
        { href: '/sample-collection.html', icon: 'home', label: 'Sample Collection' },
        { href: '/reports.html', icon: 'file', label: 'Reports' },
        { href: '/history.html', icon: 'clipboard', label: 'History' },
      ] },
      { section: 'Other', items: [
        { href: '/notifications.html', icon: 'bell', label: 'Notifications' },
        { href: '/contact.html', icon: 'phone', label: 'Contact' },
        { href: '/about.html', icon: 'info', label: 'About' },
      ] },
    ],
  },

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
        navHtml += `<a href="${item.href}" class="sidebar__link${isActive}"><span class="sidebar__link-icon">${sideIcon(item.icon)}</span> ${item.label}</a>`;
      });
    });

    container.innerHTML = `
      <div class="sidebar__logo">
        <div class="sidebar__logo-icon">M</div>
        <span class="sidebar__logo-text">MediConnect</span>
      </div>
      <nav class="sidebar__nav">${navHtml}</nav>
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
          <div class="hide-mobile">
            <div class="topbar__user-name" id="topbar-user-name">User</div>
            <div class="topbar__user-role" id="topbar-user-role">Role</div>
          </div>
        </div>
      </div>
    `;
  },

  init(title, breadcrumb) {
    this.render();
    this.renderTopbar(title || 'Dashboard', breadcrumb || 'Home');
  },
};
