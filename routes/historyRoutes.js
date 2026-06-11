// ============================================================
// MediConnect – routes/historyRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/',                  authenticate, historyController.getAll);
router.get('/search',            authenticate, historyController.search);
router.get('/timeline',          authenticate, historyController.getTimeline);
router.get('/patient/:patientId', authenticate, historyController.getByPatient);
router.post('/',                  authenticate, authorize('doctor', 'admin'), historyController.create);
router.get('/:id',                authenticate, historyController.getById);

module.exports = router;
