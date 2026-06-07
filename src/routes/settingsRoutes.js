const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { getSettings, getSetting, updateSetting } = require('../controllers/settingsController');

const router = express.Router();

router.get('/', authenticate, authorizeRoles('admin'), getSettings);
router.get('/:key', authenticate, authorizeRoles('admin'), getSetting);
router.put('/:key', authenticate, authorizeRoles('admin'), updateSetting);

module.exports = router;
