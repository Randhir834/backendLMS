const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getMyCertificates,
  getCertificate,
  downloadCertificate,
  verifyCertificatePublic,
  getCertificatesStats,
} = require('../controllers/certificateController');

// Student routes (authenticated)
router.get('/', authenticate, getMyCertificates);
router.get('/:id', authenticate, getCertificate);
router.post('/:id/download', authenticate, downloadCertificate);

// Public route (no authentication needed)
router.get('/verify/:certificate_number', verifyCertificatePublic);

// Admin routes
router.get('/admin/stats', authenticate, authorizeRoles('admin'), getCertificatesStats);

module.exports = router;
