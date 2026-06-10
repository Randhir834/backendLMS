const express = require('express');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getProfile, updateProfile, changePassword } = require('../controllers/userController');

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
