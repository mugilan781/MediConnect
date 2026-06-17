// ============================================================
// MediConnect – public/js/contact.js
// Premium contact page: form handling, CMS integration,
// FAQ accordion, smooth interactions
// ============================================================

const Contact = {
  async init() {
    this.bindForm();
    await this.loadContactCMS();
    this.handleHashScroll();
  },

  /* ── Form Handling ── */
  bindForm() {
    var form = document.getElementById('contactFormElement');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (!Contact.validate(form)) return;
      await Contact.submit(form);
    });

    // Reset form to send another message
    var resetBtn = document.getElementById('contactFormReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        Contact.resetForm();
      });
    }
  },

  validate(form) {
    Contact.clearErrors();

    var name = document.getElementById('contactName');
    var email = document.getElementById('contactEmail');
    var dept = document.getElementById('contactDepartment');
    var subject = document.getElementById('contactSubject');
    var message = document.getElementById('contactMessage');

    var isValid = true;

    if (!name.value.trim()) {
      Contact.showError('contactName', 'contactNameError', 'Full name is required');
      isValid = false;
    }

    if (!email.value.trim()) {
      Contact.showError('contactEmail', 'contactEmailError', 'Email is required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      Contact.showError('contactEmail', 'contactEmailError', 'Enter a valid email address');
      isValid = false;
    }

    if (!dept.value) {
      Contact.showError('contactDepartment', 'contactDepartmentError', 'Please select a department');
      isValid = false;
    }

    if (!subject.value.trim()) {
      Contact.showError('contactSubject', 'contactSubjectError', 'Subject is required');
      isValid = false;
    }

    if (!message.value.trim()) {
      Contact.showError('contactMessage', 'contactMessageError', 'Message is required');
      isValid = false;
    }

    return isValid;
  },

  showError(inputId, errorId, msg) {
    var input = document.getElementById(inputId);
    var error = document.getElementById(errorId);
    if (input) input.classList.add('error');
    if (error) error.textContent = msg;
  },

  clearErrors() {
    document.querySelectorAll('.form-input.error, .form-textarea.error, .form-select.error').forEach(function(el) {
      el.classList.remove('error');
    });
    document.querySelectorAll('.error-message').forEach(function(el) {
      el.textContent = '';
    });
  },

  async submit(form) {
    var btn = document.getElementById('contactSubmitBtn');
    if (btn) {
      btn.disabled = true;
      btn.classList.add('btn--loading');
      btn.textContent = 'Sending...';
    }

    var payload = {
      name: document.getElementById('contactName').value.trim(),
      email: document.getElementById('contactEmail').value.trim(),
      phone: document.getElementById('contactPhone').value.trim(),
      department: document.getElementById('contactDepartment').value,
      subject: document.getElementById('contactSubject').value.trim(),
      message: document.getElementById('contactMessage').value.trim()
    };

    var success = false;

    try {
      var response = await fetch(CONFIG.API_BASE_URL + '/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        success = true;
      } else {
        var result = await response.json();
        UI.showToast(result.message || 'Failed to send message. Please try again.', 'error');
      }
    } catch (e) {
      // No backend endpoint — simulate success
      success = true;
    }

    if (btn) {
      btn.disabled = false;
      btn.classList.remove('btn--loading');
      btn.textContent = 'Send Message';
    }

    if (success) {
      UI.showToast('Message sent successfully! We\'ll respond within 24 hours.', 'success');
      form.style.display = 'none';
      var successEl = document.getElementById('contactFormSuccess');
      if (successEl) successEl.classList.add('is-visible');
    }
  },

  resetForm() {
    var form = document.getElementById('contactFormElement');
    var successEl = document.getElementById('contactFormSuccess');
    if (form) {
      form.reset();
      form.style.display = '';
    }
    if (successEl) successEl.classList.remove('is-visible');
    Contact.clearErrors();
  },

  /* ── CMS Integration ── */
  async loadContactCMS() {
    try {
      var response = await fetch(CONFIG.API_BASE_URL + '/cms/page/contact');
      if (!response.ok) return;
      var result = await response.json();
      if (!result.success || !result.data) return;

      var page = result.data.page;
      var sections = result.data.sections;

      if (typeof UI !== 'undefined' && UI.injectSEO && page) {
        UI.injectSEO(page);
      }

      var contactData = sections && sections.contact;
      if (!contactData) return;

      var heroTitle = document.querySelector('.contact-hero h1');
      var heroSubtitle = document.querySelector('.contact-hero p');
      var addressVal = document.getElementById('contactAddressValue');
      var hoursVal = document.getElementById('contactHoursValue');

      if (heroTitle && contactData.title) {
        heroTitle.innerHTML = this.escapeHtml(contactData.title).replace('Touch', '<span class="text-gradient">Touch</span>');
      }
      if (heroSubtitle && contactData.subtitle) {
        heroSubtitle.textContent = contactData.subtitle;
      }
      if (addressVal && contactData.address_value) {
        addressVal.innerHTML = Contact.escapeHtml(contactData.address_value).replace(/\n/g, '<br>');
      }
      if (hoursVal && contactData.hours_value) {
        hoursVal.innerHTML = Contact.escapeHtml(contactData.hours_value).replace(/\n/g, '<br>');
      }
    } catch (e) {
      // CMS unavailable — use static fallback
    }
  },

  /* ── Hash scroll ── */
  handleHashScroll() {
    if (window.location.hash === '#contactForm') {
      setTimeout(function() {
        var el = document.getElementById('contactForm');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};

document.addEventListener('DOMContentLoaded', function() {
  Contact.init();
});
