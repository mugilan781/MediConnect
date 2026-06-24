// ============================================================
// MediConnect - public/js/global-footer.js
// Global footer component
// ============================================================

const FooterIcons = {
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  twitter: '<path d="M22 4.5c-.8.4-1.6.6-2.5.7a4.3 4.3 0 0 0 1.9-2.4 8.7 8.7 0 0 1-2.7 1A4.3 4.3 0 0 0 11.3 8v1A12.2 12.2 0 0 1 2.5 4.5s-4 9 5 13a12.5 12.5 0 0 1-7 2c9 5 20 0 20-11.5 0-.2 0-.4 0-.6A8 8 0 0 0 22 4.5z"/>',
  linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  youtube: '<path d="M22 8.5a3 3 0 0 0-2.1-2.1C18 6 12 6 12 6s-6 0-7.9.4A3 3 0 0 0 2 8.5 31 31 0 0 0 2 15.5a3 3 0 0 0 2.1 2.1C6 18 12 18 12 18s6 0 7.9-.4a3 3 0 0 0 2.1-2.1 31 31 0 0 0 0-7z"/><path d="m10 15 5-3-5-3z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
};

const footerIcon = name => `<svg class="mc-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${FooterIcons[name]}</svg>`;

const GlobalFooter = {
  init(containerId = 'global-footer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.render(container);
    this.initEventListeners();
  },

  render(container) {
    const currentYear = new Date().getFullYear();

    container.innerHTML = `
      <footer class="global-footer">
        <div class="global-footer__inner">
          <div class="global-footer__brand">
            <a href="/index.html" class="global-footer__logo">
              <div class="global-footer__logo-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6v5c0 5.5 3.4 10.7 8 12 4.6-1.3 8-6.5 8-12V6l-8-4z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" stroke-width="1"/><path d="M12 8v8M8 12h8" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg></div>
              <span class="global-footer__logo-text"><span class="brand-medi">Medi</span><span class="brand-connect">Connect</span></span>
            </a>
            <p class="global-footer__desc">
              Your trusted digital clinic and appointment management platform.
              We connect patients with top healthcare providers for seamless medical care.
            </p>
            <div class="global-footer__social">
              <a href="#" class="global-footer__social-link" aria-label="Facebook">${footerIcon('facebook')}</a>
              <a href="#" class="global-footer__social-link" aria-label="Twitter">${footerIcon('twitter')}</a>
              <a href="#" class="global-footer__social-link" aria-label="LinkedIn">${footerIcon('linkedin')}</a>
              <a href="#" class="global-footer__social-link" aria-label="Instagram">${footerIcon('instagram')}</a>
              <a href="#" class="global-footer__social-link" aria-label="YouTube">${footerIcon('youtube')}</a>
            </div>
          </div>

          <div>
            <h3 class="global-footer__heading">Quick Links</h3>
            <ul class="global-footer__links">
              <li><a href="/index.html" class="global-footer__link">Home</a></li>
              <li><a href="/about.html" class="global-footer__link">About Us</a></li>
              <li><a href="/services.html" class="global-footer__link">Services</a></li>
              <li><a href="/doctors.html" class="global-footer__link">Find a Doctor</a></li>
              <li><a href="/pricing.html" class="global-footer__link">Pricing</a></li>
              <li><a href="/faq.html" class="global-footer__link">FAQ</a></li>
              <li><a href="/contact.html" class="global-footer__link">Contact Us</a></li>
            </ul>
          </div>

          <div>
            <h3 class="global-footer__heading">Services</h3>
            <ul class="global-footer__links">
              <li><a href="/appointments.html" class="global-footer__link">Book Appointment</a></li>
              <li><a href="/consultations.html" class="global-footer__link">Online Consultation</a></li>
              <li><a href="/lab-tests.html" class="global-footer__link">Lab Tests</a></li>
              <li><a href="/sample-collection.html" class="global-footer__link">Home Sample Collection</a></li>
              <li><a href="/reports.html" class="global-footer__link">Medical Reports</a></li>
              <li><a href="/history.html" class="global-footer__link">Health History</a></li>
            </ul>
          </div>

          <div>
            <h3 class="global-footer__heading">Contact</h3>
            <div class="global-footer__contact-item">
              <div class="global-footer__contact-icon">${footerIcon('pin')}</div>
              <div class="global-footer__contact-text">
                <strong>Address</strong>
                123 Healthcare Tower, Medical District, Mumbai - 400001
              </div>
            </div>
            <div class="global-footer__contact-item">
              <div class="global-footer__contact-icon">${footerIcon('phone')}</div>
              <div class="global-footer__contact-text">
                <strong>Phone</strong>
                +91 1800-123-4567<br>
                +91 22-4567-8900
              </div>
            </div>
            <div class="global-footer__contact-item">
              <div class="global-footer__contact-icon">${footerIcon('mail')}</div>
              <div class="global-footer__contact-text">
                <strong>Email</strong>
                support@mediconnect.in<br>
                care@mediconnect.in
              </div>
            </div>
          </div>

          <div>
            <h3 class="global-footer__heading">Newsletter</h3>
            <p class="global-footer__newsletter-text">
              Subscribe to our newsletter for health tips, updates, and exclusive offers.
            </p>
            <form class="global-footer__newsletter-form" id="global-footer-newsletter-form">
              <input type="email" class="global-footer__newsletter-input" placeholder="Enter your email" required>
              <button type="submit" class="global-footer__newsletter-btn">Subscribe</button>
            </form>
          </div>
        </div>

        <div class="global-footer__bottom">
          <div class="global-footer__bottom-inner">
            <span class="global-footer__copyright">&copy; ${currentYear} MediConnect. All rights reserved.</span>
            <div class="global-footer__bottom-links">
              <a href="#" class="global-footer__bottom-link">Privacy Policy</a>
              <a href="#" class="global-footer__bottom-link">Terms of Service</a>
              <a href="#" class="global-footer__bottom-link">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    `;
  },

  initEventListeners() {
    const form = document.getElementById('global-footer-newsletter-form');
    if (!form) return;

    form.addEventListener('submit', event => {
      event.preventDefault();
      const input = form.querySelector('input');
      if (input && input.value.trim()) {
        if (typeof UI !== 'undefined') UI.showToast('Thank you for subscribing!', 'success');
        input.value = '';
      }
    });
  },
};

document.addEventListener('DOMContentLoaded', () => {
  GlobalFooter.init();
});
