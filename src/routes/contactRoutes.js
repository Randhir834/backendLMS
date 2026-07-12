const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Public route - Submit contact form
router.post('/submit', contactController.submitContactForm);

// Admin routes - Manage contact requests
router.get(
  '/requests',
  authenticate,
  authorizeRoles('admin'),
  contactController.getAllContactRequests
);

router.patch(
  '/requests/:id/status',
  authenticate,
  authorizeRoles('admin'),
  contactController.updateContactRequestStatus
);

module.exports = router;
