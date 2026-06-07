const express = require('express');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getProfile, updateProfile, changePassword, uploadProfilePhoto, deleteProfilePhoto } = require('../controllers/userController');
const { uploadProfilePhoto: uploadMiddleware } = require('../middleware/uploadMiddleware');

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);
router.post('/profile-photo', authenticate, uploadMiddleware.single('photo'), uploadProfilePhoto);
router.delete('/profile-photo', authenticate, deleteProfilePhoto);

module.exports = router;
