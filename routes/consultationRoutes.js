// ============================================================
// MediConnect – routes/consultationRoutes.js
// Endpoint mappings for consultations and requests workflow
// ============================================================

const express = require('express');
const router = express.Router();
const consultationController = require('../controllers/consultationController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

// Create consultation request (Patient) or check list (All)
router.post('/',                          authenticate, authorize('patient'),                  validate(schemas.createConsultationRequest), consultationController.create);
router.get('/',                           authenticate,                                                                                     consultationController.getAll);

// Legacy lookup by appointment
router.get('/appointment/:appointmentId', authenticate,                                                                                     consultationController.getByAppointment);

// Consultation lifecycle actions (Doctor / Admin / Patient)
router.put('/:id/accept',                 authenticate, authorize('doctor', 'admin'),                                                       consultationController.accept);
router.put('/:id/reject',                 authenticate, authorize('doctor', 'admin'),          validate(schemas.rejectConsultationRequest), consultationController.reject);
router.put('/:id/schedule',               authenticate, authorize('doctor', 'admin'),          validate(schemas.scheduleConsultation),     consultationController.schedule);
router.put('/:id/start',                  authenticate, authorize('doctor', 'admin'),                                                       consultationController.start);
router.put('/:id/complete',               authenticate, authorize('doctor', 'admin'),          validate(schemas.addConsultationNotes),     consultationController.complete);
router.post('/:id/notes',                 authenticate, authorize('doctor', 'admin'),          validate(schemas.addConsultationNotes),     consultationController.addNotes);
router.put('/:id/cancel',                 authenticate, authorize('patient', 'doctor', 'admin'),                                            consultationController.cancel);

// Details Lookup & General Override updates
router.get('/:id',                        authenticate,                                                                                     consultationController.getById);
router.put('/:id',                        authenticate, authorize('doctor', 'admin'),                                                       consultationController.cancel);

module.exports = router;
