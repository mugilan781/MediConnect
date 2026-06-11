// ============================================================
// MediConnect – routes/adminRoutes.js
// Platform administrative routes
// ============================================================

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

// Ensure all subroutes are administrative
router.use(authenticate, authorize('admin'));

// --- Overview ---
router.get('/dashboard', adminController.getDashboard);

// --- User Core Controls ---
router.get('/users',             adminController.getAllUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.patch('/users/:id/role',  validate(schemas.updateUserRole), adminController.updateUserRole);

// --- Settings Management ---
router.get('/settings',          adminController.getSettings);
router.put('/settings/:key',     adminController.updateSetting);

// --- Patients Management (Section 2) ---
router.get('/patients',          adminController.getPatients);
router.get('/patients/:id',      adminController.getPatientById);
router.put('/patients/:id',      adminController.updatePatient);
router.delete('/patients/:id',   adminController.deletePatient);

// --- Doctors Management (Section 3) ---
router.get('/doctors',          adminController.getDoctors);
router.post('/doctors',         adminController.createDoctor);
router.get('/doctors/:id/schedule', adminController.getDoctorSchedule);
router.get('/doctors/:id/slots',     adminController.getDoctorSlots);
router.get('/doctors/:id/leaves',    adminController.getDoctorLeaves);
router.put('/doctors/:id',      adminController.updateDoctor);
router.delete('/doctors/:id',   adminController.deleteDoctor);

// --- Notifications Management (Section 9) ---
router.post('/notifications/send',      adminController.sendCustomNotification);
router.post('/notifications/broadcast', adminController.broadcastNotification);
router.post('/notifications',           adminController.createNotification);
router.get('/notifications',            adminController.getNotificationsHistory);

// --- Analytics (Section 10) ---
router.get('/analytics',        adminController.getAnalytics);

module.exports = router;
