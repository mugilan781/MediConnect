// ============================================================
// MediConnect – public/js/notifications.js
// Notification bell & list UI
// ============================================================

const Notifications = {
  currentPage: 1,

  async init() {
    await this.loadNotifications();

    // Bind "Mark All Read" button
    const markAllBtn = document.getElementById('mark-all-read-btn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => this.markAllRead());
    }

    // Bind search and filter
    let searchTimeout = null;
    document.getElementById('notif-search')?.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.currentPage = 1;
        this.loadNotifications();
      }, 300);
    });

    document.getElementById('notif-filter-type')?.addEventListener('change', () => {
      this.currentPage = 1;
      this.loadNotifications();
    });
  },

  async loadNotifications() {
    try {
      const searchVal = document.getElementById('notif-search')?.value || '';
      const typeVal = document.getElementById('notif-filter-type')?.value || '';
      const response = await Api.get(`/notifications?page=${this.currentPage}&limit=20&search=${encodeURIComponent(searchVal)}&type=${typeVal}`);
      const container = document.getElementById('notifications-list');
      if (!container || !response.success) return;

      if (response.data.length === 0) {
        container.innerHTML = UI.emptyState('🔔', 'No Notifications', 'You\'re all caught up!');
        const pagContainer = document.getElementById('notifications-pagination');
        if (pagContainer) pagContainer.innerHTML = '';
        return;
      }

      container.innerHTML = response.data.map(n => `
        <div class="appointment-item ${n.is_read ? '' : 'notif-unread'}" style="cursor: pointer;" onclick="Notifications.markAndNavigate(${n.id}, '${n.link || ''}')">
          <div class="appointment-item__time" style="background: ${n.is_read ? 'var(--color-gray-50, #f9fafb)' : 'var(--color-mint-light)'};">
            <div style="font-size: 1.5rem;">${this.getIcon(n.type)}</div>
          </div>
          <div class="appointment-item__info">
            <div class="appointment-item__name">${n.title}</div>
            <div class="appointment-item__detail">${n.message}</div>
            <div class="text-xs text-muted mt-1">${this.timeAgo(n.created_at)}</div>
          </div>
          <div class="d-flex gap-2 items-center">
            ${!n.is_read ? '<span class="badge badge--primary">New</span>' : ''}
            ${!n.is_read ? `<button class="btn btn--sm btn--ghost" onclick="event.stopPropagation(); Notifications.markSingleRead(${n.id})" title="Mark as read">✓</button>` : ''}
          </div>
        </div>
      `).join('');

      const pagContainer = document.getElementById('notifications-pagination');
      if (pagContainer) {
        pagContainer.innerHTML = UI.renderPagination(response.pagination, 'Notifications.goToPage');
      }
    } catch (error) {
      UI.showToast('Failed to load notifications.', 'error');
    }
  },

  async markAndNavigate(id, link) {
    try { await Api.patch(`/notifications/${id}/read`); } catch (e) {}
    if (link) window.location.href = link;
    else await this.loadNotifications();
  },

  async markSingleRead(id) {
    try {
      await Api.patch(`/notifications/${id}/read`);
      UI.showToast('Notification marked as read.', 'success');
      await this.loadNotifications();
      Router.loadNotificationCount();
    } catch (error) {
      UI.showToast('Failed to mark notification.', 'error');
    }
  },

  async markAllRead() {
    try {
      await Api.patch('/notifications/read-all');
      UI.showToast('All notifications marked as read.', 'success');
      await this.loadNotifications();
      Router.loadNotificationCount();
    } catch (error) {
      UI.showToast('Failed to mark notifications.', 'error');
    }
  },

  getIcon(type) {
    const icons = { appointment: '📅', lab: '🔬', report: '📄', system: '⚙️', reminder: '⏰' };
    return icons[type] || '🔔';
  },

  timeAgo(dateStr) {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return UI.formatDate(dateStr);
  },

  goToPage(page) {
    this.currentPage = page;
    this.loadNotifications();
  },
};
