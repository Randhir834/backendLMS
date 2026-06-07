const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { requestTrial, getTrialRequests } = require('../controllers/trialRequestController');

const router = express.Router();

// Public route to request a free trial
router.post('/', requestTrial);

// Admin-only route to list all trial requests
router.get('/', authenticate, authorizeRoles('admin'), getTrialRequests);

module.exports = router;
