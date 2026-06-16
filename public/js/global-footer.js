// ============================================================
// MediConnect – public/js/global-footer.js
// Premium healthcare SaaS footer component
// Renders into #global-footer element
// ============================================================

const GlobalFooter = {
  /**
   * Initialize footer
   */
  init(containerId = 'global-footer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.render(container);
    this.initEventListeners(container);
  },

  /**
   * Render footer HTML
   */
  render(container) {
    const currentYear = new Date().getFullYear();

    container.innerHTML = `
      <footer class="global-footer">
        <div class="global-footer__inner">
          <!-- Column 1: Brand -->
          <div class="global-footer__brand">
            <a href="/index.html" class="global-footer__logo">
              <div class="global-footer__logo-icon">M</div>
              <span class="global-footer__logo-text">MediConnect</span>
            </a>
            <p class="global-footer__desc">
              Your trusted digital clinic and appointment management platform. 
              We connect patients with top healthcare providers for seamless medical care.
            </p>
            <div class="global-footer__social">
              <a href="#" class="global-footer__social-link" aria-label="Facebook">📘</a>
              <a href="#" class="global-footer__social-link" aria-label="Twitter">🐦</a>
              <a href="#" class="global-footer__social-link" aria-label="LinkedIn">💼</a>
              <a href="#" class="global-footer__social-link" aria-label="Instagram">📸</a>
              <a href="#" class="global-footer__social-link" aria-label="YouTube">▶️</a>
            </div>
          </div>

          <!-- Column 2: Quick Links -->
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

          <!-- Column 3: Services -->
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

          <!-- Column 4: Contact -->
          <div>
            <h3 class="global-footer__heading">Contact</h3>
            <div class="global-footer__contact-item">
              <div class="global-footer__contact-icon">📍</div>
              <div class="global-footer__contact-text">
                <strong>Address</strong>
                123 Healthcare Tower, Medical District, Mumbai - 400001
              </div>
            </div>
            <div class="global-footer__contact-item">
              <div class="global-footer__contact-icon">📞</div>
              <div class="global-footer__contact-text">
                <strong>Phone</strong>
                +91 1800-123-4567<br>
                +91 22-4567-8900
              </div>
            </div>
            <div class="global-footer__contact-item">
              <div class="global-footer__contact-icon">✉️</div>
              <div class="global-footer__contact-text">
                <strong>Email</strong>
                support@mediconnect.in<br>
                care@mediconnect.in
              </div>
            </div>
          </div>

          <!-- Column 5: Newsletter -->
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

        <!-- Bottom Row -->
        <div class="global-footer__bottom">
          <div class="global-footer__bottom-inner">
            <span class="global-footer__copyright">
              &copy; ${currentYear} MediConnect. All rights reserved.
            </span>
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

  /**
   * Initialize event listeners
   */
  initEventListeners(container) {
    // Newsletter form
    const form = document.getElementById('global-footer-newsletter-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('input');
        if (input && input.value.trim()) {
          UI.showToast('Thank you for subscribing! 🎉', 'success');
          input.value = '';
        }
      });
    }
  },
};

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  GlobalFooter.init();
});
