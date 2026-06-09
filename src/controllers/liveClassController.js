const {
  findLiveClassesByCourse,
  findUpcomingLiveClasses,
  findAllLiveClassesForStudent,
  findLiveClassById,
  findLiveClassesByInstructor,
  createLiveClass,
  updateLiveClassById,
  deleteLiveClassById,
  findCoursesWithLiveClassesByInstructor,
  findCoursesWithLiveClassesByStudent,
  findEnrolledStudentsForLiveClass,
  findAllLiveClasses,
  findCoursesForFilter,
  findInstructorsForFilter,
} = require('../services/liveClassService');
const { notifyStudentsAboutLiveClass } = require('../services/notificationService');
const { query } = require('../config/database');

const getLiveClasses = async (req, res, next) => {
  try {
    if (req.query.course_id) {
      const classes = await findLiveClassesByCourse(req.query.course_id);
      return res.json({ liveClasses: classes });
    }

    // For students, get all classes they're enrolled in
    if (req.user.role === 'student') {
      const classes = await findAllLiveClassesForStudent(req.user.id);
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

    // For admins, get all live classes across the platform with optional filters
    if (req.user.role === 'admin') {
      const filters = {};
      if (req.query.course_id) filters.course_id = req.query.course_id;
      if (req.query.instructor_id) filters.instructor_id = req.query.instructor_id;
      
      const classes = await findAllLiveClasses(filters);
      return res.json({ liveClasses: classes });
    }

    return res.json({ liveClasses: [] });
  } catch (error) { next(error); }
};

const getLiveClassById = async (req, res, next) => {
  try {
    const liveClass = await findLiveClassById(req.params.id);
    if (!liveClass) {
      return res.status(404).json({ error: 'Live class not found' });
    }

    // Get enrolled students for this live class
    const students = await findEnrolledStudentsForLiveClass(req.params.id);
    liveClass.students = students;

    res.json({ liveClass });
  } catch (error) { next(error); }
};

const createLiveClassController = async (req, res, next) => {
  try {
    const { course_id, title, description, meet_link, scheduled_at, duration_minutes, end_time } = req.body;
    
    // Validate required fields
    if (!course_id || !title || !meet_link || !scheduled_at) {
      return res.status(400).json({ error: 'Missing required fields: course_id, title, meet_link, and scheduled_at are required' });
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(meet_link)) {
      return res.status(400).json({ error: 'Invalid meet link format. Must be a valid URL starting with http:// or https://' });
    }

    // Validate scheduled_at is in the future
    const scheduledDate = new Date(scheduled_at);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' });
    }

    const liveClassData = {
      course_id,
      title,
      description,
      meet_link,
      scheduled_at,
      duration_minutes: duration_minutes || 60,
      end_time,
      created_by: req.user.id
    };

    const liveClass = await createLiveClass(liveClassData);
    
    // Optionally notify students about the new live class
    try {
      await notifyStudentsAboutLiveClass(liveClass.id);
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

    res.status(201).json({ message: 'Live class scheduled successfully', liveClass });
  } catch (error) { next(error); }
};

const updateLiveClass = async (req, res, next) => {
  try {
    const liveClass = await updateLiveClassById(req.params.id, req.body);
    res.json({ message: 'Live class updated successfully', liveClass });
  } catch (error) { next(error); }
};

const deleteLiveClass = async (req, res, next) => {
  try {
    await deleteLiveClassById(req.params.id);
    res.json({ message: 'Live class deleted successfully' });
  } catch (error) { next(error); }
};

const getFilterOptions = async (req, res, next) => {
  try {
    const [courses, instructors] = await Promise.all([
      findCoursesForFilter(),
      findInstructorsForFilter()
    ]);
    
    res.json({ 
      courses,
      instructors
    });
  } catch (error) { next(error); }
};

module.exports = { getLiveClasses, getLiveClassById, createLiveClassController, updateLiveClass, deleteLiveClass, getFilterOptions };
