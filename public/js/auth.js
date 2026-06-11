// ============================================================
// MediConnect – public/js/auth.js
// Login/signup form handlers, token storage, password toggle,
// remember me, forgot password, role-based registration
// ============================================================

const Auth = {
  // ─── Session Storage Keys ───
  REMEMBER_KEY: 'mediconnect_remember',

  /**
   * Handle login form submission
   */
  async login(email, password, remember = false) {
    try {
      this._setButtonLoading('login-btn', true);
      const response = await Api.post('/auth/login', { email, password });

      if (response.success) {
        // Persist based on remember me
        if (remember) {
          localStorage.setItem(CONFIG.TOKEN_KEY, response.data.token);
          localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(response.data.user));
          localStorage.setItem(this.REMEMBER_KEY, 'true');
        } else {
          sessionStorage.setItem(CONFIG.TOKEN_KEY, response.data.token);
          sessionStorage.setItem(CONFIG.USER_KEY, JSON.stringify(response.data.user));
          localStorage.removeItem(this.REMEMBER_KEY);
        }

        this._showAlert('login-alert', 'Login successful! Redirecting...', 'success');

        // Redirect based on role
        setTimeout(() => {
          const dashboardUrl = CONFIG.DASHBOARD_ROUTES[response.data.user.role];
          window.location.href = dashboardUrl || '/patient-dashboard.html';
        }, 600);
      }
    } catch (error) {
      this._showAlert('login-alert', error.message || 'Login failed. Please try again.', 'error');
    } finally {
      this._setButtonLoading('login-btn', false);
    }
  },

  /**
   * Register a patient
   */
  async registerPatient(formData) {
    try {
      this._setButtonLoading('signup-btn', true);
      const response = await Api.post('/auth/register/patient', formData);

      if (response.success) {
        localStorage.setItem(CONFIG.TOKEN_KEY, response.data.token);
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(response.data.user));
        this._showAlert('signup-alert', 'Patient account created successfully!', 'success');

        setTimeout(() => {
          window.location.href = CONFIG.DASHBOARD_ROUTES.patient;
        }, 600);
      }
    } catch (error) {
      this._showAlert('signup-alert', error.message || 'Registration failed.', 'error');
      if (error.errors) {
        error.errors.forEach(err => Validation.showFieldError(err.field, err.message));
      }
    } finally {
      this._setButtonLoading('signup-btn', false);
    }
  },

  /**
   * Register a doctor
   */
  async registerDoctor(formData) {
    try {
      this._setButtonLoading('signup-btn', true);
      const response = await Api.post('/auth/register/doctor', formData);

      if (response.success) {
        localStorage.setItem(CONFIG.TOKEN_KEY, response.data.token);
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(response.data.user));
        this._showAlert('signup-alert', 'Doctor account created successfully!', 'success');

        setTimeout(() => {
          window.location.href = CONFIG.DASHBOARD_ROUTES.doctor;
        }, 600);
      }
    } catch (error) {
      this._showAlert('signup-alert', error.message || 'Registration failed.', 'error');
      if (error.errors) {
        error.errors.forEach(err => Validation.showFieldError(err.field, err.message));
      }
    } finally {
      this._setButtonLoading('signup-btn', false);
    }
  },

  /**
   * Handle signup form submission (backward compat)
   */
  async register(formData) {
    try {
      this._setButtonLoading('signup-btn', true);
      const response = await Api.post('/auth/register', formData);

      if (response.success) {
        localStorage.setItem(CONFIG.TOKEN_KEY, response.data.token);
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(response.data.user));
        UI.showToast('Account created successfully!', 'success');

        setTimeout(() => {
          const dashboardUrl = CONFIG.DASHBOARD_ROUTES[response.data.user.role];
          window.location.href = dashboardUrl || '/patient-dashboard.html';
        }, 500);
      }
    } catch (error) {
      UI.showToast(error.message || 'Registration failed.', 'error');
      if (error.errors) {
        error.errors.forEach(err => Validation.showFieldError(err.field, err.message));
      }
    } finally {
      this._setButtonLoading('signup-btn', false);
    }
  },

  /**
   * Handle forgot password request
   */
  async forgotPassword(email) {
    try {
      this._setButtonLoading('forgot-btn', true);
      const response = await Api.post('/auth/forgot-password', { email });

      if (response.success) {
        this._showAlert('login-alert', 'If an account with that email exists, a reset link has been sent. Please check your inbox.', 'success');
        // Hide forgot section
        const section = document.getElementById('forgot-section');
        if (section) section.classList.remove('visible');
      }
    } catch (error) {
      this._showAlert('login-alert', error.message || 'Failed to send reset email.', 'error');
    } finally {
      this._setButtonLoading('forgot-btn', false);
    }
  },

  /**
   * Logout – clear storage and redirect
   */
  logout() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    localStorage.removeItem(this.REMEMBER_KEY);
    sessionStorage.removeItem(CONFIG.TOKEN_KEY);
    sessionStorage.removeItem(CONFIG.USER_KEY);
    window.location.href = '/login.html';
  },

  /**
   * Get current user from storage (localStorage or sessionStorage)
   */
  getUser() {
    const userStr = localStorage.getItem(CONFIG.USER_KEY) || sessionStorage.getItem(CONFIG.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Get JWT token
   */
  getToken() {
    return localStorage.getItem(CONFIG.TOKEN_KEY) || sessionStorage.getItem(CONFIG.TOKEN_KEY);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * Check if user has a specific role
   */
  hasRole(role) {
    const user = this.getUser();
    return user && user.role === role;
  },

  // ─────────────────────────────────────────────────
  // Page Initializers
  // ─────────────────────────────────────────────────

  /**
   * Initialize login page
   */
  initLoginPage() {
    const form = document.getElementById('login-form');
    if (!form) return;

    // Restore remembered email
    const rememberedEmail = localStorage.getItem('mediconnect_remembered_email');
    if (rememberedEmail) {
      const emailInput = document.getElementById('login-email');
      const rememberCheckbox = document.getElementById('login-remember');
      if (emailInput) emailInput.value = rememberedEmail;
      if (rememberCheckbox) rememberCheckbox.checked = true;
    }

    // Login form submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const remember = document.getElementById('login-remember')?.checked || false;

      if (!email || !password) {
        this._showAlert('login-alert', 'Please fill in all fields.', 'error');
        return;
      }

      // Save/clear remembered email
      if (remember) {
        localStorage.setItem('mediconnect_remembered_email', email);
      } else {
        localStorage.removeItem('mediconnect_remembered_email');
      }

      await Auth.login(email, password, remember);
    });

    // Password visibility toggle
    this._initPasswordToggle('login-password-toggle', 'login-password');

    // Forgot password link
    const forgotLink = document.getElementById('forgot-password-link');
    const forgotSection = document.getElementById('forgot-section');
    const forgotCancel = document.getElementById('forgot-cancel');
    const forgotForm = document.getElementById('forgot-form');

    if (forgotLink && forgotSection) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        forgotSection.classList.toggle('visible');
        if (forgotSection.classList.contains('visible')) {
          document.getElementById('forgot-email')?.focus();
        }
      });
    }

    if (forgotCancel && forgotSection) {
      forgotCancel.addEventListener('click', () => {
        forgotSection.classList.remove('visible');
      });
    }

    if (forgotForm) {
      forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value.trim();
        if (!email) {
          Validation.showFieldError('forgot-email', 'Email is required');
          return;
        }
        await Auth.forgotPassword(email);
      });
    }
  },

  /**
   * Initialize signup page
   */
  initSignupPage() {
    const form = document.getElementById('signup-form');
    if (!form) return;

    // Role toggle
    this._initRoleToggle();

    // Password visibility toggles
    this._initPasswordToggle('signup-password-toggle', 'signup-password');
    this._initPasswordToggle('confirm-password-toggle', 'signup-confirm-password');

    // Password strength indicator
    const passwordInput = document.getElementById('signup-password');
    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        this._updatePasswordStrength(passwordInput.value);
      });
    }

    // Form submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      Validation.clearAllErrors();

      const role = document.getElementById('signup-role')?.value || 'patient';
      const fullName = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const phone = document.getElementById('signup-phone')?.value.trim() || '';
      const password = document.getElementById('signup-password').value;
      const confirmPassword = document.getElementById('signup-confirm-password').value;

      // Validation
      if (!Validation.validateRequired(fullName, 'signup-name', 'Full name is required')) return;
      if (!Validation.validateEmail(email, 'signup-email')) return;
      if (!Validation.validateMinLength(password, 6, 'signup-password', 'Password must be at least 6 characters')) return;
      if (!Validation.validatePasswordMatch(password, confirmPassword, 'signup-confirm-password')) return;
      if (phone && !Validation.validatePhone(phone, 'signup-phone')) return;

      if (role === 'doctor') {
        // Doctor-specific validation
        const specialization = document.getElementById('signup-specialization').value;
        const qualification = document.getElementById('signup-qualification').value.trim();
        const license = document.getElementById('signup-license').value.trim();

        if (!specialization) {
          Validation.showFieldError('signup-specialization', 'Specialization is required');
          return;
        }
        if (!Validation.validateRequired(qualification, 'signup-qualification', 'Qualification is required')) return;
        if (!Validation.validateRequired(license, 'signup-license', 'License number is required')) return;

        const doctorData = {
          full_name: fullName,
          email,
          password,
          phone,
          specialization,
          qualification,
          experience_years: parseInt(document.getElementById('signup-experience')?.value) || 0,
          license_number: license,
        };

        await Auth.registerDoctor(doctorData);
      } else {
        // Patient registration
        const patientData = {
          full_name: fullName,
          email,
          password,
          phone,
        };

        await Auth.registerPatient(patientData);
      }
    });
  },

  // ─────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────

  /**
   * Initialize password visibility toggle
   */
  _initPasswordToggle(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if (!toggle || !input) return;

    toggle.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      // Toggle eye icon
      const slashLine = toggle.querySelector('.eye-slash-line') || toggle.querySelector('[id$="eye-slash"]');
      if (slashLine) {
        slashLine.style.display = isPassword ? 'block' : 'none';
      }
    });
  },

  /**
   * Initialize role toggle (Patient/Doctor)
   */
  _initRoleToggle() {
    const patientBtn = document.getElementById('role-patient-btn');
    const doctorBtn = document.getElementById('role-doctor-btn');
    const roleInput = document.getElementById('signup-role');
    const doctorFields = document.getElementById('doctor-fields');

    if (!patientBtn || !doctorBtn) return;

    const setRole = (role) => {
      if (roleInput) roleInput.value = role;

      // Toggle active states
      patientBtn.classList.toggle('active', role === 'patient');
      doctorBtn.classList.toggle('active', role === 'doctor');

      // Show/hide doctor fields
      if (doctorFields) {
        doctorFields.classList.toggle('visible', role === 'doctor');

        // Toggle required attribute on doctor fields
        const reqFields = ['signup-specialization', 'signup-qualification', 'signup-license'];
        reqFields.forEach(id => {
          const field = document.getElementById(id);
          if (field) {
            if (role === 'doctor') {
              field.setAttribute('required', '');
            } else {
              field.removeAttribute('required');
            }
          }
        });
      }

      // Update button text
      const submitBtn = document.getElementById('signup-btn');
      if (submitBtn) {
        submitBtn.textContent = role === 'doctor' ? 'Register as Doctor' : 'Create Account';
      }
    };

    patientBtn.addEventListener('click', () => setRole('patient'));
    doctorBtn.addEventListener('click', () => setRole('doctor'));
  },

  /**
   * Update password strength indicator
   */
  _updatePasswordStrength(password) {
    const fill = document.getElementById('password-strength-fill');
    const label = document.getElementById('password-strength-label');
    if (!fill || !label) return;

    let strength = 0;
    const checks = {
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    strength = Object.values(checks).filter(Boolean).length;

    if (password.length === 0) {
      fill.className = 'password-strength__fill';
      label.className = 'password-strength__label';
      label.textContent = '';
      return;
    }

    const levels = [
      { min: 1, cls: 'weak', text: 'Weak password' },
      { min: 2, cls: 'fair', text: 'Fair password' },
      { min: 3, cls: 'good', text: 'Good password' },
      { min: 4, cls: 'strong', text: 'Strong password' },
    ];

    const level = levels.reduce((acc, l) => (strength >= l.min ? l : acc), levels[0]);
    fill.className = `password-strength__fill ${level.cls}`;
    label.className = `password-strength__label ${level.cls}`;
    label.textContent = level.text;
  },

  /**
   * Show inline alert message
   */
  _showAlert(alertId, message, type = 'info') {
    const alert = document.getElementById(alertId);
    if (!alert) {
      UI.showToast(message, type);
      return;
    }

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    alert.className = `auth-alert auth-alert--${type} visible`;
    alert.innerHTML = `<span>${icons[type] || icons.info}</span> <span>${message}</span>`;

    // Auto-hide after 8 seconds for success
    if (type === 'success') {
      setTimeout(() => {
        alert.classList.remove('visible');
      }, 8000);
    }
  },

  /**
   * Set button loading state
   */
  _setButtonLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    if (loading) {
      btn._originalText = btn.textContent;
      btn.classList.add('btn--loading');
      btn.disabled = true;
      btn.textContent = 'Please wait...';
    } else {
      btn.classList.remove('btn--loading');
      btn.disabled = false;
      btn.textContent = btn._originalText || btn.textContent;
    }
  },
};
