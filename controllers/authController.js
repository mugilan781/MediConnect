const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const env = require('../config/env');
const pool = require('../config/db');
const { sendPasswordReset } = require('../services/emailService');
const notificationService = require('../services/notificationService');

/**
 * Generate JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

/**
 * POST /api/v1/auth/register/patient
 * Patient-specific registration
 */
exports.registerPatient = async (req, res, next) => {
  try {
    const { email, password, full_name, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user with patient role
    const result = await User.create({ email, password_hash, role: 'patient', full_name, phone });
    const userId = result.insertId;

    // Create patient profile
    await Patient.create({ user_id: userId });

    // Trigger registration notification to admins
    notificationService.notifyAdminRegistration({ role: 'patient', fullName: full_name })
      .catch(err => console.error('Registration notification failed:', err.message));

    // Update last login
    await User.updateLastLogin(userId);

    // Generate token
    const user = await User.findById(userId);
    const token = generateToken(user);

    // Fetch patient profile
    const profile = await Patient.findByUserId(userId);

    res.status(201).json({
      success: true,
      message: 'Patient account created successfully.',
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/register/doctor
 * Doctor-specific registration with full doctor profile fields
 */
exports.registerDoctor = async (req, res, next) => {
  try {
    const {
      email, password, full_name, phone,
      specialization, qualification, experience_years,
      license_number, consultation_fee,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Check if license number is already in use
    if (license_number) {
      const [existingLicense] = await pool.execute(
        'SELECT id FROM doctors WHERE license_number = ?', [license_number]
      );
      if (existingLicense.length > 0) {
        return res.status(409).json({ success: false, message: 'A doctor with this license number already exists.' });
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user with doctor role
    const result = await User.create({ email, password_hash, role: 'doctor', full_name, phone });
    const userId = result.insertId;

    // Create doctor profile with all fields
    await Doctor.create({
      user_id: userId,
      specialization,
      qualification,
      experience_years: experience_years || 0,
      license_number,
      consultation_fee: consultation_fee || 0,
    });

    // Trigger registration notification to admins
    notificationService.notifyAdminRegistration({ role: 'doctor', fullName: full_name })
      .catch(err => console.error('Registration notification failed:', err.message));

    // Update last login
    await User.updateLastLogin(userId);

    // Generate token
    const user = await User.findById(userId);
    const token = generateToken(user);

    // Fetch doctor profile
    const profile = await Doctor.findByUserId(userId);

    res.status(201).json({
      success: true,
      message: 'Doctor account created successfully.',
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/register
 * Generic registration (backward compatibility)
 */
exports.register = async (req, res, next) => {
  try {
    const { email, password, role, full_name, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const result = await User.create({ email, password_hash, role: role || 'patient', full_name, phone });
    const userId = result.insertId;

    // Create role-specific profile
    if (role === 'doctor') {
      await Doctor.create({
        user_id: userId,
        specialization: req.body.specialization || 'General',
        qualification: req.body.qualification || 'MBBS',
      });
    } else {
      await Patient.create({ user_id: userId });
    }

    // Trigger registration notification to admins
    notificationService.notifyAdminRegistration({ role: role || 'patient', fullName: full_name })
      .catch(err => console.error('Registration notification failed:', err.message));

    // Generate token
    const user = await User.findById(userId);
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { token, user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name } },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    await User.updateLastLogin(user.id);
    const token = generateToken(user);

    // Fetch role-specific profile
    let profile = null;
    if (user.role === 'patient') profile = await Patient.findByUserId(user.id);
    else if (user.role === 'doctor') profile = await Doctor.findByUserId(user.id);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 */
exports.logout = async (req, res) => {
  // JWT is stateless — client clears the token
  res.json({ success: true, message: 'Logged out successfully.' });
};

/**
 * GET /api/v1/auth/me
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Attach role-specific profile
    let profile = null;
    if (user.role === 'patient') profile = await Patient.findByUserId(user.id);
    else if (user.role === 'doctor') profile = await Doctor.findByUserId(user.id);

    res.json({ success: true, data: { user, profile } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/auth/me
 */
exports.updateMe = async (req, res, next) => {
  try {
    await User.update(req.user.id, req.body);
    const user = await User.findById(req.user.id);
    res.json({ success: true, message: 'Profile updated.', data: { user } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findByEmail(email);

    // Always return success to prevent email enumeration
    res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });

    if (!user) return;

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Invalidate previous tokens for this user
    await pool.execute(`UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0`, [user.id]);

    // Store new token
    await pool.execute(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
      [user.id, resetToken, expiresAt]
    );

    // Send email (non-blocking — don't await)
    sendPasswordReset({
      to: user.email,
      name: user.full_name,
      resetLink: `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`,
    }).catch(err => console.error('❌ Reset email failed:', err.message));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/reset-password
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Find valid token
    const [rows] = await pool.execute(
      `SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > NOW()`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
    }

    const resetRecord = rows[0];

    // Hash new password and update user
    const password_hash = await bcrypt.hash(new_password, 12);
    await User.updatePassword(resetRecord.user_id, password_hash);

    // Mark token as used
    await pool.execute(`UPDATE password_reset_tokens SET used = 1 WHERE id = ?`, [resetRecord.id]);

    res.json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};
