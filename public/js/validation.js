// ============================================================
// MediConnect – public/js/validation.js
// Client-side form validation helpers
// ============================================================

const Validation = {
  /**
   * Show error on a specific field
   */
  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.add('form-input--error');

    // Remove existing error message
    const existingError = field.parentElement.querySelector('.form-error');
    if (existingError) existingError.remove();

    // Add error message
    const errorEl = document.createElement('div');
    errorEl.className = 'form-error';
    errorEl.textContent = message;
    field.parentElement.appendChild(errorEl);
  },

  /**
   * Clear error on a specific field
   */
  clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.remove('form-input--error');
    const errorEl = field.parentElement.querySelector('.form-error');
    if (errorEl) errorEl.remove();
  },

  /**
   * Clear all form errors
   */
  clearAllErrors() {
    document.querySelectorAll('.form-input--error').forEach(el => el.classList.remove('form-input--error'));
    document.querySelectorAll('.form-error').forEach(el => el.remove());
  },

  /**
   * Validate required field
   */
  validateRequired(value, fieldId, message = 'This field is required') {
    if (!value || value.trim() === '') {
      this.showFieldError(fieldId, message);
      return false;
    }
    this.clearFieldError(fieldId);
    return true;
  },

  /**
   * Validate email format
   */
  validateEmail(value, fieldId) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      this.showFieldError(fieldId, 'Please enter a valid email address');
      return false;
    }
    this.clearFieldError(fieldId);
    return true;
  },

  /**
   * Validate minimum length
   */
  validateMinLength(value, minLength, fieldId, message) {
    if (value.length < minLength) {
      this.showFieldError(fieldId, message || `Must be at least ${minLength} characters`);
      return false;
    }
    this.clearFieldError(fieldId);
    return true;
  },

  /**
   * Validate password confirmation match
   */
  validatePasswordMatch(password, confirm, fieldId) {
    if (password !== confirm) {
      this.showFieldError(fieldId, 'Passwords do not match');
      return false;
    }
    this.clearFieldError(fieldId);
    return true;
  },

  /**
   * Validate phone number
   */
  validatePhone(value, fieldId) {
    if (value && !/^\d{10,15}$/.test(value.replace(/[\s\-\+]/g, ''))) {
      this.showFieldError(fieldId, 'Please enter a valid phone number');
      return false;
    }
    this.clearFieldError(fieldId);
    return true;
  },

  /**
   * Validate date is not in the past
   */
  validateFutureDate(value, fieldId) {
    const selected = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected < today) {
      this.showFieldError(fieldId, 'Date cannot be in the past');
      return false;
    }
    this.clearFieldError(fieldId);
    return true;
  },

  /**
   * Add live validation on blur to form inputs
   */
  initLiveValidation(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
      input.addEventListener('blur', () => {
        if (input.hasAttribute('required') && !input.value.trim()) {
          this.showFieldError(input.id, 'This field is required');
        } else {
          this.clearFieldError(input.id);
        }
      });

      // Clear error on input
      input.addEventListener('input', () => {
        this.clearFieldError(input.id);
      });
    });
  },
};
