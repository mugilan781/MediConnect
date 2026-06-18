// ============================================================
// MediConnect – routes/historyRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { authenticate, authorize, authenticateOrDemo } = require('../middleware/auth');

router.get('/',                  authenticateOrDemo('patient'), historyController.getAll);
router.get('/search',            authenticateOrDemo('patient'), historyController.search);
router.get('/timeline',          authenticateOrDemo('patient'), historyController.getTimeline);
router.get('/patient/:patientId', authenticate, historyController.getByPatient);
router.post('/',                  authenticate, authorize('doctor', 'admin'), historyController.create);
router.get('/:id',                authenticate, historyController.getById);

module.exports = router;
