// ============================================================
// MediConnect – public/js/api.js
// Fetch wrapper for all API calls with JWT / demo token auth
// ============================================================

const Api = {
  /**
   * Base fetch wrapper that attaches Authorization header.
   * Works with both real JWT tokens and demo tokens.
   * @param {string} endpoint - API endpoint (e.g. '/auth/login')
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Parsed JSON response
   */
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem(CONFIG.TOKEN_KEY) || sessionStorage.getItem(CONFIG.TOKEN_KEY);

    const headers = {
      ...(options.headers || {}),
    };

    // Don't set Content-Type for FormData (multipart)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (typeof DemoAuth !== 'undefined') {
      // Fallback: if no token at all but DemoAuth exists, send role hint header
      headers['X-Demo-Role'] = DemoAuth.getDemoRoleHeader();
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        body: options.body instanceof FormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
      });

      // Handle 401 — token expired or invalid
      if (response.status === 401) {
        // Only clear tokens and redirect if it's a REAL token that expired
        // Don't clear demo tokens — they don't expire
        const isDemoToken = typeof DemoAuth !== 'undefined' && DemoAuth._isDemoToken(token);
        if (!isDemoToken) {
          localStorage.removeItem(CONFIG.TOKEN_KEY);
          localStorage.removeItem(CONFIG.USER_KEY);
          sessionStorage.removeItem(CONFIG.TOKEN_KEY);
          sessionStorage.removeItem(CONFIG.USER_KEY);
          
          const isDashboardPage = window.location.pathname.includes('dashboard');
          const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html');
          // Don't redirect on auth pages or dashboard pages (demo mode handles dashboards)
          if (!isAuthPage && !isDashboardPage) {
            window.location.href = '/login.html';
            return;
          }
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw { status: response.status, ...data };
      }

      return data;
    } catch (error) {
      if (error.status) throw error;
      console.error('API Error:', error);
      throw { success: false, message: 'Network error. Please check your connection.' };
    }
  },

  // Convenience methods
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  },

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  },

  patch(endpoint, body) {
    return this.request(endpoint, { method: 'PATCH', body });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  /**
   * Upload file with FormData
   */
  upload(endpoint, formData) {
    return this.request(endpoint, { method: 'POST', body: formData });
  },
};
