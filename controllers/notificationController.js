// ============================================================
// MediConnect – controllers/notificationController.js
// REST controllers for in-app notifications and preferences
// ============================================================

const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const pool = require('../config/db');

// 1. GET /api/notifications
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, search } = req.query;
    const result = await Notification.searchAndFilter(req.user.id, { page, limit, type, search });
    
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

// 2. GET /api/notifications/:id
exports.getById = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM notifications WHERE id = ?`, [req.params.id]);
    const notif = rows[0];
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found.' });

    // Ownership check
    if (req.user.role !== 'admin' && notif.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not own this notification.' });
    }

    res.json({ success: true, data: notif });
  } catch (error) { next(error); }
};

// 3. POST /api/notifications
exports.create = async (req, res, next) => {
  try {
    const { user_id, type, title, message, link, related_module, related_record_id } = req.body;

    // Security check: Patients & Doctors can only create notifications for themselves. Admins can create for anyone.
    const targetUserId = parseInt(user_id, 10);
    if (req.user.role !== 'admin' && targetUserId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. You can only create notifications for yourself.' });
    }

    await Notification.create({
      user_id: targetUserId,
      type: type || 'system',
      title,
      message,
      link,
      related_module,
      related_record_id
    });

    res.status(201).json({ success: true, message: 'Notification created successfully.' });
  } catch (error) { next(error); }
};

// 4. PUT /api/notifications/:id/read & PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res, next) => {
  try {
    const result = await Notification.markAsReadForUser(req.params.id, req.user.id);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Notification not found.' });
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) { next(error); }
};

// 5. PUT /api/notifications/read-all & PATCH /api/notifications/read-all
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.markAllAsRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) { next(error); }
};

// 6. GET /api/notifications/search
exports.search = async (req, res, next) => {
  try {
    const { query, type, page = 1, limit = 20 } = req.query;
    const result = await Notification.searchAndFilter(req.user.id, { page, limit, type, search: query });
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

// 7. GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);
    res.json({ success: true, data: { count } });
  } catch (error) { next(error); }
};

// 8. GET /api/notifications/preferences
exports.getPreferences = async (req, res, next) => {
  try {
    const prefs = await NotificationPreference.findByUserId(req.user.id);
    res.json({ success: true, data: prefs });
  } catch (error) { next(error); }
};

// 9. PUT /api/notifications/preferences
exports.updatePreferences = async (req, res, next) => {
  try {
    await NotificationPreference.update(req.user.id, req.body);
    const updated = await NotificationPreference.findByUserId(req.user.id);
    res.json({ success: true, message: 'Notification preferences updated.', data: updated });
  } catch (error) { next(error); }
};

// 10. DELETE /api/notifications/:id
exports.delete = async (req, res, next) => {
  try {
    const result = await Notification.deleteForUser(req.params.id, req.user.id);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Notification not found.' });
    res.json({ success: true, message: 'Notification deleted.' });
  } catch (error) { next(error); }
};
