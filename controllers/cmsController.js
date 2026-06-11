// ============================================================
// MediConnect – controllers/cmsController.js
// Enterprise Website Content Management System (CMS) controller
// ============================================================

const CmsContent = require('../models/CmsContent');
const CmsPage = require('../models/CmsPage');
const CmsFaq = require('../models/CmsFaq');
const CmsSocialLink = require('../models/CmsSocialLink');
const CmsMedia = require('../models/CmsMedia');
const AdminSetting = require('../models/AdminSetting');
const PatientHistory = require('../models/PatientHistory');
const notificationService = require('../services/notificationService');
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

/**
 * Shared helper to log admin activity in patient_history (under dummy ID 999) and notifications
 */
async function logAdminActivity(adminUserId, eventType, description, metadata = {}) {
  try {
    // Log to patient_history
    await PatientHistory.create({
      patient_id: 999,
      event_type: eventType,
      source_module: 'cms',
      source_record_id: null,
      title: eventType,
      description,
      event_date: new Date(),
      recorded_by: adminUserId,
      metadata: {
        admin_user_id: adminUserId,
        ...metadata
      }
    });

    // Send notification
    await notificationService.notify({
      userId: adminUserId,
      type: 'system',
      title: eventType,
      message: description,
      link: '/admin-dashboard.html',
      related_module: 'cms'
    });
  } catch (err) {
    console.error('Error logging admin CMS activity:', err.message);
  }
}

// ============================================================
// 1. PUBLIC — Aggregated homepage data (Keep backward compat)
// ============================================================
exports.getHomepageData = async (req, res, next) => {
  try {
    const cmsSections = await CmsContent.findAllActive();
    const sections = {};
    for (const section of cmsSections) {
      sections[section.section_key] = section.section_data;
    }

    const [doctors] = await pool.execute(
      `SELECT d.id, d.specialization, d.qualification, d.experience_years,
              d.consultation_fee, d.bio, d.department, d.is_available,
              u.full_name, u.avatar_url, u.phone
       FROM doctors d
       JOIN users u ON d.user_id = u.id
       WHERE u.is_active = 1 AND d.is_available = 1
       ORDER BY d.experience_years DESC
       LIMIT 6`
    );

    const [labTests] = await pool.execute(
      `SELECT id, test_name, test_code, category, description, price,
              turnaround_hours
       FROM lab_tests
       WHERE is_active = 1
       ORDER BY price ASC
       LIMIT 8`
    );

    const [[userStats]] = await pool.execute(
      `SELECT
         COUNT(*) as total_users,
         COALESCE(SUM(role = 'patient'), 0) as total_patients,
         COALESCE(SUM(role = 'doctor'), 0) as total_doctors
       FROM users WHERE is_active = 1`
    );
    const [[appointmentStats]] = await pool.execute(`SELECT COUNT(*) as total_appointments FROM appointments`);
    const [[labTestStats]] = await pool.execute(`SELECT COUNT(*) as total_lab_tests FROM lab_tests WHERE is_active = 1`);
    const [[labBookingStats]] = await pool.execute(`SELECT COUNT(*) as total_lab_bookings FROM lab_bookings`);

    const statistics = {
      total_doctors: userStats.total_doctors,
      total_patients: userStats.total_patients,
      total_appointments: appointmentStats.total_appointments,
      total_lab_tests: labTestStats.total_lab_tests,
      total_lab_bookings: labBookingStats.total_lab_bookings,
    };

    const clinicSettings = await AdminSetting.findByGroup('clinic');
    const contactInfo = {};
    for (const setting of clinicSettings) {
      contactInfo[setting.setting_key] = setting.setting_value;
    }

    const page = await CmsPage.findBySlug('homepage');

    res.json({
      success: true,
      data: {
        page,
        sections,
        doctors,
        labTests,
        statistics,
        contactInfo,
      },
    });
  } catch (error) { next(error); }
};

// ============================================================
// 2. PAGES (CMS Pages CRUD & SEO)
// ============================================================

exports.getAllPages = async (req, res, next) => {
  try {
    const pages = await CmsPage.findAll();
    res.json({ success: true, data: pages });
  } catch (error) { next(error); }
};

exports.getPageBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const page = await CmsPage.findBySlug(slug);
    if (!page) {
      return res.status(404).json({ success: false, message: `Page '${slug}' not found.` });
    }

    // Retrieve all active sections to load page details dynamically
    const allSections = await CmsContent.findAllActive();
    const sections = {};
    for (const s of allSections) {
      sections[s.section_key] = s.section_data;
    }

    res.json({ success: true, data: { page, sections } });
  } catch (error) { next(error); }
};

