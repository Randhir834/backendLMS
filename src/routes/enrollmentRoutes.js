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
  getInstructorStudentsController,
} = require('../controllers/enrollmentController');

router.post('/', authenticate, enrollCourse);
router.get('/', authenticate, getEnrollments);
router.get('/check/:courseId', authenticate, checkEnrollment);
router.get('/all', authenticate, authorizeRoles('admin'), getAllEnrollments);
router.get('/instructor/students', authenticate, authorizeRoles('instructor'), getInstructorStudentsController);
router.get('/instructor/students/:studentId/courses', authenticate, authorizeRoles('instructor'), async (req, res, next) => {
  try {
    const { getStudentEnrolledCoursesByInstructor } = require('../services/enrollmentService');
    const studentId = req.params.studentId;
    const instructorId = req.user.id;
    const courses = await getStudentEnrolledCoursesByInstructor(instructorId, studentId);
    res.json({ courses });
  } catch (error) {
    next(error);
  }
});
router.patch('/instructor/enrollments/:enrollmentId/completed-lessons', authenticate, authorizeRoles('instructor'), async (req, res, next) => {
  try {
    const { updateManualCompletedLessons } = require('../services/enrollmentService');
    const enrollmentId = req.params.enrollmentId;
    const instructorId = req.user.id;
    const { completed_lessons } = req.body;

    if (completed_lessons === undefined || completed_lessons === null) {
      return res.status(400).json({ error: 'completed_lessons is required' });
    }

    if (!Number.isInteger(completed_lessons)) {
      return res.status(400).json({ error: 'completed_lessons must be an integer' });
    }

    const result = await updateManualCompletedLessons(enrollmentId, completed_lessons, instructorId);
    
    res.json({ 
      message: 'Lesson progress updated successfully',
      enrollment: result
    });
  } catch (error) {
    next(error);
  }
});
router.get('/course/:courseId', authenticate, authorizeRoles('instructor', 'admin'), getCourseEnrollmentsController);
router.get('/course/:courseId/stats', authenticate, authorizeRoles('instructor', 'admin'), async (req, res, next) => {
  try {
    const { getCourseEnrollmentStats } = require('../services/enrollmentService');
    const stats = await getCourseEnrollmentStats(req.params.courseId);
    res.json({ stats });
  } catch (error) {
    next(error);
  }
});
router.get('/:id', authenticate, getEnrollmentById);

module.exports = router;
