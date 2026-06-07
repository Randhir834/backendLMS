const express = require('express');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  enrollCourse,
  getEnrollments,
  getEnrollmentById,
  checkEnrollment,
  getAllEnrollments,
  getCourseEnrollmentsController,
} = require('../controllers/enrollmentController');

// Specific routes first (before generic :id route)
router.post('/', authenticate, enrollCourse);
router.get('/check/:courseId', authenticate, checkEnrollment);
router.get('/all', authenticate, authorizeRoles('admin'), getAllEnrollments);
router.get('/course/:courseId', authenticate, authorizeRoles('instructor', 'admin'), getCourseEnrollmentsController);

// Generic routes last
router.get('/', authenticate, getEnrollments);
router.get('/:id', authenticate, getEnrollmentById);

module.exports = router;
