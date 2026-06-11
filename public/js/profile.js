// ============================================================
// MediConnect – public/js/profile.js
// Patient profile management UI
// ============================================================

const Profile = {
  profileData: null,

  async init() {
    await this.loadProfile();
    await this.loadPreferences();
    this.bindEvents();
  },

  bindEvents() {
    const form = document.getElementById('profile-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.updateProfile();
      });
    }

    const prefsForm = document.getElementById('preferences-form');
    if (prefsForm) {
      prefsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.updatePreferences();
      });
    }
  },

  /**
   * Load patient profile from API
   */
  async loadProfile() {
    try {
      UI.showLoader();
      const response = await Api.get('/patients/profile');
      if (!response.success) return;

      this.profileData = response.data;
      this.renderProfile(response.data);
    } catch (error) {
      UI.showToast('Failed to load profile.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Render profile data into the form
   */
  renderProfile(data) {
    // Header card
    const avatarEl = document.getElementById('profile-avatar');
    const nameEl = document.getElementById('profile-name');
    const roleEl = document.getElementById('profile-role');
    const emailEl = document.getElementById('profile-email');

    if (avatarEl) avatarEl.textContent = (data.full_name || 'P').charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = data.full_name || 'Patient';
    if (roleEl) roleEl.textContent = 'Patient';
    if (emailEl) emailEl.textContent = data.email || '—';

    // Form fields
    this.setField('prof-name', data.full_name);
    this.setField('prof-email', data.email);
    this.setField('prof-phone', data.phone);
    this.setField('prof-dob', data.date_of_birth ? data.date_of_birth.split('T')[0] : '');
    this.setField('prof-gender', data.gender);
    this.setField('prof-blood-group', data.blood_group);
    this.setField('prof-address', data.address);
    this.setField('prof-emergency', data.emergency_contact);
    this.setField('prof-allergies', data.allergies);
  },

  /**
   * Set a form field value
   */
  setField(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
  },

  /**
   * Update patient profile
   */
  async updateProfile() {
    try {
      const data = {
        full_name: document.getElementById('prof-name').value.trim(),
        phone: document.getElementById('prof-phone').value.trim(),
        date_of_birth: document.getElementById('prof-dob').value || null,
        gender: document.getElementById('prof-gender').value || null,
        blood_group: document.getElementById('prof-blood-group').value || null,
        address: document.getElementById('prof-address').value.trim() || null,
        emergency_contact: document.getElementById('prof-emergency').value.trim() || null,
        allergies: document.getElementById('prof-allergies').value.trim() || null,
      };

      if (!data.full_name) {
        UI.showToast('Full name is required.', 'warning');
        return;
      }

      UI.showLoader();
      const response = await Api.put('/patients/profile', data);
      if (response.success) {
        UI.showToast('Profile updated successfully!', 'success');
        this.profileData = response.data;
        this.renderProfile(response.data);

        // Update stored user data for sidebar/topbar
        const user = Auth.getUser();
        if (user) {
          user.full_name = data.full_name;
          const storage = localStorage.getItem(CONFIG.TOKEN_KEY) ? localStorage : sessionStorage;
          storage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
          Router.loadUserInfo();
        }
      }
    } catch (error) {
      UI.showToast(error.message || 'Failed to update profile.', 'error');
    } finally {
      UI.hideLoader();
    }
  },

  /**
   * Load notification preferences from API
   */
  async loadPreferences() {
    try {
      const response = await Api.get('/notifications/preferences');
      if (!response.success) return;

      const prefs = response.data;
      this.setCheckbox('pref-appointments', prefs.enable_appointment_reminders);
      this.setCheckbox('pref-consultations', prefs.enable_consultation_reminders);
      this.setCheckbox('pref-labs', prefs.enable_lab_reminders);
      this.setCheckbox('pref-collections', prefs.enable_collection_reminders);
      this.setCheckbox('pref-reports', prefs.enable_report_notifications);
      this.setCheckbox('pref-system', prefs.enable_system_notifications);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      UI.showToast('Failed to load notification preferences.', 'error');
    }
  },

  /**
   * Helper to set checkbox checked state
   */
  setCheckbox(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = !!value;
  },

  /**
   * Update notification preferences
   */
  async updatePreferences() {
    try {
      const data = {
        enable_appointment_reminders: document.getElementById('pref-appointments').checked,
        enable_consultation_reminders: document.getElementById('pref-consultations').checked,
        enable_lab_reminders: document.getElementById('pref-labs').checked,
        enable_collection_reminders: document.getElementById('pref-collections').checked,
        enable_report_notifications: document.getElementById('pref-reports').checked,
        enable_system_notifications: document.getElementById('pref-system').checked,
      };

      UI.showLoader();
      const response = await Api.put('/notifications/preferences', data);
      if (response.success) {
        UI.showToast('Notification preferences updated successfully!', 'success');
      }
    } catch (error) {
      UI.showToast(error.message || 'Failed to update preferences.', 'error');
    } finally {
      UI.hideLoader();
    }
  },
};
