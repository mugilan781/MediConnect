// ============================================================
// MediConnect – routes/sampleCollectionRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const sampleCollectionController = require('../controllers/sampleCollectionController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.post('/',            authenticate, authorize('patient'), validate(schemas.createSampleCollection), sampleCollectionController.create);
router.get('/',             authenticate,                       sampleCollectionController.getAll);
router.get('/:id',          authenticate,                       sampleCollectionController.getById);
router.put('/:id',          authenticate,                       sampleCollectionController.update);
router.put('/:id/assign',   authenticate, authorize('admin'),   validate(schemas.assignSampleCollection),     sampleCollectionController.assignCollector);
router.put('/:id/status',   authenticate, authorize('admin'),   validate(schemas.updateSampleCollectionStatus), sampleCollectionController.updateStatus);
router.put('/:id/cancel',   authenticate,                       sampleCollectionController.cancel);

module.exports = router;

