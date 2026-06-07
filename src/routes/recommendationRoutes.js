const express = require('express');
const router = express.Router();
const {
  getQuestionnaire,
  submitQuestionnaire,
  getRecommendationsBySession,
  getAllRecommendations,
  updateCourseMetadata,
  getCourseMetadata
} = require('../controllers/recommendationController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Public routes (no authentication required)
router.get('/questionnaire', getQuestionnaire);
router.post('/submit', submitQuestionnaire);
router.get('/session/:sessionId', getRecommendationsBySession);

// Admin routes (authentication required)
router.get('/all', authenticate, authorizeRoles('admin'), getAllRecommendations);
router.put('/metadata/:courseId', authenticate, authorizeRoles('admin'), updateCourseMetadata);
router.get('/metadata/:courseId', authenticate, authorizeRoles('admin', 'instructor'), getCourseMetadata);

module.exports = router;
