// ============================================================
// MediConnect – middleware/upload.js
// Multer configuration for file uploads
// ============================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');

// Allowed MIME types
const ALLOWED_TYPES = {
  reports: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  prescriptions: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  avatars: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  cms: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/svg+xml'],
};

/**
 * Create a Multer storage engine for a given subfolder.
 * @param {string} subfolder - e.g. 'reports', 'prescriptions', 'avatars'
 */
function createStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = path.join(__dirname, '..', env.UPLOAD_DIR, subfolder);
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${subfolder}-${uniqueSuffix}${ext}`);
    },
  });
}

/**
 * File filter factory.
 * @param {string} category - Key in ALLOWED_TYPES
 */
function fileFilter(category) {
  return (req, file, cb) => {
    const allowed = ALLOWED_TYPES[category] || [];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`);
      error.statusCode = 400;
      cb(error, false);
    }
  };
}

// Pre-configured upload instances
const uploadReport = multer({
  storage: createStorage('reports'),
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: fileFilter('reports'),
});

const uploadPrescription = multer({
  storage: createStorage('prescriptions'),
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: fileFilter('prescriptions'),
});

const uploadAvatar = multer({
  storage: createStorage('avatars'),
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: fileFilter('avatars'),
});

const uploadCmsMedia = multer({
  storage: createStorage('cms'),
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: fileFilter('cms'),
});

module.exports = {
  uploadReport,
  uploadPrescription,
  uploadAvatar,
  uploadCmsMedia,
};
