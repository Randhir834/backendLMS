const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public route - Submit contact form
router.post('/submit', contactController.submitContactForm);

// Admin routes - Manage contact requests
router.get(
  '/requests',
  authenticateToken,
  requireRole(['admin']),
  contactController.getAllContactRequests
);

router.patch(
  '/requests/:id/status',
  authenticateToken,
  requireRole(['admin']),
  contactController.updateContactRequestStatus
);

module.exports = router;
