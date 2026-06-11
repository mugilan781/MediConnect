// ============================================================
// MediConnect – public/js/ui.js
// Sidebar toggle, modal, toast, loader helpers
// ============================================================

const UI = {
  /**
   * Toggle sidebar on mobile
   */
  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  },

  /**
   * Close sidebar (mobile)
   */
  closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('open');
  },

  /**
   * Show a toast notification
   */
  showToast(message, type = 'info', duration = 4000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span style="font-size: 1.1rem;">${icons[type] || icons.info}</span>
      <span style="flex: 1;">${message}</span>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1rem;color:var(--color-gray-400);">✕</button>
    `;

    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Show global loading overlay
   */
  showLoader() {
    let overlay = document.getElementById('global-loader');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-loader';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
  },

  /**
   * Hide global loading overlay
   */
  hideLoader() {
    const overlay = document.getElementById('global-loader');
    if (overlay) overlay.style.display = 'none';
  },

  /**
   * Open a modal by ID
   */
  openModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  /**
   * Close a modal by ID
   */
  closeModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  /**
   * Close modal when clicking overlay background
   */
  initModalClose() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
  },

  /**
   * Format a date string for display
   */
  formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', CONFIG.DATE_FORMAT);
  },

  /**
   * Format a time string for display
   */
  formatTime(timeStr) {
    if (!timeStr) return '—';
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-IN', CONFIG.TIME_FORMAT);
  },

  /**
   * Get status badge HTML
   */
  statusBadge(status) {
    const badgeClass = CONFIG.STATUS_BADGES[status] || 'badge--gray';
    const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `<span class="badge ${badgeClass}">${label}</span>`;
  },

  /**
   * Generate pagination HTML
   */
  renderPagination(pagination, onPageChange) {
    const { page, totalPages } = pagination;
    if (totalPages <= 1) return '';

    let html = '<div class="pagination">';

    // Previous
    html += `<button class="pagination__btn" ${page <= 1 ? 'disabled' : ''} onclick="${onPageChange}(${page - 1})">‹</button>`;

    // Page numbers
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    if (start > 1) {
      html += `<button class="pagination__btn" onclick="${onPageChange}(1)">1</button>`;
      if (start > 2) html += '<span class="pagination__btn" style="border:none;">…</span>';
    }

    for (let i = start; i <= end; i++) {
      html += `<button class="pagination__btn ${i === page ? 'active' : ''}" onclick="${onPageChange}(${i})">${i}</button>`;
    }

    if (end < totalPages) {
      if (end < totalPages - 1) html += '<span class="pagination__btn" style="border:none;">…</span>';
      html += `<button class="pagination__btn" onclick="${onPageChange}(${totalPages})">${totalPages}</button>`;
    }

    // Next
    html += `<button class="pagination__btn" ${page >= totalPages ? 'disabled' : ''} onclick="${onPageChange}(${page + 1})">›</button>`;

    html += '</div>';
    return html;
  },

  /**
   * Render an empty state
   */
  emptyState(icon, title, message) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">${icon}</div>
        <div class="empty-state__title">${title}</div>
        <p>${message}</p>
      </div>
    `;
  },

  /**
   * Set active sidebar link
   */
  setActiveSidebarLink() {
    const currentPath = window.location.pathname;
    document.querySelectorAll('.sidebar__link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath) {
        link.classList.add('active');
      }
    });
  },

  /**
   * Inject SEO metadata dynamically into head
   */
  injectSEO(page) {
    if (!page) return;
    document.title = page.meta_title || page.title || document.title;

    const setMeta = (name, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const setOgMeta = (property, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', page.meta_description);
    setMeta('keywords', page.meta_keywords);
    setOgMeta('og:title', page.og_title || page.title);
    setOgMeta('og:description', page.og_description || page.meta_description);
    if (page.og_image) {
      setOgMeta('og:image', page.og_image);
    }
  },

  /**
   * Initialize all UI helpers
   */
  init() {
    this.initModalClose();
    this.setActiveSidebarLink();

    // Sidebar toggle button
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleSidebar());
    }

    // Logout button (using event delegation to support dynamic sidebar replacement)
    document.addEventListener('click', (e) => {
      const logoutBtn = e.target.closest('#logout-btn');
      if (logoutBtn) {
        e.preventDefault();
        Auth.logout();
      }
    });
  },
};

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});
