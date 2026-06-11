// ============================================================
// MediConnect – routes/notificationRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.get('/',             authenticate, notificationController.getAll);
router.get('/unread-count', authenticate, notificationController.getUnreadCount);
router.get('/search',       authenticate, notificationController.search);
router.get('/preferences',  authenticate, notificationController.getPreferences);
router.put('/preferences',  authenticate, notificationController.updatePreferences);
router.post('/',            authenticate, notificationController.create);

router.patch('/read-all',   authenticate, notificationController.markAllAsRead);
router.put('/read-all',     authenticate, notificationController.markAllAsRead);
router.post('/read-all',    authenticate, notificationController.markAllAsRead);

router.patch('/:id/read',   authenticate, notificationController.markAsRead);
router.put('/:id/read',     authenticate, notificationController.markAsRead);
router.post('/:id/read',    authenticate, notificationController.markAsRead);

router.get('/:id',          authenticate, notificationController.getById);
router.delete('/:id',       authenticate, notificationController.delete);

module.exports = router;
