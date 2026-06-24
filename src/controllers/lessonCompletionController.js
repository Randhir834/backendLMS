const {
  markLessonComplete,
  unmarkLessonComplete,
  getCompletedLessons,
  getStudentProgress,
  getInstructorStudentProgress,
  bulkMarkLessonsComplete
} = require('../services/lessonCompletionService');

/**
 * Mark a lesson as completed
 * POST /api/lessons/complete
 * Body: { enrollment_id, lesson_number, notes? }
 */
const markComplete = async (req, res, next) => {
  try {
    const instructorId = req.user.id;
    const { enrollment_id, lesson_number, notes } = req.body;

    if (!enrollment_id || !lesson_number) {
      return res.status(400).json({
        success: false,
        error: 'enrollment_id and lesson_number are required'
      });
    }

    const completion = await markLessonComplete(enrollment_id, lesson_number, instructorId, notes);

    res.json({
      success: true,
      message: 'Lesson marked as completed',
      completion
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Invalid lesson') || error.message.includes('already marked')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

/**
 * Unmark a lesson (mark as incomplete)
 * DELETE /api/lessons/complete
 * Body: { enrollment_id, lesson_number }
 */
const unmarkComplete = async (req, res, next) => {
  try {
    const instructorId = req.user.id;
    const { enrollment_id, lesson_number } = req.body;

    if (!enrollment_id || !lesson_number) {
      return res.status(400).json({
        success: false,
        error: 'enrollment_id and lesson_number are required'
      });
    }

    await unmarkLessonComplete(enrollment_id, lesson_number, instructorId);

    res.json({
      success: true,
      message: 'Lesson marked as incomplete'
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

/**
 * Get completed lessons for an enrollment
 * GET /api/lessons/completed/:enrollmentId
 */
const getCompleted = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;
    const completedLessons = await getCompletedLessons(parseInt(enrollmentId));

    res.json({
      success: true,
      completed_lessons: completedLessons
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student progress for a course (for student view)
 * GET /api/lessons/progress?course_id=:courseId
 */
const getProgress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { course_id } = req.query;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        error: 'course_id is required'
      });
    }

    const progress = await getStudentProgress(userId, parseInt(course_id));

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found'
      });
    }

    res.json({
      success: true,
      progress
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get instructor view of student progress across all courses
 * GET /api/lessons/student/:studentId/progress
 */
const getStudentProgressForInstructor = async (req, res, next) => {
  try {
    const instructorId = req.user.id;
    const { studentId } = req.params;

    const progress = await getInstructorStudentProgress(instructorId, parseInt(studentId));

    res.json({
      success: true,
      courses: progress
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk mark multiple lessons as complete
 * POST /api/lessons/bulk-complete
 * Body: { enrollment_id, lesson_numbers: [1, 2, 3] }
 */
const bulkMarkComplete = async (req, res, next) => {
  try {
    const instructorId = req.user.id;
    const { enrollment_id, lesson_numbers } = req.body;

    if (!enrollment_id || !Array.isArray(lesson_numbers) || lesson_numbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'enrollment_id and lesson_numbers array are required'
      });
    }

    const completions = await bulkMarkLessonsComplete(enrollment_id, lesson_numbers, instructorId);

    res.json({
      success: true,
      message: `${completions.length} lessons marked as completed`,
      completions
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Invalid lesson')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

module.exports = {
  markComplete,
  unmarkComplete,
  getCompleted,
  getProgress,
  getStudentProgressForInstructor,
  bulkMarkComplete
};