exports.createPage = async (req, res, next) => {
  try {
    const { slug, title, meta_title, meta_description, meta_keywords, og_title, og_description, og_image, is_active } = req.body;
    if (!slug || !title) {
      return res.status(400).json({ success: false, message: 'Slug and title are required.' });
    }

    const result = await CmsPage.create({ slug, title, meta_title, meta_description, meta_keywords, og_title, og_description, og_image, is_active });
    await logAdminActivity(req.user.id, 'CMS Page Created', `CMS Page '${title}' (${slug}) was created.`, { slug, title });

    res.status(201).json({ success: true, message: 'Page created successfully.', data: { id: result.insertId } });
  } catch (error) { next(error); }
};

exports.updatePage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await CmsPage.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Page not found.' });
    }

    await CmsPage.update(id, req.body);
    await logAdminActivity(req.user.id, 'CMS Page Updated', `CMS Page '${existing.title}' was updated.`, { id, title: existing.title });

    const updated = await CmsPage.findById(id);
    res.json({ success: true, message: 'Page updated successfully.', data: updated });
  } catch (error) { next(error); }
};

exports.deletePage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await CmsPage.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Page not found.' });
    }

    await CmsPage.delete(id);
    await logAdminActivity(req.user.id, 'CMS Page Deleted', `CMS Page '${existing.title}' was deleted.`, { id, title: existing.title });

    res.json({ success: true, message: 'Page deleted successfully.' });
  } catch (error) { next(error); }
};

// ============================================================
// 3. SECTIONS (Layout Sections CRUD)
// ============================================================

exports.getAllSections = async (req, res, next) => {
  try {
    const sections = await CmsContent.findAll();
    res.json({ success: true, data: sections });
  } catch (error) { next(error); }
};

exports.getSection = async (req, res, next) => {
  try {
    const { key } = req.params;
    const section = await CmsContent.findByKey(key);
    if (!section) {
      return res.status(404).json({ success: false, message: `CMS section '${key}' not found.` });
    }
    res.json({ success: true, data: section });
  } catch (error) { next(error); }
};

exports.createSection = async (req, res, next) => {
  try {
    const { section_key, section_data } = req.body;
    if (!section_key || !section_data) {
      return res.status(400).json({ success: false, message: 'section_key and section_data are required.' });
    }

    const result = await CmsContent.upsert({ section_key, section_data, updated_by: req.user.id });
    await logAdminActivity(req.user.id, 'CMS Section Created', `CMS section '${section_key}' was created.`, { section_key });

    res.status(201).json({ success: true, message: 'Section created successfully.', data: { id: result.insertId } });
  } catch (error) { next(error); }
};

exports.updateSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { section_data, is_active } = req.body;
    if (section_data === undefined && is_active === undefined) {
      return res.status(400).json({ success: false, message: 'Updated fields required.' });
    }

    // Support both ID and section_key fallbacks
    const isId = !isNaN(parseInt(id, 10));
    let query = `UPDATE cms_content SET updated_by = ?`;
    const params = [req.user.id];

    if (section_data !== undefined) {
      const dataStr = typeof section_data === 'string' ? section_data : JSON.stringify(section_data);
      query += `, section_data = ?`;
      params.push(dataStr);
    }
    if (is_active !== undefined) {
      query += `, is_active = ?`;
      params.push(is_active ? 1 : 0);
    }

    if (isId) {
      query += ` WHERE id = ?`;
      params.push(parseInt(id, 10));
    } else {
      query += ` WHERE section_key = ?`;
      params.push(id);
    }

    const [result] = await pool.execute(query, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Section not found.' });
    }

    // Resolve update details for activity logs
    let updatedSection;
    if (isId) {
      const [rows] = await pool.execute(`SELECT * FROM cms_content WHERE id = ?`, [id]);
      updatedSection = rows[0];
    } else {
      updatedSection = await CmsContent.findByKey(id);
    }

    await logAdminActivity(req.user.id, 'CMS Section Updated', `CMS section '${updatedSection.section_key}' was updated.`, { section_key: updatedSection.section_key });

    res.json({ success: true, message: 'Section updated successfully.', data: updatedSection });
  } catch (error) { next(error); }
};

exports.deleteSection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isId = !isNaN(parseInt(id, 10));

    let keyName = id;
    if (isId) {
      const [rows] = await pool.execute(`SELECT section_key FROM cms_content WHERE id = ?`, [id]);
      if (rows[0]) keyName = rows[0].section_key;
    }

    const query = isId ? `DELETE FROM cms_content WHERE id = ?` : `DELETE FROM cms_content WHERE section_key = ?`;
    const [result] = await pool.execute(query, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Section not found.' });
    }

    await logAdminActivity(req.user.id, 'CMS Section Deleted', `CMS section '${keyName}' was deleted.`, { section_key: keyName });
    res.json({ success: true, message: 'Section deleted successfully.' });
  } catch (error) { next(error); }
};

// ============================================================
// 4. FAQ MODULE (FAQs CRUD)
// ============================================================

exports.getFaqs = async (req, res, next) => {
  try {
    const faqs = await CmsFaq.findAllActive();
    res.json({ success: true, data: faqs });
  } catch (error) { next(error); }
};

exports.getAllFaqs = async (req, res, next) => {
  try {
    const faqs = await CmsFaq.findAll();
    res.json({ success: true, data: faqs });
  } catch (error) { next(error); }
};

