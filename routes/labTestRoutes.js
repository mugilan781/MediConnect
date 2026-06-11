// ============================================================
// MediConnect – routes/labTestRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const labTestController = require('../controllers/labTestController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.get('/',           authenticate,                    labTestController.getAll);
router.get('/categories', authenticate,                    labTestController.getCategories);
router.get('/:id',        authenticate,                    labTestController.getById);
router.post('/',          authenticate, authorize('admin'), validate(schemas.createLabTest), labTestController.create);
router.put('/:id',        authenticate, authorize('admin'), labTestController.update);
router.delete('/:id',     authenticate, authorize('admin'), labTestController.deactivate);

module.exports = router;
