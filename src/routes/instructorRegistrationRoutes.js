const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  registerInstructor,
  getRegistrations,
  getRegistrationById,
  updateRegistration,
  deleteRegistration,
} = require('../controllers/instructorRegistrationController');

const router = express.Router();

// Public route to register as an instructor
router.post('/', registerInstructor);

// Admin-only routes
router.get('/', authenticate, authorizeRoles('admin'), getRegistrations);
router.get('/:id', authenticate, authorizeRoles('admin'), getRegistrationById);
router.put('/:id', authenticate, authorizeRoles('admin'), updateRegistration);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteRegistration);

module.exports = router;
