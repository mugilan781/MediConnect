// ============================================================
// MediConnect – routes/dashboardRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateOrDemo } = require('../middleware/auth');

router.get('/patient', authenticateOrDemo('patient'), dashboardController.getPatientDashboard);
router.get('/doctor',  authenticateOrDemo('doctor'),  dashboardController.getDoctorDashboard);
router.get('/admin',   authenticateOrDemo('admin'),   dashboardController.getAdminDashboard);

module.exports = router;
