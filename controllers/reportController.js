// ============================================================
// MediConnect – controllers/reportController.js
// Medical report upload/view/download with logging and security
// ============================================================

const MedicalReport = require('../models/MedicalReport');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const pool = require('../config/db');
const notificationService = require('../services/notificationService');
const historyGenerator = require('../services/historyGenerator');
const path = require('path');
const fs = require('fs');

/**
 * Access Control Helper
 */
async function verifyReportAccess(report, user) {
  if (user.role === 'admin') return true;

  if (user.role === 'patient') {
    const patient = await Patient.findByUserId(user.id);
    if (!patient) return false;
    return report.patient_id === patient.id && report.is_shared_with_patient === 1;
  }

  if (user.role === 'doctor') {
    const doc = await Doctor.findByUserId(user.id);
    if (!doc) return false;
    if (report.doctor_id === doc.id) return true;

    // Check if patient has any appointment or consultation with this doctor
    const [appts] = await pool.execute(
      `SELECT id FROM appointments WHERE patient_id = ? AND doctor_id = ?`,
      [report.patient_id, doc.id]
    );
    if (appts.length > 0) return true;

    const [consults] = await pool.execute(
      `SELECT id FROM consultations WHERE patient_id = ? AND doctor_id = ?`,
      [report.patient_id, doc.id]
    );
    if (consults.length > 0) return true;

    return false;
  }

  return false;
}

exports.create = async (req, res, next) => {
  try {
    const file_url = req.file ? `/uploads/reports/${req.file.filename}` : req.body.file_url;
    if (!file_url) return res.status(400).json({ success: false, message: 'File is required.' });

    const file_type = req.file ? path.extname(req.file.originalname).slice(1) : req.body.file_type;
    const original_filename = req.file ? req.file.originalname : req.body.original_filename;
    const file_size = req.file ? req.file.size : req.body.file_size;

    // Validate patient exists
    const patient = await Patient.findById(req.body.patient_id);
    if (!patient) {
      // Cleanup uploaded file on error
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Patient profile not found.' });
    }

    // Auto-resolve doctor_id
    let doctor_id = req.body.doctor_id || null;
    if (req.user.role === 'doctor' && !doctor_id) {
      const doc = await Doctor.findByUserId(req.user.id);
      if (doc) doctor_id = doc.id;
    }

    const result = await MedicalReport.create({ 
      ...req.body, 
      file_url, 
      file_type, 
      original_filename, 
      file_size, 
      doctor_id 
    });

    const report = await MedicalReport.findById(result.insertId);

    // Record activity log
    await MedicalReport.logActivity({
      report_id: result.insertId,
      user_id: req.user.id,
      activity_type: 'upload',
      ip_address: req.ip
    });

    // Log to patient history
    await historyGenerator.logReportEvent(result.insertId, 'Report Uploaded', req.user.id);

    // Notify patient
    const [patUser] = await pool.execute(`SELECT user_id FROM patients WHERE id = ?`, [req.body.patient_id]);
    if (patUser[0]) {
      notificationService.notifyReportUploaded({
        patientUserId: patUser[0].user_id,
        title: report.title || req.body.title,
        reportId: result.insertId
      }).catch(err => console.error(err));
    }

    res.status(201).json({ success: true, message: 'Medical report uploaded successfully.', data: report });
  } catch (error) { 
    // Cleanup file
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    next(error); 
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    if (req.user.role === 'patient') {
      const patient = await Patient.findByUserId(req.user.id);
      filters.patient_id = patient?.id;
      filters.is_shared_with_patient = 1;
    } else if (req.user.role === 'doctor') {
      const doc = await Doctor.findByUserId(req.user.id);
      filters.doctor_id_or_cared_patients_for = doc?.id;
    }
    const result = await MedicalReport.findAll(filters);
    res.json({ 
      success: true, 
      data: result.data, 
      pagination: { 
        page: result.page, 
        limit: result.limit, 
        total: result.total, 
        totalPages: result.totalPages 
      } 
    });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const report = await MedicalReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    // Access authorization check
    const hasAccess = await verifyReportAccess(report, req.user);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied. You do not have permission to view this report.' });
    }

    // Record view log
    await MedicalReport.logActivity({
      report_id: report.id,
      user_id: req.user.id,
      activity_type: 'view',
      ip_address: req.ip
    });

    res.json({ success: true, data: report });
  } catch (error) { next(error); }
};

