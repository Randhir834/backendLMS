const express = require('express');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getProfile, updateProfile, changePassword, uploadProfilePhoto, deleteProfilePhoto } = require('../controllers/userController');
const { upload } = require('../services/storageService');

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);
router.post('/profile-photo', authenticate, upload.single('photo'), uploadProfilePhoto);
router.delete('/profile-photo', authenticate, deleteProfilePhoto);

module.exports = router;
