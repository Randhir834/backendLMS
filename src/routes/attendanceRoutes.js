const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getInstructorCoursesForAttendance,
  getCourseStudentsForAttendance,
  getAttendanceByDate,
  submitAttendance,
  getAttendanceReports,
  getCourseAttendanceStats,
  getStudentAttendanceHistory,
  getAttendanceSummary,
  getStudentStats,
} = require('../controllers/attendanceController');

// Instructor routes
router.get('/courses', authenticate, authorizeRoles('instructor', 'admin'), getInstructorCoursesForAttendance);
router.get('/courses/:courseId/students', authenticate, authorizeRoles('instructor', 'admin'), getCourseStudentsForAttendance);
router.get('/courses/:courseId', authenticate, authorizeRoles('instructor', 'admin'), getAttendanceByDate);
router.get('/courses/:courseId/summary', authenticate, authorizeRoles('instructor', 'admin'), getAttendanceSummary);
router.post('/mark', authenticate, authorizeRoles('instructor', 'admin'), submitAttendance);
router.get('/courses/:courseId/stats', authenticate, authorizeRoles('instructor', 'admin'), getCourseAttendanceStats);

// Bulk operations
router.post('/bulk/mark', authenticate, authorizeRoles('instructor', 'admin'), require('../controllers/bulkAttendanceController').bulkMarkAttendance);
router.post('/bulk/update', authenticate, authorizeRoles('instructor', 'admin'), require('../controllers/bulkAttendanceController').bulkUpdateAttendance);
router.get('/bulk/template', authenticate, authorizeRoles('instructor', 'admin'), require('../controllers/bulkAttendanceController').getAttendanceTemplate);

// Student routes
router.get('/students/:studentId/history', authenticate, authorizeRoles('student', 'instructor', 'admin'), getStudentAttendanceHistory);
router.get('/students/:studentId/stats', authenticate, authorizeRoles('student', 'instructor', 'admin'), getStudentStats);

// Admin routes
router.get('/instructor/:instructorId/courses', authenticate, authorizeRoles('admin'), getInstructorCoursesForAttendance);
router.get('/reports', authenticate, authorizeRoles('instructor', 'admin'), getAttendanceReports);

module.exports = router;