// ============================================================
// MediConnect – middleware/errorHandler.js
// Global error handling middleware
// ============================================================

const env = require('../config/env');

/**
 * Global error handler — catches all errors thrown or passed via next(err).
 * Returns consistent JSON error responses.
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);

  if (env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size exceeds the maximum allowed limit.',
    });
  }

  // Multer unexpected field error
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field.',
    });
  }

  // Joi / validation error
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: err.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    });
  }

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'A record with this information already exists.',
    });
  }

  // MySQL foreign key constraint
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist.',
    });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Internal server error.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
