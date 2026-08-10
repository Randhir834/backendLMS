const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Public routes - No authentication required
router.get('/published', blogController.getPublishedBlogs);
router.get('/recent', blogController.getRecentBlogs);
router.get('/slug/:slug', blogController.getBlogBySlug);

// Admin routes - Require admin authentication
router.get('/', authenticate, authorizeRoles('admin'), blogController.getAllBlogs);
router.get('/:id', authenticate, authorizeRoles('admin'), blogController.getBlogById);
router.post('/', authenticate, authorizeRoles('admin'), blogController.createBlog);
router.put('/:id', authenticate, authorizeRoles('admin'), blogController.updateBlog);
router.delete('/:id', authenticate, authorizeRoles('admin'), blogController.deleteBlog);
router.patch('/:id/toggle-publish', authenticate, authorizeRoles('admin'), blogController.togglePublishStatus);

module.exports = router;
