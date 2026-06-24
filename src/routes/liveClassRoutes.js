const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { 
  getLiveClasses, 
  getLiveClassById, 
  createLiveClassController, 
  updateLiveClass, 
  deleteLiveClass,
  getCoursesWithLiveClasses 
} = require('../controllers/liveClassController');

const router = express.Router();

router.get('/', authenticate, getLiveClasses);
router.get('/courses-with-classes', authenticate, getCoursesWithLiveClasses);
router.get('/:id', authenticate, getLiveClassById);
router.post('/', authenticate, authorizeRoles('instructor', 'admin'), createLiveClassController);
router.post('/schedule-for-student', authenticate, authorizeRoles('instructor', 'admin'), async (req, res, next) => {
  try {
    const { student_id, course_id, scheduled_at, title, description } = req.body;
    const instructorId = req.user.id;
    
    // Validate required fields
    if (!student_id || !course_id || !scheduled_at) {
      return res.status(400).json({ error: 'student_id, course_id, and scheduled_at are required' });
    }

    // Verify instructor teaches this course
    const { query } = require('../config/database');
    const instructorCheck = await query(
      'SELECT id FROM course_instructors WHERE course_id = $1 AND instructor_id = $2',
      [course_id, instructorId]
    );
    
    if (instructorCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied. You are not assigned to this course.' 
      });
    }

    // Verify student is enrolled in this course
    const enrollmentCheck = await query(
      'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [student_id, course_id]
    );
    
    if (enrollmentCheck.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Student is not enrolled in this course.' 
      });
    }

    // Get student name and course title for the live class title
    const studentResult = await query('SELECT name FROM users WHERE id = $1', [student_id]);
    const courseResult = await query('SELECT title, google_meet_link FROM courses WHERE id = $1', [course_id]);
    
    const studentName = studentResult.rows[0]?.name || 'Student';
    const courseTitle = courseResult.rows[0]?.title || 'Course';
    const googleMeetLink = courseResult.rows[0]?.google_meet_link;

    // Create the live class
    const { createLiveClass } = require('../services/liveClassService');
    const liveClass = await createLiveClass({
      course_id,
      lesson_id: null,
      section_id: null,
      title: title || `Live Class - ${courseTitle} with ${studentName}`,
      description: description || `Live class with ${studentName}`,
      meet_link: googleMeetLink,
      scheduled_at,
      duration_minutes: 60, // Fixed 1 hour duration
      created_by: instructorId,
    });

    if (!liveClass.meet_link) {
      return res.status(400).json({ 
        error: 'No Google Meet link available. Please set a Google Meet link in the course settings.' 
      });
    }

    // Emit real-time update to the student
    if (global.io) {
      global.io.to(`user-${student_id}`).emit('live-class-scheduled', {
        liveClassId: liveClass.id,
        title: liveClass.title,
        courseId: course_id,
        courseTitle: courseTitle,
        scheduledAt: liveClass.scheduled_at,
        meetLink: liveClass.meet_link,
        durationMinutes: liveClass.duration_minutes,
        instructorName: req.user.name,
      });
    }

    res.status(201).json({
      message: 'Live class scheduled successfully',
      liveClass,
    });
  } catch (error) {
    next(error);
  }
});
router.put('/:id', authenticate, authorizeRoles('instructor', 'admin'), updateLiveClass);
router.delete('/:id', authenticate, authorizeRoles('instructor', 'admin'), deleteLiveClass);

module.exports = router;
