const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  upload,
  uploadMaterial,
  getMaterials,
  getViewingToken,
  serveSecureFile,
  deleteMaterial,
  getAccessLogs,
  reportScreenshotAttempt,
  reportDownloadAttempt
} = require('../controllers/courseMaterialController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Upload course material (Admin only)
router.post(
  '/courses/:courseId/materials',
  authorizeRoles('admin'),
  upload,
  uploadMaterial
);

// Get course materials (Admin and assigned instructors)
router.get(
  '/courses/:courseId/materials',
  authorizeRoles('admin', 'instructor'),
  getMaterials
);

// Generate secure viewing token (Admin and assigned instructors)
router.post(
  '/materials/:materialId/token',
  authorizeRoles('admin', 'instructor'),
  getViewingToken
);

// Serve secure file content (requires valid token)
router.get(
  '/materials/secure/:token',
  serveSecureFile
);

// Delete course material (Admin only)
router.delete(
  '/materials/:materialId',
  authorizeRoles('admin'),
  deleteMaterial
);

// Get material access logs (Admin only)
router.get(
  '/materials/:materialId/logs',
  authorizeRoles('admin'),
  getAccessLogs
);

// Report security violations
router.post(
  '/materials/report/screenshot',
  authorizeRoles('admin', 'instructor'),
  reportScreenshotAttempt
);

router.post(
  '/materials/report/download',
  authorizeRoles('admin', 'instructor'),
  reportDownloadAttempt
);

module.exports = router;