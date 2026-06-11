// ============================================================
// MediConnect – middleware/validate.js
// Request body validation middleware using Joi
// ============================================================

const Joi = require('joi');

/**
 * Middleware factory that validates req.body against a Joi schema.
 * Usage: validate(schemas.registerUser)
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'params', 'query')
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors,
      });
    }

    // Replace request property with validated & sanitized value
    req[property] = value;
    next();
  };
}

// ---- Reusable Validation Schemas ----

const schemas = {
  // Auth – Generic registration (backward compat)
  register: Joi.object({
    full_name: Joi.string().min(2).max(150).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().valid('patient', 'doctor').default('patient'),
    phone: Joi.string().max(20).allow('', null),
  }),

  // Auth – Patient registration
  registerPatient: Joi.object({
    full_name: Joi.string().min(2).max(150).required()
      .messages({ 'string.min': 'Full name must be at least 2 characters' }),
    email: Joi.string().email().required()
      .messages({ 'string.email': 'Please enter a valid email address' }),
    password: Joi.string().min(6).max(128).required()
      .messages({ 'string.min': 'Password must be at least 6 characters' }),
    phone: Joi.string().pattern(/^[0-9+\-\s]{10,20}$/).allow('', null)
      .messages({ 'string.pattern.base': 'Please enter a valid phone number (10-20 digits)' }),
  }),

  // Auth – Doctor registration
  registerDoctor: Joi.object({
    full_name: Joi.string().min(2).max(150).required()
      .messages({ 'string.min': 'Full name must be at least 2 characters' }),
    email: Joi.string().email().required()
      .messages({ 'string.email': 'Please enter a valid email address' }),
    password: Joi.string().min(6).max(128).required()
      .messages({ 'string.min': 'Password must be at least 6 characters' }),
    phone: Joi.string().pattern(/^[0-9+\-\s]{10,20}$/).allow('', null)
      .messages({ 'string.pattern.base': 'Please enter a valid phone number (10-20 digits)' }),
    specialization: Joi.string().min(2).max(150).required()
      .messages({ 'any.required': 'Specialization is required' }),
    qualification: Joi.string().min(2).max(255).required()
      .messages({ 'any.required': 'Qualification is required' }),
    experience_years: Joi.number().integer().min(0).max(60).default(0),
    license_number: Joi.string().min(3).max(100).required()
      .messages({ 'any.required': 'Medical license number is required' }),
    consultation_fee: Joi.number().precision(2).min(0).default(0),
  }),

  // Auth – Forgot password
  forgotPassword: Joi.object({
    email: Joi.string().email().required()
      .messages({ 'string.email': 'Please enter a valid email address' }),
  }),

  // Auth – Reset password
  resetPassword: Joi.object({
    token: Joi.string().required()
      .messages({ 'any.required': 'Reset token is required' }),
    new_password: Joi.string().min(6).max(128).required()
      .messages({ 'string.min': 'Password must be at least 6 characters' }),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  // Appointment
  createAppointment: Joi.object({
    doctor_id: Joi.number().integer().positive().required(),
    appointment_date: Joi.date().iso().required(),
    appointment_time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    type: Joi.string().valid('in_person', 'teleconsult').default('in_person'),
    reason: Joi.string().max(1000).allow('', null),
  }),

  updateAppointmentStatus: Joi.object({
    status: Joi.string().valid('pending', 'scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show').required(),
    cancel_reason: Joi.string().max(500).allow('', null),
  }),

  rescheduleAppointment: Joi.object({
    appointment_date: Joi.date().iso().required(),
    appointment_time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    end_time: Joi.string().pattern(/^\d{2}:\d{2}$/).allow('', null),
    doctor_id: Joi.number().integer().positive().allow(null),
    reason: Joi.string().max(500).allow('', null),
  }),

  // Consultation
  createConsultation: Joi.object({
    appointment_id: Joi.number().integer().positive().allow(null),
    diagnosis: Joi.string().allow('', null),
    symptoms: Joi.string().allow('', null),
    prescription: Joi.string().allow('', null),
    follow_up_date: Joi.date().iso().allow(null),
    notes: Joi.string().allow('', null),
  }),

  createConsultationRequest: Joi.object({
    doctor_id: Joi.number().integer().positive().required()
      .messages({ 'any.required': 'Doctor selection is required.' }),
    preferred_date: Joi.date().iso().required()
      .messages({ 'any.required': 'Preferred date is required.' }),
    symptoms: Joi.string().min(5).required()
      .messages({ 'any.required': 'Symptoms description is required and must be at least 5 characters.' }),
    health_concerns: Joi.string().max(1000).allow('', null),
    additional_notes: Joi.string().max(1000).allow('', null),
  }),

  rejectConsultationRequest: Joi.object({
    reason: Joi.string().max(500).allow('', null),
  }),

  scheduleConsultation: Joi.object({
    consultation_date: Joi.date().iso().required(),
    consultation_time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    duration: Joi.number().integer().min(5).max(240).default(30),
    notes: Joi.string().max(500).allow('', null),
  }),

  addConsultationNotes: Joi.object({
    diagnosis: Joi.string().max(2000).allow('', null),
    recommendations: Joi.string().max(2000).allow('', null),
    follow_up_advice: Joi.string().max(2000).allow('', null),
    prescription_notes: Joi.string().max(2000).allow('', null),
    prescription_file_url: Joi.string().max(500).allow('', null),
  }),

  // Lab Booking
  createLabBooking: Joi.object({
    lab_test_id: Joi.number().integer().positive().required(),
    patient_id: Joi.number().integer().positive().allow(null),
    booking_date: Joi.date().iso().required(),
    preferred_time: Joi.string().pattern(/^\d{2}:\d{2}$/).allow('', null),
    notes: Joi.string().allow('', null),
  }),

  // Sample Collection
  createSampleCollection: Joi.object({
    lab_booking_id: Joi.number().integer().positive().required(),
    collection_address: Joi.string().min(5).required(),
    preferred_date: Joi.date().iso().required(),
    preferred_time_slot: Joi.string().max(50).allow('', null),
    notes: Joi.string().allow('', null),
  }),

  assignSampleCollection: Joi.object({
    collector_name: Joi.string().max(150).required(),
    collector_phone: Joi.string().pattern(/^[0-9+\-\s]{10,20}$/).required()
      .messages({ 'string.pattern.base': 'Please enter a valid phone number (10-20 digits)' }),
    collection_date: Joi.date().iso().required(),
    collection_time: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    notes: Joi.string().max(1000).allow('', null),
  }),

  updateSampleCollectionStatus: Joi.object({
    status: Joi.string().valid('requested', 'assigned', 'scheduled', 'in_transit', 'collected', 'testing', 'report_ready', 'delivered', 'cancelled').required(),
    reason: Joi.string().max(500).allow('', null),
  }),

  // Medical Report
  createMedicalReport: Joi.object({
    patient_id: Joi.number().integer().positive().required()
      .messages({ 'any.required': 'Patient selection is required.' }),
    title: Joi.string().max(255).required()
      .messages({ 'any.required': 'Report title is required.' }),
    category: Joi.string().max(100).required()
      .messages({ 'any.required': 'Report category is required.' }),
    report_type: Joi.string().valid('lab_result', 'prescription', 'imaging', 'discharge_summary', 'other').required()
      .messages({ 'any.required': 'Report type is required.' }),
    appointment_id: Joi.number().integer().positive().allow(null),
    consultation_id: Joi.number().integer().positive().allow(null),
    lab_booking_id: Joi.number().integer().positive().allow(null),
    notes: Joi.string().max(1000).allow('', null),
    is_shared_with_patient: Joi.number().integer().valid(0, 1).default(1),
  }),

  updateMedicalReport: Joi.object({
    title: Joi.string().max(255).allow('', null),
    category: Joi.string().max(100).allow('', null),
    report_type: Joi.string().valid('lab_result', 'prescription', 'imaging', 'discharge_summary', 'other').allow('', null),
    notes: Joi.string().max(1000).allow('', null),
    is_shared_with_patient: Joi.number().integer().valid(0, 1).allow(null),
  }),

  createReportCategory: Joi.object({
    category_name: Joi.string().max(100).required()
      .messages({ 'any.required': 'Category name is required.' }),
  }),

  // Lab Test (admin)
  createLabTest: Joi.object({
    test_name: Joi.string().max(200).required(),
    test_code: Joi.string().max(50).required(),
    category: Joi.string().max(100).allow('', null),
    description: Joi.string().allow('', null),
    price: Joi.number().precision(2).positive().required(),
    preparation_instructions: Joi.string().allow('', null),
    turnaround_hours: Joi.number().integer().positive().default(24),
  }),

  updateLabTest: Joi.object({
    test_name: Joi.string().max(200).allow('', null),
    test_code: Joi.string().max(50).allow('', null),
    category: Joi.string().max(100).allow('', null),
    description: Joi.string().allow('', null),
    price: Joi.number().precision(2).positive().allow(null),
    preparation_instructions: Joi.string().allow('', null),
    turnaround_hours: Joi.number().integer().positive().allow(null),
    is_active: Joi.number().integer().valid(0, 1).allow(null),
  }),

  updateLabBookingStatus: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'sample_scheduled', 'sample_collected', 'processing', 'completed', 'cancelled').required(),
  }),

  // Admin: User role change
  updateUserRole: Joi.object({
    role: Joi.string().valid('patient', 'doctor', 'admin').required(),
  }),

  // Pagination query
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(200).allow('', null),
    status: Joi.string().max(50).allow('', null),
    sort: Joi.string().max(50).default('created_at'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

module.exports = { validate, schemas };
