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

const {
  broadcastCourseUpdate,
  broadcastCourseDelete
} = require('../services/adminSyncService');

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
      status: status || 'published',
      duration_value, 
      duration_unit, 
      level, 
      language, 
      what_you_learn, 
      requirements,
      instructor_ids
    });

    // Broadcast course creation to all admins
    broadcastCourseUpdate(course.id, course, 'create');

    res.status(201).json({
      message: 'Course created successfully and assigned to instructor(s)',
      course,
    });

    // Emit real-time updates
    if (global.io) {
      // Notify assigned instructors
      if (instructor_ids && instructor_ids.length > 0) {
        instructor_ids.forEach(instructorId => {
          global.io.to(`user-${instructorId}`).emit('course-assigned', { 
            courseId: course.id, 
            title: course.title,
            course: course
          });
        });
      }

      // Broadcast to all students if course is published
      if (course.status === 'published') {
        global.io.emit('course-created', {
          courseId: course.id,
          course: course
        });
      }
    }
  } catch (error) {
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const oldCourse = await findCourseById(req.params.id);
    const course = await updateCourseById(req.params.id, req.body);
    
    // Broadcast course update to all admins
    broadcastCourseUpdate(course.id, course, 'update');
    
    res.json({ message: 'Course updated successfully', course });

    // Emit real-time updates
    if (global.io) {
      // Notify assigned instructors
      if (course.instructors && course.instructors.length > 0) {
        course.instructors.forEach(instructor => {
          global.io.to(`user-${instructor.id}`).emit('course-updated', {
            courseId: course.id,
            course: course
          });
        });
      }

      // Broadcast to all students if course is published
      if (course.status === 'published') {
        global.io.emit('course-updated', {
          courseId: course.id,
          course: course
        });
      }

      // If course was just published (status changed from draft to published)
      if (oldCourse && oldCourse.status !== 'published' && course.status === 'published') {
        global.io.emit('course-created', {
          courseId: course.id,
          course: course
        });
      }
    }
  } catch (error) {
    next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const course = await findCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    await deleteCourseById(req.params.id);
    
    // Broadcast course deletion to all admins
    broadcastCourseDelete(course.id, course.title);
    
    res.json({ message: 'Course deleted successfully' });

    // Emit real-time updates
    if (global.io) {
      // Notify assigned instructors
      if (course.instructors && course.instructors.length > 0) {
        course.instructors.forEach(instructor => {
          global.io.to(`user-${instructor.id}`).emit('course-deleted', {
            courseId: course.id
          });
        });
      }

      // Broadcast to all students
      global.io.emit('course-deleted', {
        courseId: course.id
      });
    }
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
