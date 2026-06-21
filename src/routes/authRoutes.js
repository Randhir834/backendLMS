const express = require('express');

const router = express.Router();
const {
  register,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  getSessions,
  logout,
  logoutDevice,
  logoutOtherDevices,
  logoutAllDevices,
} = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth');

// Public auth routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh-token', authLimiter, refreshToken);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

// Protected session management routes
router.get('/sessions', authenticate, getSessions);
router.post('/logout', authenticate, logout);
router.delete('/sessions/:sessionId', authenticate, logoutDevice);
router.post('/logout-other-devices', authenticate, logoutOtherDevices);
router.post('/logout-all-devices', authenticate, logoutAllDevices);

module.exports = router;
