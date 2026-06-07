const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getQuizzes, getQuizById, createQuizController, updateQuiz, deleteQuiz,
  addQuestion, updateQuestion, deleteQuestion,
  assignStudents, getAssignedStudents, removeAssignment,
  startQuizAttempt, submitQuizAnswer, completeQuizAttempt, 
  getMyAttempts, getQuizAttempts, getAttemptDetails, getStatistics,
} = require('../controllers/quizController');

const router = express.Router();

// Quiz CRUD
router.get('/', authenticate, getQuizzes);
router.get('/:id', authenticate, getQuizById);
router.post('/', authenticate, authorizeRoles('instructor', 'admin'), createQuizController);
router.put('/:id', authenticate, authorizeRoles('instructor', 'admin'), updateQuiz);
router.delete('/:id', authenticate, authorizeRoles('instructor', 'admin'), deleteQuiz);

// Question management
router.post('/:id/questions', authenticate, authorizeRoles('instructor', 'admin'), addQuestion);
router.put('/:id/questions/:questionId', authenticate, authorizeRoles('instructor', 'admin'), updateQuestion);
router.delete('/:id/questions/:questionId', authenticate, authorizeRoles('instructor', 'admin'), deleteQuestion);

// Student assignment
router.post('/:quiz_id/assign', authenticate, authorizeRoles('instructor', 'admin'), assignStudents);
router.get('/:quiz_id/assignments', authenticate, authorizeRoles('instructor', 'admin'), getAssignedStudents);
router.delete('/:quiz_id/assignments/:student_id', authenticate, authorizeRoles('instructor', 'admin'), removeAssignment);

// Quiz attempts (student)
router.post('/:id/attempt', authenticate, authorizeRoles('student'), startQuizAttempt);
router.post('/attempts/:attemptId/answer', authenticate, authorizeRoles('student'), submitQuizAnswer);
router.post('/attempts/:attemptId/complete', authenticate, authorizeRoles('student'), completeQuizAttempt);

// Attempt viewing
router.get('/my-attempts/list', authenticate, authorizeRoles('student'), getMyAttempts);
router.get('/:quiz_id/attempts', authenticate, authorizeRoles('instructor', 'admin'), getQuizAttempts);
router.get('/attempts/:attemptId', authenticate, getAttemptDetails);

// Statistics
router.get('/:quiz_id/statistics', authenticate, authorizeRoles('instructor', 'admin'), getStatistics);

module.exports = router;
