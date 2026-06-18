// ============================================================
// MediConnect – middleware/auth.js
// JWT verification, role-based access guard, and demo token support
// ============================================================

const jwt = require('jsonwebtoken');
const env = require('../config/env');

// ── Demo Token Map ──────────────────────────────────────────
// Static tokens that the frontend injects when in demo mode.
// These are NOT JWTs — they are simple string tokens recognized
// by the authenticate() middleware to inject the correct demo user.
const DEMO_TOKENS = {
  'demo-patient-token': 'patient',
  'demo-doctor-token': 'doctor',
  'demo-admin-token': 'admin',
};

/**
 * Verify JWT token from Authorization header.
 * Also recognizes demo tokens (demo-patient-token, demo-doctor-token, demo-admin-token).
 * Attaches decoded user data to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  // ── Check for demo tokens first ─────────────────────────
  const demoRole = DEMO_TOKENS[token];
  if (demoRole) {
    const DemoSeed = require('../services/demoSeed');
    return DemoSeed.getDemoUser(demoRole).then(demoUser => {
      if (!demoUser) {
        return res.status(401).json({
          success: false,
          message: 'Demo user not found. Please restart the server.',
        });
      }
      req.user = {
        id: demoUser.id,
        email: demoUser.email,
        role: demoUser.role,
      };
      req.isDemo = true;
      next();
    }).catch(() => {
      return res.status(401).json({
        success: false,
        message: 'Demo authentication failed.',
      });
    });
  }

  // ── Standard JWT verification ───────────────────────────
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Attach user payload to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    req.isDemo = false;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
}

/**
 * Role-based authorization middleware factory.
 * Usage: authorize('admin', 'doctor')
 * @param  {...string} roles - Allowed roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
    }

    next();
  };
}

/**
 * Demo-aware authentication middleware factory.
 * If a valid JWT or demo token exists, uses it. Otherwise falls back
 * to the demo user for the requested role.
 * Usage: authenticateOrDemo('patient')
 * @param {string} role - The demo role to fall back to
 */
function authenticateOrDemo(role) {
  const DemoSeed = require('../services/demoSeed');
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // If a real token or demo token is present, validate it
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      // Check demo token
      const demoRole = DEMO_TOKENS[token];
      if (demoRole) {
        try {
          const demoUser = await DemoSeed.getDemoUser(demoRole);
          if (demoUser) {
            req.user = { id: demoUser.id, email: demoUser.email, role: demoUser.role };
            req.isDemo = true;
            return next();
          }
        } catch (e) { /* fall through */ }
      }

      // Try JWT
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
        req.isDemo = false;

        if (decoded.role === role) {
          return next();
        }
        // If authenticated but wrong role, fall through to demo for that role
      } catch (e) {
        // Token invalid/expired — fall through to demo
      }
    }

    // No valid token or wrong role → inject demo user for the requested role
    try {
      const demoUser = await DemoSeed.getDemoUser(role);
      if (!demoUser) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      req.user = { id: demoUser.id, email: demoUser.email, role: demoUser.role };
      req.isDemo = true;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
  };
}

/**
 * Demo-aware authentication that accepts ANY role.
 * If a valid JWT or demo token exists, uses it. Otherwise reads X-Demo-Role header
 * (or query param demoRole) to decide which demo user to inject.
 * Falls back to 'patient' if no role hint is provided.
 */
function authenticateOrDemoAny(req, res, next) {
  const DemoSeed = require('../services/demoSeed');
  const authHeader = req.headers.authorization;

  // If a token is present, try to validate it
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    // Check demo token
    const demoRole = DEMO_TOKENS[token];
    if (demoRole) {
      return DemoSeed.getDemoUser(demoRole).then(demoUser => {
        if (demoUser) {
          req.user = { id: demoUser.id, email: demoUser.email, role: demoUser.role };
          req.isDemo = true;
          return next();
        }
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }).catch(() => {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      });
    }

    // Try JWT
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
      req.isDemo = false;
      return next();
    } catch (e) {
      // Token invalid/expired — fall through to demo
    }
  }

  // Determine demo role from header, query, or default
  const role = req.headers['x-demo-role'] || req.query.demoRole || 'patient';
  const validRoles = ['patient', 'doctor', 'admin'];
  const safeRole = validRoles.includes(role) ? role : 'patient';

  DemoSeed.getDemoUser(safeRole).then(demoUser => {
    if (!demoUser) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    req.user = { id: demoUser.id, email: demoUser.email, role: demoUser.role };
    req.isDemo = true;
    next();
  }).catch(() => {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  });
}

module.exports = { authenticate, authorize, authenticateOrDemo, authenticateOrDemoAny, DEMO_TOKENS };