exports.download = async (req, res, next) => {
  try {
    const report = await MedicalReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    // Access authorization check
    const hasAccess = await verifyReportAccess(report, req.user);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied. You do not have permission to download this report.' });
    }

    const filePath = path.join(__dirname, '..', report.file_url);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Physical report file not found on disk.' });
    }

    // Record download log
    await MedicalReport.logActivity({
      report_id: report.id,
      user_id: req.user.id,
      activity_type: 'download',
      ip_address: req.ip
    });

    // Log to patient history
    await historyGenerator.logReportEvent(report.id, 'Report Downloaded', req.user.id);

    // Notify doctor if downloaded by patient
    if (req.user.role === 'patient' && report.doctor_id) {
      try {
        const [docUser] = await pool.execute(`SELECT user_id FROM doctors WHERE id = ?`, [report.doctor_id]);
        const [patUser] = await pool.execute(`SELECT full_name FROM users WHERE id = ?`, [req.user.id]);
        if (docUser[0] && patUser[0]) {
          notificationService.notifyDoctorReportDownloaded({
            doctorUserId: docUser[0].user_id,
            patientName: patUser[0].full_name,
            title: report.title,
            reportId: report.id
          }).catch(err => console.error(err));
        }
      } catch (err) {
        console.error('Failed to notify doctor of download:', err);
      }
    }

    res.download(filePath, report.original_filename || (report.title + '.' + (report.file_type || 'pdf')));
  } catch (error) { next(error); }
};

exports.delete = async (req, res, next) => {
  try {
    const report = await MedicalReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    // Permissions check
    if (req.user.role === 'doctor') {
      const doc = await Doctor.findByUserId(req.user.id);
      if (!doc || report.doctor_id !== doc.id) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only delete reports you uploaded.' });
      }
    }

    // Delete physically from disk if exists
    const filePath = path.join(__dirname, '..', report.file_url);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }

    // Record delete log
    await MedicalReport.logActivity({
      report_id: report.id,
      user_id: req.user.id,
      activity_type: 'delete',
      ip_address: req.ip
    });

    await MedicalReport.delete(req.params.id);
    res.json({ success: true, message: 'Medical report deleted successfully.' });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const report = await MedicalReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    // Permissions check
    if (req.user.role === 'doctor') {
      const doc = await Doctor.findByUserId(req.user.id);
      if (!doc || report.doctor_id !== doc.id) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only update reports you uploaded.' });
      }
    }

    await MedicalReport.update(req.params.id, req.body);
    const updated = await MedicalReport.findById(req.params.id);

    // Record edit log
    await MedicalReport.logActivity({
      report_id: report.id,
      user_id: req.user.id,
      activity_type: 'edit',
      ip_address: req.ip
    });

    // Notify patient of report update
    const [patUser] = await pool.execute(`SELECT user_id FROM patients WHERE id = ?`, [updated.patient_id]);
    if (patUser[0]) {
      notificationService.notifyReportUpdated({
        userId: patUser[0].user_id,
        title: updated.title,
        role: req.user.role,
        reportId: updated.id
      }).catch(err => console.error(err));
    }

    res.json({ success: true, message: 'Report updated successfully.', data: updated });
  } catch (error) { next(error); }
};

exports.toggleShare = async (req, res, next) => {
  try {
    const { is_shared } = req.body;
    await MedicalReport.toggleShare(req.params.id, is_shared ? 1 : 0);
    res.json({ success: true, message: is_shared ? 'Report shared with patient.' : 'Report hidden from patient.' });
  } catch (error) { next(error); }
};

// Report Categories Management (Admin only)
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await MedicalReport.Category.findAll();
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { category_name } = req.body;
    await MedicalReport.Category.create(category_name);
    res.status(201).json({ success: true, message: 'Category created successfully.' });
  } catch (error) { next(error); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    await MedicalReport.Category.update(req.params.id, req.body);
    res.json({ success: true, message: 'Category updated successfully.' });
  } catch (error) { next(error); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    await MedicalReport.Category.delete(req.params.id);
    res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (error) { next(error); }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ral.*, u.full_name AS user_name, u.role AS user_role, mr.title AS report_title, pu.full_name AS patient_name
       FROM report_activity_logs ral
       JOIN users u ON ral.user_id = u.id
       JOIN medical_reports mr ON ral.report_id = mr.id
       JOIN patients p ON mr.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       ORDER BY ral.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

