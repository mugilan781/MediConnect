// ============================================================
// MediConnect – routes/doctorRoutes.js
// Doctor management, schedules, slots, and leaves
// ============================================================

const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticate, authorize, authenticateOrDemo } = require('../middleware/auth');

// --- Public Endpoints ---
router.get('/', doctorController.getAll);

// --- Doctor-Scoped Profile, Schedules, Leaves & Associated Patients (Must come before /:id) ---
// GET routes use authenticateOrDemo so demo users can view data
router.get('/me/schedule',    authenticateOrDemo('doctor'), doctorController.getMySchedule);
router.put('/me/schedule',    authenticate, authorize('doctor'), doctorController.updateMySchedule);

router.get('/me/slots',       authenticateOrDemo('doctor'), doctorController.getMySlots);
router.post('/me/slots',      authenticate, authorize('doctor'), doctorController.createMySlot);
router.put('/me/slots/:id',   authenticate, authorize('doctor'), doctorController.updateMySlot);
router.delete('/me/slots/:id',authenticate, authorize('doctor'), doctorController.deleteMySlot);

router.get('/me/leaves',      authenticateOrDemo('doctor'), doctorController.getMyLeaves);
router.post('/me/leaves',     authenticate, authorize('doctor'), doctorController.createMyLeave);
router.delete('/me/leaves/:id',authenticate, authorize('doctor'), doctorController.deleteMyLeave);

// Doctor-authorized access to associated patient records (read-only demo-aware)
router.get('/me/patients/:id',               authenticateOrDemo('doctor'), doctorController.getPatientProfile);
router.get('/me/patients/:id/history',       authenticateOrDemo('doctor'), doctorController.getPatientHistory);
router.get('/me/patients/:id/reports',       authenticateOrDemo('doctor'), doctorController.getPatientReports);
router.get('/me/patients/:id/lab-tests',     authenticateOrDemo('doctor'), doctorController.getPatientLabTests);
router.get('/me/patients/:id/appointments',  authenticateOrDemo('doctor'), doctorController.getPatientAppointments);
router.get('/me/patients/:id/consultations', authenticateOrDemo('doctor'), doctorController.getPatientConsultations);

// --- Public / General Endpoints ---
router.get('/:id',              doctorController.getById);
router.put('/:id',              authenticate, authorize('doctor', 'admin'), doctorController.update);
router.get('/:id/slots',        authenticate,                              doctorController.getAvailableSlots);
router.put('/:id/availability', authenticate, authorize('doctor', 'admin'), doctorController.updateAvailability);
router.delete('/:id',           authenticate, authorize('admin'),          doctorController.deactivate);
router.get('/:id/summary',      authenticate, authorize('doctor'),          doctorController.getSummary);

module.exports = router;