exports.createFaq = async (req, res, next) => {
  try {
    const { question, answer, display_order, is_active } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ success: false, message: 'Question and answer are required.' });
    }

    const result = await CmsFaq.create({ question, answer, display_order, is_active });
    await logAdminActivity(req.user.id, 'FAQ Created', 'New clinic FAQ added to help center.', { question });

    res.status(201).json({ success: true, message: 'FAQ created successfully.', data: { id: result.insertId } });
  } catch (error) { next(error); }
};

exports.updateFaq = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await CmsFaq.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'FAQ not found.' });
    }

    await CmsFaq.update(id, req.body);
    await logAdminActivity(req.user.id, 'FAQ Updated', 'FAQ item updated.', { id });

    const updated = await CmsFaq.findById(id);
    res.json({ success: true, message: 'FAQ updated successfully.', data: updated });
  } catch (error) { next(error); }
};

exports.deleteFaq = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await CmsFaq.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'FAQ not found.' });
    }

    await CmsFaq.delete(id);
    await logAdminActivity(req.user.id, 'FAQ Deleted', 'FAQ item deleted.', { id });

    res.json({ success: true, message: 'FAQ deleted successfully.' });
  } catch (error) { next(error); }
};

exports.reorderFaqs = async (req, res, next) => {
  try {
    const { order } = req.body; // Array of { id, display_order }
    if (!order || !Array.isArray(order)) {
      return res.status(400).json({ success: false, message: 'Invalid payload. Expecting { order: [...] } array.' });
    }

    await CmsFaq.updateOrder(order);
    await logAdminActivity(req.user.id, 'FAQs Reordered', 'Help center FAQs display order updated.');

    res.json({ success: true, message: 'FAQs reordered successfully.' });
  } catch (error) { next(error); }
};

// ============================================================
// 5. SOCIAL LINKS MODULE
// ============================================================

exports.getSocialLinks = async (req, res, next) => {
  try {
    const links = await CmsSocialLink.findAllActive();
    res.json({ success: true, data: links });
  } catch (error) { next(error); }
};

exports.getAllSocialLinks = async (req, res, next) => {
  try {
    const links = await CmsSocialLink.findAll();
    res.json({ success: true, data: links });
  } catch (error) { next(error); }
};

exports.updateSocialLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await CmsSocialLink.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Social platform link not found.' });
    }

    await CmsSocialLink.update(id, req.body);
    await logAdminActivity(req.user.id, 'Social Links Updated', `Link for ${existing.platform} updated.`, { platform: existing.platform });

    const updated = await CmsSocialLink.findById(id);
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
};

// ============================================================
// 6. SETTINGS MODULE (Admin settings maps)
// ============================================================

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await AdminSetting.findAll();
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const settings = req.body; // key-value map
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid payload.' });
    }

    for (const [key, val] of Object.entries(settings)) {
      const existing = await AdminSetting.findByKey(key);
      await AdminSetting.upsert({
        setting_key: key,
        setting_value: typeof val === 'object' ? JSON.stringify(val) : String(val),
        setting_group: existing ? existing.setting_group : 'general',
        description: existing ? existing.description : null,
        updated_by: req.user.id
      });
    }

    await logAdminActivity(req.user.id, 'CMS Settings Updated', 'Clinic settings and configurations updated.');
    res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (error) { next(error); }
};

// ============================================================
// 7. MEDIA LIBRARY (Upload & Management)
// ============================================================

exports.getMediaList = async (req, res, next) => {
  try {
    const mediaList = await CmsMedia.findAll();
    res.json({ success: true, data: mediaList });
  } catch (error) { next(error); }
};

exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded or invalid file format.' });
    }

    const filename = req.file.filename;
    const original_name = req.file.originalname;
    const mime_type = req.file.mimetype;
    const file_size = req.file.size;
    const file_path = `/uploads/cms/${filename}`;

    const result = await CmsMedia.create({
      filename,
      original_name,
      mime_type,
      file_size,
      file_path,
      uploaded_by: req.user.id
    });

    await logAdminActivity(req.user.id, 'CMS Media Uploaded', `CMS media asset '${original_name}' uploaded.`, { filename });

    const newMedia = await CmsMedia.findById(result.insertId);
    res.status(201).json({ success: true, message: 'Media uploaded successfully.', data: newMedia });
  } catch (error) { next(error); }
};

exports.deleteMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await CmsMedia.findById(id);
    if (!file) {
      return res.status(404).json({ success: false, message: 'Media asset not found.' });
    }

    // Unlink file from disk
    const diskPath = path.join(__dirname, '..', file.file_path);
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }

    await CmsMedia.delete(id);
    await logAdminActivity(req.user.id, 'CMS Media Deleted', `CMS media asset '${file.original_name}' was deleted.`, { id });

    res.json({ success: true, message: 'Media deleted successfully.' });
  } catch (error) { next(error); }
};
