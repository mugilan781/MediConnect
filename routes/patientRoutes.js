// ============================================================
// MediConnect – routes/patientRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize, authenticateOrDemo } = require('../middleware/auth');

// Patient self-service profile (must come before /:id to avoid route collision)
router.get('/profile',    authenticateOrDemo('patient'),                               patientController.getProfile);
router.put('/profile',    authenticate, authorize('patient'),                    patientController.updateProfile);

router.get('/',           authenticate, authorize('doctor', 'admin'),                    patientController.getAll);
router.get('/:id',        authenticate, authorize('patient', 'doctor', 'admin'), patientController.getById);
router.put('/:id',        authenticate, authorize('patient', 'admin'),          patientController.update);
router.delete('/:id',     authenticate, authorize('admin'),                    patientController.deactivate);
router.get('/:id/summary', authenticate, authorize('patient'),                  patientController.getSummary);

module.exports = router;
