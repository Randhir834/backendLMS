const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  markComplete,
  unmarkComplete,
  getCompleted,
  getProgress,
  getStudentProgressForInstructor,
  bulkMarkComplete
} = require('../controllers/lessonCompletionController');

const router = express.Router();

// Instructor routes - manage lesson completions
router.post('/complete', authenticate, authorizeRoles('instructor', 'admin'), markComplete);
router.delete('/complete', authenticate, authorizeRoles('instructor', 'admin'), unmarkComplete);
router.post('/bulk-complete', authenticate, authorizeRoles('instructor', 'admin'), bulkMarkComplete);
router.get('/student/:studentId/progress', authenticate, authorizeRoles('instructor', 'admin'), getStudentProgressForInstructor);

// Student routes - view their own progress
router.get('/progress', authenticate, authorizeRoles('student'), getProgress);
router.get('/completed/:enrollmentId', authenticate, getCompleted);

module.exports = router;
