// ============================================================
// MediConnect – public/js/router.js
// Client-side role redirect & page guard
// ============================================================

const Router = {
  // Pages that don't require authentication
  publicPages: [
    '/', '/index.html', '/login.html', '/signup.html',
    '/about.html', '/contact.html',
    // Dashboard pages are public for demo/demonstration purposes
    '/patient-dashboard.html',
    '/doctor-dashboard.html',
    '/admin-dashboard.html',
  ],

  // Role-restricted pages (dashboards removed per demo requirement)
  rolePages: {
    '/appointments.html': ['patient', 'doctor', 'admin'],
    '/consultations.html': ['patient', 'doctor', 'admin'],
    '/lab-tests.html': ['patient', 'doctor', 'admin'],
    '/sample-collection.html': ['patient', 'admin'],
    '/reports.html': ['patient', 'doctor', 'admin'],
    '/history.html': ['patient', 'doctor', 'admin'],
    '/notifications.html': ['patient', 'doctor', 'admin'],
    '/profile.html': ['patient', 'doctor', 'admin'],
  },

  /**
   * Initialize page guard — call on every protected page load
   */
  init() {
    const currentPath = window.location.pathname;

    // If on login/signup and authenticated, redirect to dashboard
    if ((currentPath === '/login.html' || currentPath === '/signup.html') && Auth.isAuthenticated()) {
      const user = Auth.getUser();
      if (user) {
        window.location.href = CONFIG.DASHBOARD_ROUTES[user.role] || '/patient-dashboard.html';
        return;
      }
    }

    // If on a protected page (not public) and NOT authenticated, redirect to login
    if (!this.publicPages.includes(currentPath) && !Auth.isAuthenticated()) {
      window.location.href = '/login.html';
      return;
    }

    // If doctor is authenticated and hits shared pages, redirect to doctor-dashboard tabs
    if (Auth.isAuthenticated()) {
      const user = Auth.getUser();
      if (user && user.role === 'doctor') {
        const mappings = {
          '/appointments.html': '/doctor-dashboard.html?tab=appointments',
          '/consultations.html': '/doctor-dashboard.html?tab=consultations',
          '/reports.html': '/doctor-dashboard.html?tab=reports',
          '/history.html': '/doctor-dashboard.html?tab=patients',
          '/notifications.html': '/doctor-dashboard.html?tab=notifications',
          '/profile.html': '/doctor-dashboard.html?tab=profile'
        };
        if (mappings[currentPath]) {
          window.location.href = mappings[currentPath];
          return;
        }
      }
      if (user && user.role === 'admin') {
        const mappings = {
          '/appointments.html': '/admin-dashboard.html?tab=appointments',
          '/consultations.html': '/admin-dashboard.html?tab=consultations',
          '/lab-tests.html': '/admin-dashboard.html?tab=lab-tests',
          '/sample-collection.html': '/admin-dashboard.html?tab=samples',
          '/reports.html': '/admin-dashboard.html?tab=reports',
          '/history.html': '/admin-dashboard.html?tab=patients',
          '/notifications.html': '/admin-dashboard.html?tab=notifications',
          '/profile.html': '/admin-dashboard.html?tab=settings'
        };
        if (mappings[currentPath]) {
          window.location.href = mappings[currentPath];
          return;
        }
      }
    }

    // If on a role-restricted page, check role
    const allowedRoles = this.rolePages[currentPath];
    if (allowedRoles && Auth.isAuthenticated()) {
      const user = Auth.getUser();
      if (user && !allowedRoles.includes(user.role)) {
        window.location.href = CONFIG.DASHBOARD_ROUTES[user.role] || '/index.html';
        return;
      }
    }

    // Load user info into topbar
    this.loadUserInfo();
  },

  /**
   * Populate topbar with current user info
   */
  loadUserInfo() {
    const user = Auth.getUser();
    if (!user) return;

    const nameEl = document.getElementById('topbar-user-name');
    const roleEl = document.getElementById('topbar-user-role');
    const avatarEl = document.getElementById('topbar-user-avatar');

    if (nameEl) nameEl.textContent = user.full_name;
    if (roleEl) roleEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    if (avatarEl) avatarEl.textContent = user.full_name.charAt(0).toUpperCase();

    // Load notification count
    this.loadNotificationCount();
  },

  /**
   * Load unread notification badge count
   */
  async loadNotificationCount() {
    try {
      const response = await Api.get('/notifications/unread-count');
      const badge = document.getElementById('notification-badge');
      if (badge && response.success) {
        const count = response.data.count;
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
    } catch (error) {
      // Silently fail — notifications are non-critical
    }
  },

  /**
   * Navigate to a page
   */
  navigate(url) {
    window.location.href = url;
  },
};

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  Router.init();
});
