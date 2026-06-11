// ============================================================
// MediConnect – public/js/contact.js
// Contact form handler & dynamic content loader
// ============================================================

const Contact = {
  async init() {
    // Load dynamic CMS data first
    await this.loadContactCMS();

    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      Validation.clearAllErrors();

      const data = {
        name: document.getElementById('contact-name').value.trim(),
        email: document.getElementById('contact-email').value.trim(),
        subject: document.getElementById('contact-subject').value.trim(),
        message: document.getElementById('contact-message').value.trim(),
      };

      if (!Validation.validateRequired(data.name, 'contact-name', 'Name is required')) return;
      if (!Validation.validateEmail(data.email, 'contact-email')) return;
      if (!Validation.validateRequired(data.subject, 'contact-subject', 'Subject is required')) return;
      if (!Validation.validateRequired(data.message, 'contact-message', 'Message is required')) return;

      // In a real app, this would POST to an API endpoint
      UI.showToast('Thank you! Your message has been sent. We\'ll get back to you soon.', 'success');
      form.reset();
    });
  },

  async loadContactCMS() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/cms/page/contact`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.success && result.data) {
        const { page, sections } = result.data;
        if (typeof UI !== 'undefined' && UI.injectSEO && page) {
          UI.injectSEO(page);
        }

        const contactData = sections && sections.contact;
        if (contactData) {
          const heroTitle = document.getElementById('contact-hero-title');
          const heroSubtitle = document.getElementById('contact-hero-subtitle');
          const addressTitle = document.getElementById('contact-address-title');
          const addressVal = document.getElementById('contact-address-value');
          const phoneTitle = document.getElementById('contact-phone-title');
          const phoneVal = document.getElementById('contact-phone-value');
          const emailTitle = document.getElementById('contact-email-title');
          const emailVal = document.getElementById('contact-email-value');
          const hoursTitle = document.getElementById('contact-hours-title');
          const hoursVal = document.getElementById('contact-hours-value');

          if (heroTitle && contactData.title) heroTitle.textContent = contactData.title;
          if (heroSubtitle && contactData.subtitle) heroSubtitle.textContent = contactData.subtitle;

          if (addressTitle && contactData.address_title) addressTitle.textContent = contactData.address_title;
          if (addressVal && contactData.address_value) addressVal.textContent = contactData.address_value;

          if (phoneTitle && contactData.phone_title) phoneTitle.textContent = contactData.phone_title;
          if (phoneVal && contactData.phone_value) phoneVal.textContent = contactData.phone_value;

          if (emailTitle && contactData.email_title) emailTitle.textContent = contactData.email_title;
          if (emailVal && contactData.email_value) emailVal.textContent = contactData.email_value;

          if (hoursTitle && contactData.hours_title) hoursTitle.textContent = contactData.hours_title;
          if (hoursVal && contactData.hours_value) {
            hoursVal.innerHTML = this.escapeHtml(contactData.hours_value).replace(/\n/g, '<br>');
          }

          // Render emergency contacts dynamically if present
          if (contactData.emergency_title && contactData.emergency_value) {
            const container = document.getElementById('contact-info-container');
            if (container && !document.getElementById('contact-emergency-item')) {
              const item = document.createElement('div');
              item.id = 'contact-emergency-item';
              item.className = 'contact-info__item';
              item.innerHTML = `
                <div class="contact-info__icon">🚨</div>
                <div class="contact-info__text">
                  <h4>${this.escapeHtml(contactData.emergency_title)}</h4>
                  <p>${this.escapeHtml(contactData.emergency_value)}</p>
                </div>
              `;
              container.appendChild(item);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Contact CMS: Using static fallback.', error.message);
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Contact.init();
});

