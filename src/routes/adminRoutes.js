const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { adminAccessControl, auditAdminAction } = require('../middleware/adminAccessControl');
const { getUsers, getUserById, updateUserRoleController, updateUserController, deleteUser, getUserDeletionImpact, archiveUser, deleteMultipleUsers, getAnalytics, createInstructorAccount } = require('../controllers/adminController');

const router = express.Router();

// Apply authentication and admin access control to all admin routes
router.use(authenticate);
router.use(adminAccessControl);

// All admins have full access to all admin operations
router.get('/users', auditAdminAction('GET_USERS'), getUsers);
router.get('/users/:id', auditAdminAction('GET_USER'), getUserById);
router.put('/users/:id', auditAdminAction('UPDATE_USER'), updateUserController);
router.put('/users/:id/role', auditAdminAction('UPDATE_USER_ROLE'), updateUserRoleController);

// User deletion endpoints
router.get('/users/:id/deletion-impact', auditAdminAction('GET_USER_DELETION_IMPACT'), getUserDeletionImpact);
router.delete('/users/:id', auditAdminAction('DELETE_USER'), deleteUser);
router.post('/users/:id/archive', auditAdminAction('ARCHIVE_USER'), archiveUser);
router.post('/users/delete-multiple', auditAdminAction('DELETE_MULTIPLE_USERS'), deleteMultipleUsers);

router.get('/analytics', auditAdminAction('GET_ANALYTICS'), getAnalytics);
router.post('/instructors/create', auditAdminAction('CREATE_INSTRUCTOR'), createInstructorAccount);

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Admin routes working', timestamp: new Date().toISOString() });
});

module.exports = router;
