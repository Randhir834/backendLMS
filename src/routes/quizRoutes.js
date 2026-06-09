const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getQuizzes, getQuizById, createQuizController, updateQuiz, deleteQuiz,
  addQuestionController, getQuestions, updateQuestionController, deleteQuestionController,
  assignStudents, getAssignedStudents, removeAssignment,
  startAttempt, saveResponse, submitAttempt, getAttempt, getMyAttempts, getMyQuizAttempts,
  getAllAttempts, gradeAttempt, getStatistics,
} = require('../controllers/quizController');

const router = express.Router();

// ==================== QUIZ CRUD ====================
router.get('/', authenticate, getQuizzes);
router.get('/my-attempts', authenticate, authorizeRoles('student'), getMyAttempts);
router.get('/:id', authenticate, getQuizById);
router.post('/', authenticate, authorizeRoles('instructor', 'admin'), createQuizController);
router.put('/:id', authenticate, authorizeRoles('instructor', 'admin'), updateQuiz);
router.delete('/:id', authenticate, authorizeRoles('instructor', 'admin'), deleteQuiz);

// ==================== QUESTION MANAGEMENT ====================
router.post('/:id/questions', authenticate, authorizeRoles('instructor', 'admin'), addQuestionController);
router.get('/:id/questions', authenticate, getQuestions);
router.put('/:id/questions/:questionId', authenticate, authorizeRoles('instructor', 'admin'), updateQuestionController);
router.delete('/:id/questions/:questionId', authenticate, authorizeRoles('instructor', 'admin'), deleteQuestionController);

// ==================== STUDENT ASSIGNMENT ====================
router.post('/:quiz_id/assign', authenticate, authorizeRoles('instructor', 'admin'), assignStudents);
router.get('/:quiz_id/assignments', authenticate, authorizeRoles('instructor', 'admin'), getAssignedStudents);
router.delete('/:quiz_id/assignments/:student_id', authenticate, authorizeRoles('instructor', 'admin'), removeAssignment);

// ==================== QUIZ ATTEMPTS (STUDENT) ====================
router.post('/:id/start', authenticate, authorizeRoles('student'), startAttempt);
router.post('/attempts/:attemptId/response', authenticate, authorizeRoles('student'), saveResponse);
router.post('/attempts/:attemptId/submit', authenticate, authorizeRoles('student'), submitAttempt);
router.get('/attempts/:attemptId', authenticate, getAttempt);
router.get('/:id/my-attempts', authenticate, authorizeRoles('student'), getMyQuizAttempts);

// ==================== GRADING (INSTRUCTOR/ADMIN) ====================
router.get('/:id/attempts', authenticate, authorizeRoles('instructor', 'admin'), getAllAttempts);
router.put('/attempts/:attemptId/grade', authenticate, authorizeRoles('instructor', 'admin'), gradeAttempt);

// ==================== STATISTICS ====================
router.get('/:quiz_id/statistics', authenticate, authorizeRoles('instructor', 'admin'), getStatistics);

module.exports = router;
