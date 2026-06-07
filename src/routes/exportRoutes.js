const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  exportAttendanceCSV,
  exportCourseSummaryCSV,
} = require('../controllers/exportController');

// Export routes
router.get('/attendance/csv', authenticate, authorizeRoles('instructor', 'admin'), exportAttendanceCSV);
router.get('/attendance/courses/:courseId/summary/csv', authenticate, authorizeRoles('instructor', 'admin'), exportCourseSummaryCSV);

module.exports = router;