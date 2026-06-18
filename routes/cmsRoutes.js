// ============================================================
// MediConnect – routes/cmsRoutes.js
// CMS content routes (public + admin)
// ============================================================

const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cmsController');
const { authenticate, authorize, authenticateOrDemo } = require('../middleware/auth');
const { uploadCmsMedia } = require('../middleware/upload');

// ── Public Routes ──────────────────────────────────────────
// Aggregated homepage data (no auth required)
router.get('/homepage', cmsController.getHomepageData);

// Public CMS Page metadata & sections by slug
router.get('/page/:slug', cmsController.getPageBySlug);

// Public active FAQs
router.get('/faqs', cmsController.getFaqs);

// Public active Social Links
router.get('/social-links', cmsController.getSocialLinks);

// Public general settings
router.get('/settings', cmsController.getSettings);


// ── Admin Routes ───────────────────────────────────────────
// GET routes use authenticateOrDemo so demo admin can browse CMS
// POST/PUT/DELETE remain strictly authenticated
const adminMiddleware = [authenticate, authorize('admin')];

// Pages CRUD
router.get('/pages', authenticateOrDemo('admin'), cmsController.getAllPages);
router.post('/page', ...adminMiddleware, cmsController.createPage);
router.put('/page/:id', ...adminMiddleware, cmsController.updatePage);
router.delete('/page/:id', ...adminMiddleware, cmsController.deletePage);

// Sections CRUD
router.get('/sections', authenticateOrDemo('admin'), cmsController.getAllSections);
router.get('/sections/:key', authenticateOrDemo('admin'), cmsController.getSection);
router.post('/sections', ...adminMiddleware, cmsController.createSection);
router.put('/sections/:id', ...adminMiddleware, cmsController.updateSection);
router.delete('/sections/:id', ...adminMiddleware, cmsController.deleteSection);

// FAQs CRUD & Reordering
router.get('/faqs/all', authenticateOrDemo('admin'), cmsController.getAllFaqs);
router.post('/faqs', ...adminMiddleware, cmsController.createFaq);
router.put('/faqs/:id', ...adminMiddleware, cmsController.updateFaq);
router.delete('/faqs/:id', ...adminMiddleware, cmsController.deleteFaq);
router.post('/faqs/reorder', ...adminMiddleware, cmsController.reorderFaqs);

// Settings bulk updates
router.put('/settings', ...adminMiddleware, cmsController.updateSettings);

// Social Links CRUD
router.get('/social-links/all', authenticateOrDemo('admin'), cmsController.getAllSocialLinks);
router.put('/social-links/:id', ...adminMiddleware, cmsController.updateSocialLink);

// Media Management (Physical upload uses uploadCmsMedia middleware)
router.get('/media', authenticateOrDemo('admin'), cmsController.getMediaList);
router.post('/media', ...adminMiddleware, uploadCmsMedia.single('file'), cmsController.uploadMedia);
router.delete('/media/:id', ...adminMiddleware, cmsController.deleteMedia);

module.exports = router;

