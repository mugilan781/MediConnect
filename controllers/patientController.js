// ============================================================
// MediConnect – controllers/patientController.js
// Patient CRUD & profile management
// ============================================================

const Patient = require('../models/Patient');
const User = require('../models/User');

exports.getAll = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    if (req.user.role === 'doctor') {
      const Doctor = require('../models/Doctor');
      const doc = await Doctor.findByUserId(req.user.id);
      if (doc) filters.doctor_id = doc.id;
    }
    const result = await Patient.findAll(filters);
    res.json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, data: patient });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    await Patient.update(req.params.id, req.body);
    // Also update user fields if provided
    const patient = await Patient.findById(req.params.id);
    if (req.body.full_name || req.body.phone) {
      await User.update(patient.user_id, { full_name: req.body.full_name, phone: req.body.phone });
    }
    const updated = await Patient.findById(req.params.id);
    res.json({ success: true, message: 'Patient profile updated.', data: updated });
  } catch (error) { next(error); }
};

exports.deactivate = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    await User.deactivate(patient.user_id);
    res.json({ success: true, message: 'Patient account deactivated.' });
  } catch (error) { next(error); }
};

exports.getSummary = async (req, res, next) => {
  try {
    const summary = await Patient.getSummary(req.params.id);
    res.json({ success: true, data: summary });
  } catch (error) { next(error); }
};

/**
 * Get logged-in patient's own profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const patient = await Patient.findByUserId(req.user.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found.' });
    res.json({ success: true, data: patient });
  } catch (error) { next(error); }
};

/**
 * Update logged-in patient's own profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const patient = await Patient.findByUserId(req.user.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found.' });

    // Allowed patient self-update fields
    const { phone, address, emergency_contact, date_of_birth, gender, blood_group, allergies } = req.body;

    // Update patient table fields
    await Patient.update(patient.id, { address, emergency_contact, date_of_birth, gender, blood_group, allergies });

    // Update user table fields (phone, full_name)
    const userUpdates = {};
    if (phone) userUpdates.phone = phone;
    if (req.body.full_name) userUpdates.full_name = req.body.full_name;
    if (Object.keys(userUpdates).length > 0) {
      await User.update(patient.user_id, userUpdates);
    }

    const updated = await Patient.findByUserId(req.user.id);
    res.json({ success: true, message: 'Profile updated successfully.', data: updated });
  } catch (error) { next(error); }
};
