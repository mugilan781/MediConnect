// ============================================================
// MediConnect – public/js/router.js
// Client-side role redirect & page guard
// ============================================================

const Router = {
  // ALL pages are publicly viewable - no login required to browse
  publicPages: [
    '/', '/index.html', '/login.html', '/signup.html',
    '/about.html', '/contact.html', '/faq.html',
    '/doctors.html', '/services.html', '/pricing.html',
    '/lab-tests.html', '/consultations.html', '/reports.html',
    '/appointments.html', '/sample-collection.html',
    '/online-consultation.html', '/home-sample-collection.html',
    '/medical-reports.html',
    // Dashboard pages are public for demo/demonstration purposes
    '/patient-dashboard.html',
    '/doctor-dashboard.html',
    '/admin-dashboard.html',
  ],

  // Role-restricted pages - only check role when authenticated, but viewing is still allowed
  rolePages: {
    '/profile.html': ['patient', 'doctor', 'admin'],
    '/notifications.html': ['patient', 'doctor', 'admin'],
    '/history.html': ['patient', 'doctor', 'admin'],
  },

  // Pages where auth-required actions exist (booking, submitting, etc.)
  // These pages are viewable but specific actions check auth inline
  actionAuthPages: [
    '/appointments.html',   // Booking requires auth
    '/consultations.html',  // Consultation submission requires auth
    '/lab-tests.html',      // Lab booking requires auth
    '/sample-collection.html', // Sample collection request requires auth
    '/reports.html',        // Report management requires auth
  ],

  /**
   * Initialize page guard — call on every page load
   */
  init() {
    const currentPath = window.location.pathname;

    // Normalize path
    const normalizedPath = currentPath.endsWith('/') && currentPath !== '/' ? currentPath.slice(0, -1) : currentPath;

    // If on login/signup and authenticated, redirect to dashboard
    if ((normalizedPath === '/login.html' || normalizedPath === '/signup.html') && Auth.isAuthenticated()) {
      const user = Auth.getUser();
      if (user) {
        window.location.href = CONFIG.DASHBOARD_ROUTES[user.role] || '/patient-dashboard.html';
        return;
      }
    }

    // ALL pages are now publicly viewable - no forced redirect to login
    // Protected pages show content, but action buttons check auth inline

    // If authenticated doctor/admin hits shared pages, offer redirect hint (no forced redirect)
    if (Auth.isAuthenticated()) {
      const user = Auth.getUser();
      if (user && (user.role === 'doctor' || user.role === 'admin')) {
        // Store redirect hint - individual page JS can use this
        const mappings = {
          doctor: {
            '/appointments.html': '/doctor-dashboard.html?tab=appointments',
            '/consultations.html': '/doctor-dashboard.html?tab=consultations',
            '/reports.html': '/doctor-dashboard.html?tab=reports',
            '/history.html': '/doctor-dashboard.html?tab=patients',
            '/notifications.html': '/doctor-dashboard.html?tab=notifications',
            '/profile.html': '/doctor-dashboard.html?tab=profile',
            '/lab-tests.html': '/doctor-dashboard.html?tab=lab-tests',
          },
          admin: {
            '/appointments.html': '/admin-dashboard.html?tab=appointments',
            '/consultations.html': '/admin-dashboard.html?tab=consultations',
            '/lab-tests.html': '/admin-dashboard.html?tab=lab-tests',
            '/sample-collection.html': '/admin-dashboard.html?tab=samples',
            '/reports.html': '/admin-dashboard.html?tab=reports',
            '/history.html': '/admin-dashboard.html?tab=patients',
            '/notifications.html': '/admin-dashboard.html?tab=notifications',
            '/profile.html': '/admin-dashboard.html?tab=settings',
          },
        };

        const roleMappings = mappings[user.role];
        if (roleMappings && roleMappings[normalizedPath]) {
          window.sessionStorage.setItem('redirect_hint', roleMappings[normalizedPath]);
        }
      }
    }

    // If on a role-restricted page, check role (only blocks if authenticated AND wrong role)
    const allowedRoles = this.rolePages[normalizedPath];
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
    if (user) {
      const nameEl = document.getElementById('topbar-user-name');
      const roleEl = document.getElementById('topbar-user-role');
      const avatarEl = document.getElementById('topbar-user-avatar');

      if (nameEl) nameEl.textContent = user.full_name;
      if (roleEl) roleEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      if (avatarEl) avatarEl.textContent = user.full_name.charAt(0).toUpperCase();

      // Load notification count
      this.loadNotificationCount();
    }
    // Demo fallback is handled by Sidebar._applyDemoContext()
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
