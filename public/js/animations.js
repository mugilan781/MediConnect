// ============================================================
// MediConnect – public/js/animations.js
// Scroll reveal, number counters, parallax effects
// ============================================================

const Animations = {
  /**
   * Initialize all animation systems
   */
  init() {
    this.initScrollReveal();
    this.initCounters();
    this.initAnimatedElements();
  },

  /**
   * Scroll reveal - reveal elements when they enter viewport
   */
  initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');

    if (!revealElements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    });

    revealElements.forEach(el => observer.observe(el));
  },

  /**
   * Animated number counters
   */
  initCounters() {
    const counters = document.querySelectorAll('.counter');

    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target;
          const targetValue = parseInt(target.dataset.target) || parseInt(target.textContent.replace(/[^0-9]/g, '')) || 0;
          const suffix = target.dataset.suffix || '';
          const duration = parseInt(target.dataset.duration) || 2000;
          const startTime = performance.now();

          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(eased * targetValue);

            target.textContent = currentValue.toLocaleString() + suffix;

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              target.textContent = targetValue.toLocaleString() + suffix;
            }
          };

          requestAnimationFrame(animate);
          observer.unobserve(target);
        }
      });
    }, { threshold: 0.3 });

    counters.forEach(el => observer.observe(el));
  },

  /**
   * Animate elements with CSS animation classes on scroll
   */
  initAnimatedElements() {
    const animatedElements = document.querySelectorAll('[data-animate]');

    if (!animatedElements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const animation = el.dataset.animate || 'fadeInUp';
          const delay = el.dataset.delay || '0';

          el.style.animation = `${animation} 0.6s ease forwards`;
          if (delay) el.style.animationDelay = `${delay}ms`;
          el.style.opacity = '0';

          observer.unobserve(el);
        }
      });
    }, { threshold: 0.1 });

    animatedElements.forEach(el => observer.observe(el));
  },

  /**
   * Smooth scroll to element
   */
  scrollTo(elementId, offset = 0) {
    const el = document.getElementById(elementId);
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  },

  /**
   * Parallax effect on background elements
   */
  initParallax(selector, speed = 0.3) {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
              const offset = rect.top * speed;
              el.style.transform = `translateY(${offset}px)`;
            }
          });
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  },
};

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  Animations.init();
});
