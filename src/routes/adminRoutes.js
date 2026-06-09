const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { getUsers, getUserById, updateUserRoleController, updateUserController, deleteUser, getAnalytics, createAdmin } = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate);

// Admin-only endpoints
router.post('/create-admin', authorizeRoles('admin'), createAdmin);
router.put('/users/:id/role', authorizeRoles('admin'), updateUserRoleController);
router.delete('/users/:id', authorizeRoles('admin'), deleteUser);
router.get('/analytics', authorizeRoles('admin'), getAnalytics);

// Admin and Instructor endpoints
router.get('/users', authorizeRoles('admin', 'instructor'), getUsers);
router.get('/users/:id', authorizeRoles('admin', 'instructor'), getUserById);
router.put('/users/:id', authorizeRoles('admin', 'instructor'), updateUserController);

// Test endpoint
router.get('/test', authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Admin routes working', timestamp: new Date().toISOString() });
});

module.exports = router;
