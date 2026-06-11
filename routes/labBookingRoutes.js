// ============================================================
// MediConnect – routes/labBookingRoutes.js
// REST endpoint mappings for patient and admin lab bookings
// ============================================================

const express = require('express');
const router = express.Router();
const labBookingController = require('../controllers/labBookingController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { uploadReport } = require('../middleware/upload');

// Create lab booking or check list
router.post('/',             authenticate, authorize('patient', 'doctor', 'admin'), validate(schemas.createLabBooking), labBookingController.create);
router.get('/',              authenticate,                                                                               labBookingController.getAll);

// Detail and General updates
router.get('/:id',           authenticate,                                                                               labBookingController.getById);
router.put('/:id',           authenticate, authorize('admin', 'doctor'),                                                 labBookingController.update);

// Status and Cancellations
router.put('/:id/status',    authenticate, authorize('admin', 'doctor'),          validate(schemas.updateLabBookingStatus), labBookingController.updateStatus);
router.patch('/:id/status',  authenticate, authorize('admin', 'doctor'),          validate(schemas.updateLabBookingStatus), labBookingController.updateStatus); // compat link
router.put('/:id/cancel',    authenticate, authorize('patient', 'doctor', 'admin'),                                      labBookingController.cancel);

// Result upload
router.put('/:id/result',    authenticate, authorize('admin'),                    uploadReport.single('result_file'),         labBookingController.updateResult);

module.exports = router;
