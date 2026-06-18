// ============================================================
// MediConnect – public/js/demo-auth.js
// Client-side demo mode helper
// Provides demo user context and demo token injection
// ============================================================

const DemoAuth = {
  // Demo tokens — must match backend middleware/auth.js DEMO_TOKENS
  DEMO_TOKENS: {
    patient: 'demo-patient-token',
    doctor:  'demo-doctor-token',
    admin:   'demo-admin-token',
  },

  // Static demo user profiles (for UI rendering)
  DEMO_USERS: {
    patient: { id: 'demo', role: 'patient', full_name: 'Demo Patient', email: 'demo.patient@mediconnect.com' },
    doctor:  { id: 'demo', role: 'doctor',  full_name: 'Dr. Demo Doctor', email: 'demo.doctor@mediconnect.com' },
    admin:   { id: 'demo', role: 'admin',   full_name: 'Demo Admin', email: 'demo.admin@mediconnect.com' },
  },

  /**
   * Activate demo mode for the current page.
   * Injects demo token + demo user into sessionStorage so that
   * Api.js includes it in all requests automatically.
   * Called on dashboard page load when no real user is logged in.
   */
  activateDemoMode() {
    const role = this.inferRoleFromPage();
    const token = this.DEMO_TOKENS[role];
    const user = this.DEMO_USERS[role];

    if (!token || !user) return;

    // Only inject if no real token exists
    const existingToken = localStorage.getItem(CONFIG.TOKEN_KEY) || sessionStorage.getItem(CONFIG.TOKEN_KEY);
    if (existingToken && !this._isDemoToken(existingToken)) {
      // Real user is logged in — don't override
      return;
    }

    // Inject demo token and user into sessionStorage
    sessionStorage.setItem(CONFIG.TOKEN_KEY, token);
    sessionStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
  },

  /**
   * Check if a token is a demo token
   */
  _isDemoToken(token) {
    return Object.values(this.DEMO_TOKENS).includes(token);
  },

  /**
   * Returns the real user if logged in with matching role,
   * otherwise the demo user for the given role.
   * @param {string} role - 'patient' | 'doctor' | 'admin'
   * @returns {{ user: Object, isDemo: boolean }}
   */
  getCurrentUserOrDemo(role) {
    const realUser = Auth.getUser();
    if (realUser && realUser.role === role) {
      return { user: realUser, isDemo: false };
    }
    return { user: this.DEMO_USERS[role], isDemo: true };
  },

  /**
   * Check if we're currently in demo mode (no real authenticated user)
   */
  isDemoMode() {
    const token = localStorage.getItem(CONFIG.TOKEN_KEY) || sessionStorage.getItem(CONFIG.TOKEN_KEY);
    if (!token) return true;
    return this._isDemoToken(token);
  },

  /**
   * Infer the intended dashboard role from the current page URL.
   * Used to determine which sidebar nav to show and which demo user to use.
   */
  inferRoleFromPage() {
    const path = window.location.pathname;
    if (path.includes('doctor-dashboard')) return 'doctor';
    if (path.includes('admin-dashboard')) return 'admin';
    return 'patient';
  },

  /**
   * Returns the X-Demo-Role header value for API requests.
   * Used by Api.js as fallback when no token is present.
   */
  getDemoRoleHeader() {
    return this.inferRoleFromPage();
  },

  /**
   * Clean up demo tokens on logout or when navigating away
   */
  cleanup() {
    const token = sessionStorage.getItem(CONFIG.TOKEN_KEY);
    if (token && this._isDemoToken(token)) {
      sessionStorage.removeItem(CONFIG.TOKEN_KEY);
      sessionStorage.removeItem(CONFIG.USER_KEY);
    }
  },
};

// ── Auto-activate demo mode when this script is loaded ──────
// If no real user is logged in, inject demo credentials.
// This script is only included on pages that need demo support.
(function() {
  if (typeof CONFIG !== 'undefined') {
    DemoAuth.activateDemoMode();
  }
})();
