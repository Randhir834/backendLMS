const {
  findLiveClassesByCourse,
  findUpcomingLiveClasses,
  findLiveClassById,
  findLiveClassesByInstructor,
  createLiveClass,
  updateLiveClassById,
  deleteLiveClassById,
  findCoursesWithLiveClassesByInstructor,
  findCoursesWithLiveClassesByStudent,
} = require('../services/liveClassService');
const { notifyStudentsAboutLiveClass } = require('../services/notificationService');

const getLiveClasses = async (req, res, next) => {
  try {
    // If course_id is provided, get classes for that course
    if (req.query.course_id) {
      const classes = await findLiveClassesByCourse(req.query.course_id);
      return res.json({ liveClasses: classes });
    }

    // For students, get upcoming classes they're enrolled in
    if (req.user.role === 'student') {
      const classes = await findUpcomingLiveClasses(req.user.id);
      return res.json({ liveClasses: classes });
    }

    // For instructors, get their live classes
    if (req.user.role === 'instructor') {
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.course_id) filters.course_id = req.query.course_id;
      if (req.query.search) filters.search = req.query.search;

      const classes = await findLiveClassesByInstructor(req.user.id, filters);
      return res.json({ liveClasses: classes });
    }

    return res.json({ liveClasses: [] });
  } catch (error) {
    next(error);
  }
};

const getLiveClassById = async (req, res, next) => {
  try {
    const liveClass = await findLiveClassById(req.params.id);
    if (!liveClass) {
      return res.status(404).json({ error: 'Live class not found' });
    }
    res.json({ liveClass });
  } catch (error) {
    next(error);
  }
};

const createLiveClassController = async (req, res, next) => {
  try {
    const { course_id, lesson_id, section_id, title, description, meet_link, scheduled_at, duration_minutes } = req.body;

    // Validate required fields
    if (!course_id || !title || !meet_link || !scheduled_at) {
      return res.status(400).json({ error: 'course_id, title, meet_link, and scheduled_at are required' });
    }

    // Validate Google Meet link format
    if (!meet_link.includes('meet.google.com')) {
      return res.status(400).json({ error: 'Invalid Google Meet link' });
    }

    // Validate scheduled_at is in the future
    const scheduledDate = new Date(scheduled_at);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' });
    }

    const liveClass = await createLiveClass({
      course_id,
      lesson_id: lesson_id || null,
      section_id: section_id || null,
      title,
      description: description || '',
      meet_link,
      scheduled_at,
      duration_minutes: duration_minutes || 60,
      created_by: req.user.id,
    });

    res.status(201).json({
      message: 'Live class scheduled successfully',
      liveClass,
    });

    // Send notifications to enrolled students
    try {
      const instructorName = req.user.name || 'Your instructor';
      await notifyStudentsAboutLiveClass({
        courseId: course_id,
        liveClassTitle: title,
        instructorName,
      });
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

    // Emit real-time update to enrolled students
    if (global.io) {
      try {
        const { findStudentsByCourse } = require('../services/enrollmentService');
        const studentIds = await findStudentsByCourse(course_id);
        studentIds.forEach(studentId => {
          global.io.to(`user-${studentId}`).emit('live-class-scheduled', {
            liveClassId: liveClass.id,
            title: liveClass.title,
            courseId: course_id,
            scheduledAt: liveClass.scheduled_at,
            meetLink: liveClass.meet_link,
          });
        });
      } catch (err) {
        console.error('Failed to emit live class notification:', err);
      }
    }
  } catch (error) {
    next(error);
  }
};

const updateLiveClass = async (req, res, next) => {
  try {
    const liveClass = await findLiveClassById(req.params.id);
    if (!liveClass) {
      return res.status(404).json({ error: 'Live class not found' });
    }

    // Validate Google Meet link if provided
    if (req.body.meet_link && !req.body.meet_link.includes('meet.google.com')) {
      return res.status(400).json({ error: 'Invalid Google Meet link' });
    }

    // Validate scheduled_at is in the future if provided
    if (req.body.scheduled_at) {
      const scheduledDate = new Date(req.body.scheduled_at);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ error: 'Scheduled time must be in the future' });
      }
    }

    const updated = await updateLiveClassById(req.params.id, req.body);
    res.json({
      message: 'Live class updated successfully',
      liveClass: updated,
    });
  } catch (error) {
    next(error);
  }
};

const deleteLiveClass = async (req, res, next) => {
  try {
    const liveClass = await findLiveClassById(req.params.id);
    if (!liveClass) {
      return res.status(404).json({ error: 'Live class not found' });
    }

    await deleteLiveClassById(req.params.id);
    res.json({ message: 'Live class deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get courses with their live classes for instructors
const getCoursesWithLiveClasses = async (req, res, next) => {
  try {
    if (req.user.role === 'instructor') {
      const courses = await findCoursesWithLiveClassesByInstructor(req.user.id);
      return res.json({ courses });
    }

    if (req.user.role === 'student') {
      const courses = await findCoursesWithLiveClassesByStudent(req.user.id);
      return res.json({ courses });
    }

    return res.json({ courses: [] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLiveClasses,
  getLiveClassById,
  createLiveClassController,
  updateLiveClass,
  deleteLiveClass,
  getCoursesWithLiveClasses,
};
