const {
  findAllCourses,
  findPublishedCourses,
  findCourseById,
  findCoursesByInstructor,
  createNewCourse,
  updateCourseById,
  deleteCourseById,
  removeInstructor,
  getEnrollmentCount,
} = require('../services/courseService');
const { EVENTS, emitToAll, notifyDashboardUpdate } = require('../services/realtimeService');

const getCourses = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.category_id) filters.category_id = req.query.category_id;
    if (req.query.instructor_id) filters.instructor_id = req.query.instructor_id;
    if (req.query.search) filters.search = req.query.search;
    if (req.query.level) filters.level = req.query.level;
    if (req.query.price_range) filters.price_range = req.query.price_range;
    if (req.query.sort_by) filters.sort_by = req.query.sort_by;
    if (req.query.sort_order) filters.sort_order = req.query.sort_order;
    
    const courses = await findAllCourses(filters);
    res.json({ courses });
  } catch (error) {
    next(error);
  }
};

const getPublishedCourses = async (req, res, next) => {
  try {
    const filters = { status: 'published' };
    if (req.query.category_id) filters.category_id = req.query.category_id;
    if (req.query.search) filters.search = req.query.search;
    if (req.query.level) filters.level = req.query.level;
    if (req.query.price_range) filters.price_range = req.query.price_range;
    if (req.query.sort_by) filters.sort_by = req.query.sort_by;
    if (req.query.sort_order) filters.sort_order = req.query.sort_order;
    
    const courses = await findAllCourses(filters);
    res.json({ courses });
  } catch (error) {
    next(error);
  }
};

const getCourseById = async (req, res, next) => {
  try {
    const course = await findCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json({ course });
  } catch (error) {
    next(error);
  }
};

const getInstructorCourses = async (req, res, next) => {
  try {
    const courses = await findCoursesByInstructor(req.params.instructorId);
    res.json({ courses });
  } catch (error) {
    next(error);
  }
};

const createCourse = async (req, res, next) => {
  try {
    const {
      title, description, price, thumbnail_url, category_id, status,
      duration_value, duration_unit, level, language, what_you_learn, requirements,
      instructor_ids
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    if (!instructor_ids || instructor_ids.length === 0) {
      return res.status(400).json({ error: 'At least one instructor must be assigned' });
    }

    // Ensure price is in INR format
    const priceInINR = price ? parseFloat(price) : 0;

    const course = await createNewCourse({
      title, 
      description, 
      price: priceInINR, 
      thumbnail_url, 
      category_id, 
      status: 'published',
      duration_value, 
      duration_unit, 
      level, 
      language, 
      what_you_learn, 
      requirements,
      instructor_ids
    });

    // Emit real-time event
    emitToAll(EVENTS.COURSE_CREATED, course);
    notifyDashboardUpdate();

    res.status(201).json({
      message: 'Course created successfully and assigned to instructor(s)',
      course,
    });
  } catch (error) {
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const course = await updateCourseById(req.params.id, req.body);
    
    // Emit real-time event
    emitToAll(EVENTS.COURSE_UPDATED, course);
    notifyDashboardUpdate();
    
    res.json({ message: 'Course updated successfully', course });
  } catch (error) {
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    await deleteCourseById(req.params.id);
    
    // Emit real-time event
    emitToAll(EVENTS.COURSE_DELETED, { id: req.params.id });
    notifyDashboardUpdate();
    
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const removeInstructorFromCourse = async (req, res, next) => {
  try {
    await removeInstructor(req.params.id, req.params.instructorId);
    res.json({ message: 'Instructor removed from course' });
  } catch (error) {
    next(error);
  }
};

const getCourseEnrollmentCount = async (req, res, next) => {
  try {
    const count = await getEnrollmentCount(req.params.id);
    res.json({ count });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourses,
  getPublishedCourses,
  getCourseById,
  getInstructorCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  removeInstructorFromCourse,
  getCourseEnrollmentCount,
};
