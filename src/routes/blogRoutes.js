const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleMiddleware');

// Public routes - No authentication required
router.get('/published', blogController.getPublishedBlogs);
router.get('/recent', blogController.getRecentBlogs);
router.get('/slug/:slug', blogController.getBlogBySlug);

// Admin routes - Require admin authentication
router.use(authenticate, isAdmin);

router.get('/', blogController.getAllBlogs);
router.get('/:id', blogController.getBlogById);
router.post('/', blogController.createBlog);
router.put('/:id', blogController.updateBlog);
router.delete('/:id', blogController.deleteBlog);
router.patch('/:id/toggle-publish', blogController.togglePublishStatus);

module.exports = router;
