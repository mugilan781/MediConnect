// ============================================================
// MediConnect – public/js/reports.js
// Report view/download UI
// ============================================================

const Reports = {
  currentPage: 1,

  async init() {
    await this.loadReports();
  },

  formatBytes(bytes, decimals = 1) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  async loadReports() {
    try {
      const response = await Api.get(`/reports?page=${this.currentPage}&limit=${CONFIG.DEFAULT_PAGE_SIZE}`);
      const container = document.getElementById('reports-list');
      if (!container || !response.success) return;

      if (response.data.length === 0) {
        container.innerHTML = UI.emptyState('📄', 'No Reports', 'No medical reports found.');
        return;
      }

      container.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Type</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Size</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${response.data.map(r => `
                <tr>
                  <td><strong>${r.title}</strong></td>
                  <td><span class="badge badge--info">${r.category || 'General'}</span></td>
                  <td>${UI.statusBadge(r.report_type)}</td>
                  <td>${r.doctor_name || '—'}</td>
                  <td>${UI.formatDate(r.created_at)}</td>
                  <td><span class="text-sm text-muted">${this.formatBytes(r.file_size)}</span></td>
                  <td>
                    ${r.file_url ? `<button onclick="Reports.downloadReport(${r.id}, '${r.original_filename.replace(/'/g, "\\'") || 'medical_report.pdf'}')" class="btn btn--sm btn--primary">Download</button>` : '<span class="text-muted text-sm">Not available</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${UI.renderPagination(response.pagination, 'Reports.goToPage')}`;
    } catch (error) {
      UI.showToast('Failed to load reports.', 'error');
    }
  },

  async downloadReport(id, filename) {
    try {
      const token = localStorage.getItem(CONFIG.TOKEN_KEY) || sessionStorage.getItem(CONFIG.TOKEN_KEY);
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${CONFIG.API_BASE_URL}/reports/${id}/download`, {
        method: 'GET',
        headers: headers
      });
      if (!response.ok) {
        throw new Error('Failed to download report');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename || 'medical-report.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      UI.showToast('Report downloaded successfully.', 'success');
    } catch (error) {
      console.error(error);
      UI.showToast('Failed to download report.', 'error');
    }
  },

  goToPage(page) { this.currentPage = page; this.loadReports(); },
};
