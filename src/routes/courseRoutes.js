const express = require('express');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getCourses,
  getPublishedCourses,
  getCourseById,
  getInstructorCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  removeInstructorFromCourse,
  getCourseEnrollmentCount,
} = require('../controllers/courseController');

// Public routes
router.get('/', getCourses);
router.get('/published', getPublishedCourses);

// Instructor routes (must come before /:id route)
router.get('/my-courses', authenticate, authorizeRoles('instructor'), async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.search) filters.search = req.query.search;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.level) filters.level = req.query.level;
    if (req.query.sort_by) filters.sort_by = req.query.sort_by;
    if (req.query.sort_order) filters.sort_order = req.query.sort_order;
    
    const { findCoursesByInstructor } = require('../services/courseService');
    const courses = await findCoursesByInstructor(req.user.id, filters);
    res.json({ courses });
  } catch (error) {
    next(error);
  }
});

router.get('/instructor/:instructorId', authenticate, authorizeRoles('instructor', 'admin'), getInstructorCourses);

// These routes with :id parameter must come after specific routes
router.get('/:id', getCourseById);
router.get('/:id/enrollment-count', getCourseEnrollmentCount);

// Admin only routes
router.post('/', authenticate, authorizeRoles('admin'), createCourse);
router.put('/:id', authenticate, authorizeRoles('admin', 'instructor'), updateCourse);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteCourse);
router.delete('/:id/instructors/:instructorId', authenticate, authorizeRoles('admin'), removeInstructorFromCourse);

module.exports = router;
