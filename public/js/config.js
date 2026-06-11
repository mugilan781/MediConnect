// ============================================================
// MediConnect – public/js/config.js
// Frontend configuration & constants
// ============================================================

const CONFIG = {
  API_BASE_URL: '/api/v1',
  TOKEN_KEY: 'mediconnect_token',
  USER_KEY: 'mediconnect_user',

  // Roles
  ROLES: {
    PATIENT: 'patient',
    DOCTOR: 'doctor',
    ADMIN: 'admin',
  },

  // Dashboard routes by role
  DASHBOARD_ROUTES: {
    patient: '/patient-dashboard.html',
    doctor: '/doctor-dashboard.html',
    admin: '/admin-dashboard.html',
  },

  // Appointment statuses
  APPOINTMENT_STATUS: {
    PENDING: 'pending',
    SCHEDULED: 'scheduled',
    CONFIRMED: 'confirmed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    RESCHEDULED: 'rescheduled',
    NO_SHOW: 'no_show',
  },

  // Lab booking statuses
  LAB_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    SAMPLE_SCHEDULED: 'sample_scheduled',
    SAMPLE_COLLECTED: 'sample_collected',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },

  // Status badge mappings
  STATUS_BADGES: {
    // Appointment statuses
    pending: 'badge--warning',
    scheduled: 'badge--info',
    confirmed: 'badge--primary',
    completed: 'badge--success',
    cancelled: 'badge--danger',
    rescheduled: 'badge--info',
    no_show: 'badge--warning',
    // Lab booking statuses
    sample_scheduled: 'badge--info',
    sample_collected: 'badge--success',
    processing: 'badge--warning',
    // Sample collection statuses
    requested: 'badge--info',
    assigned: 'badge--primary',
    scheduled: 'badge--info',
    in_transit: 'badge--warning',
    collected: 'badge--success',
    testing: 'badge--warning',
    report_ready: 'badge--success',
    delivered: 'badge--success',
    cancelled: 'badge--danger',
    // Consultation statuses
    accepted: 'badge--primary',
    rejected: 'badge--danger',
    pending: 'badge--warning',
    // Report types
    lab_result: 'badge--info',
    prescription: 'badge--primary',
    imaging: 'badge--warning',
    discharge_summary: 'badge--success',
    other: 'badge--gray',
  },

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,

  // Date formatting
  DATE_FORMAT: { year: 'numeric', month: 'short', day: 'numeric' },
  TIME_FORMAT: { hour: '2-digit', minute: '2-digit', hour12: true },
};
