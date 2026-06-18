// ============================================================
// MediConnect – routes/labTestRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const labTestController = require('../controllers/labTestController');
const { authenticate, authorize, authenticateOrDemo } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.get('/',           authenticateOrDemo('patient'), labTestController.getAll);
router.get('/categories', authenticateOrDemo('patient'), labTestController.getCategories);
router.get('/:id',        authenticateOrDemo('patient'), labTestController.getById);
router.post('/',          authenticate, authorize('admin'), validate(schemas.createLabTest), labTestController.create);
router.put('/:id',        authenticate, authorize('admin'), labTestController.update);
router.delete('/:id',     authenticate, authorize('admin'), labTestController.deactivate);

module.exports = router;
