const {
  createEnrollment,
  findEnrollmentsByUser,
  findEnrollmentById,
  findEnrollmentByUserAndCourse,
  findAllEnrollments,
  findCourseEnrollments,
} = require('../services/enrollmentService');
const { createPaymentRecord } = require('../services/paymentService');
const { findCourseById } = require('../services/courseService');
const { EVENTS, emitToAll, emitToUser, notifyDashboardUpdate } = require('../services/realtimeService');

const enrollCourse = async (req, res, next) => {
  try {
    const { course_id, payment_method } = req.body;
    
    // Get course details to check price
    const course = await findCourseById(course_id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Create enrollment first
    const enrollment = await createEnrollment({ user_id: req.user.id, course_id });
    
    // Emit real-time event
    emitToAll(EVENTS.ENROLLMENT_CREATED, enrollment);
    emitToUser(req.user.id, EVENTS.ENROLLMENT_CREATED, enrollment);
    notifyDashboardUpdate();
    
    // If course has a price, create payment record
    if (course.price > 0) {
      if (!payment_method) {
        return res.status(400).json({ error: 'Payment method is required for paid courses' });
      }
      
      const payment = await createPaymentRecord({
        user_id: req.user.id,
        enrollment_id: enrollment.id,
        amount: course.price,
        payment_method
      });
      
      res.status(201).json({ 
        message: 'Enrolled successfully. Payment pending.', 
        enrollment,
        payment,
        course_price: course.price
      });
    } else {
      res.status(201).json({ 
        message: 'Enrolled successfully in free course', 
        enrollment 
      });
    }
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

const getEnrollments = async (req, res, next) => {
  try {
    const enrollments = await findEnrollmentsByUser(req.user.id);
    res.json({ enrollments });
  } catch (error) {
    next(error);
  }
};

const getEnrollmentById = async (req, res, next) => {
  try {
    const enrollment = await findEnrollmentById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    res.json({ enrollment });
  } catch (error) {
    next(error);
  }
};

const checkEnrollment = async (req, res, next) => {
  try {
    const enrollment = await findEnrollmentByUserAndCourse(req.user.id, req.params.courseId);
    res.json({ enrolled: !!enrollment, enrollment });
  } catch (error) {
    next(error);
  }
};

const getAllEnrollments = async (req, res, next) => {
  try {
    const enrollments = await findAllEnrollments();
    res.json({ enrollments });
  } catch (error) {
    next(error);
  }
};

const getCourseEnrollments = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { status, search, sort_by, sort_order } = req.query;
    
    // Verify that the instructor is assigned to this course (unless admin)
    if (req.user.role === 'instructor') {
      const { verifyInstructorCourseAccess } = require('../services/courseService');
      const hasAccess = await verifyInstructorCourseAccess(req.user.id, courseId);
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'You do not have access to this course. Please ensure you are assigned as an instructor for this course.' 
        });
      }
    }
    
    const filters = {};
    if (status) filters.status = status;
    if (search) filters.search = search;
    if (sort_by) filters.sort_by = sort_by;
    if (sort_order) filters.sort_order = sort_order;

    const enrollments = await findCourseEnrollments(courseId, filters);
    res.json({ enrollments });
  } catch (error) {
    console.error('Error in getCourseEnrollments:', error);
    next(error);
  }
};

module.exports = {
  enrollCourse,
  getEnrollments,
  getEnrollmentById,
  checkEnrollment,
  getAllEnrollments,
  getCourseEnrollments,
};
