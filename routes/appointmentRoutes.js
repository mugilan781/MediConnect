// ============================================================
// MediConnect – routes/appointmentRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate, authorize, authenticateOrDemo, authenticateOrDemoAny } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.post('/',             authenticate, authorize('patient'),                       validate(schemas.createAppointment), appointmentController.create);
router.get('/',              authenticateOrDemoAny,                                      appointmentController.getAll);
router.get('/upcoming',      authenticateOrDemoAny,                                      appointmentController.getUpcoming);
router.get('/:id',           authenticate,                                              appointmentController.getById);
router.put('/:id',           authenticate, authorize('patient', 'doctor', 'admin'),     validate(schemas.rescheduleAppointment), appointmentController.reschedule);
router.put('/:id/reschedule',  authenticate, authorize('patient', 'doctor', 'admin'),     validate(schemas.rescheduleAppointment), appointmentController.reschedule);
router.patch('/:id/status',  authenticate, authorize('doctor', 'admin'),                validate(schemas.updateAppointmentStatus), appointmentController.updateStatus);
router.put('/:id/status',    authenticate, authorize('doctor', 'admin'),                validate(schemas.updateAppointmentStatus), appointmentController.updateStatus);
router.delete('/:id',        authenticate, authorize('patient', 'doctor', 'admin'),               appointmentController.delete);
router.put('/:id/cancel',    authenticate, authorize('patient', 'doctor', 'admin'),               appointmentController.delete);

module.exports = router;
