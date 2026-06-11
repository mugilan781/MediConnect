// ============================================================
// MediConnect – routes/authRoutes.js
// ============================================================

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

// Rate limiters
const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevOrTest ? 1000 : 10,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevOrTest ? 1000 : 5,
  message: { success: false, message: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevOrTest ? 1000 : 3,
  message: { success: false, message: 'Too many password reset requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Registration ---
router.post('/register',         registerLimiter, validate(schemas.register),        authController.register);
router.post('/register/patient', registerLimiter, validate(schemas.registerPatient), authController.registerPatient);
router.post('/register/doctor',  registerLimiter, validate(schemas.registerDoctor),  authController.registerDoctor);

// --- Login / Logout ---
router.post('/login',  loginLimiter, validate(schemas.login), authController.login);
router.post('/logout', authenticate, authController.logout);

// --- Current User ---
router.get('/me',  authenticate, authController.getMe);
router.put('/me',  authenticate, authController.updateMe);

// --- Password Recovery ---
router.post('/forgot-password', resetLimiter, validate(schemas.forgotPassword), authController.forgotPassword);
router.post('/reset-password',  resetLimiter, validate(schemas.resetPassword),  authController.resetPassword);

module.exports = router;
