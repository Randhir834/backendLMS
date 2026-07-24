const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { 
  submitReview,
  getApprovedReviews,
  getAllReviews,
  getPendingReviews,
  getReviewById,
  approveReview,
  rejectReview,
  updateReview,
  deleteReview,
  getReviewStats
} = require('../controllers/reviewController');

const router = express.Router();

// Public routes
router.post('/submit', submitReview);
router.get('/approved', getApprovedReviews);

// Admin-only routes
router.get('/all', authenticate, authorizeRoles('admin'), getAllReviews);
router.get('/pending', authenticate, authorizeRoles('admin'), getPendingReviews);
router.get('/stats', authenticate, authorizeRoles('admin'), getReviewStats);
router.get('/:id', authenticate, authorizeRoles('admin'), getReviewById);
router.put('/:id/approve', authenticate, authorizeRoles('admin'), approveReview);
router.put('/:id/reject', authenticate, authorizeRoles('admin'), rejectReview);
router.put('/:id', authenticate, authorizeRoles('admin'), updateReview);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteReview);

module.exports = router;
