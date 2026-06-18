// ============================================================
// MediConnect – routes/adminRoutes.js
// Platform administrative routes
// Demo mode: GET (read-only) routes use authenticateOrDemo
// Write routes remain fully protected
// ============================================================

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize, authenticateOrDemo } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

// --- READ-ONLY routes (demo-accessible) ---
router.get('/dashboard',         authenticateOrDemo('admin'), adminController.getDashboard);
router.get('/users',             authenticateOrDemo('admin'), adminController.getAllUsers);
router.get('/settings',          authenticateOrDemo('admin'), adminController.getSettings);
router.get('/patients',          authenticateOrDemo('admin'), adminController.getPatients);
router.get('/patients/:id',      authenticateOrDemo('admin'), adminController.getPatientById);
router.get('/doctors',           authenticateOrDemo('admin'), adminController.getDoctors);
router.get('/doctors/:id/schedule', authenticateOrDemo('admin'), adminController.getDoctorSchedule);
router.get('/doctors/:id/slots',    authenticateOrDemo('admin'), adminController.getDoctorSlots);
router.get('/doctors/:id/leaves',   authenticateOrDemo('admin'), adminController.getDoctorLeaves);
router.get('/notifications',     authenticateOrDemo('admin'), adminController.getNotificationsHistory);
router.get('/analytics',         authenticateOrDemo('admin'), adminController.getAnalytics);

// --- WRITE routes (require real authentication) ---
router.patch('/users/:id/status', authenticate, authorize('admin'), adminController.updateUserStatus);
router.patch('/users/:id/role',   authenticate, authorize('admin'), validate(schemas.updateUserRole), adminController.updateUserRole);
router.put('/settings/:key',      authenticate, authorize('admin'), adminController.updateSetting);
router.put('/patients/:id',       authenticate, authorize('admin'), adminController.updatePatient);
router.delete('/patients/:id',    authenticate, authorize('admin'), adminController.deletePatient);
router.post('/doctors',           authenticate, authorize('admin'), adminController.createDoctor);
router.put('/doctors/:id',        authenticate, authorize('admin'), adminController.updateDoctor);
router.delete('/doctors/:id',     authenticate, authorize('admin'), adminController.deleteDoctor);
router.post('/notifications/send',      authenticate, authorize('admin'), adminController.sendCustomNotification);
router.post('/notifications/broadcast', authenticate, authorize('admin'), adminController.broadcastNotification);
router.post('/notifications',           authenticate, authorize('admin'), adminController.createNotification);

module.exports = router;
