// ============================================================
// MediConnect – routes/reportRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadReport } = require('../middleware/upload');

router.post('/',              authenticate, authorize('doctor', 'admin'), uploadReport.single('file'), reportController.create);
router.get('/',               authenticate,                               reportController.getAll);

// Categories management (must come before /:id)
router.get('/categories',      authenticate,                               reportController.getCategories);
router.post('/categories',     authenticate, authorize('admin'),           reportController.createCategory);
router.put('/categories/:id',    authenticate, authorize('admin'),           reportController.updateCategory);
router.delete('/categories/:id', authenticate, authorize('admin'),           reportController.deleteCategory);

// HIPAA Audit logs (must come before /:id)
router.get('/logs',            authenticate, authorize('admin'),           reportController.getAuditLogs);

router.get('/:id',            authenticate,                               reportController.getById);
router.get('/:id/download',   authenticate,                               reportController.download);
router.delete('/:id',         authenticate, authorize('doctor', 'admin'),           reportController.delete);
router.put('/:id',            authenticate, authorize('doctor', 'admin'),           reportController.update);
router.patch('/:id/share',    authenticate, authorize('doctor', 'admin'), reportController.toggleShare);

module.exports = router;
