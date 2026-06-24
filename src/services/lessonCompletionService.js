const { query } = require('../config/database');

/**
 * Mark a lesson as completed for a student
 * @param {number} enrollmentId - The enrollment ID
 * @param {number} lessonNumber - The lesson number (1-indexed)
 * @param {number} instructorId - The instructor marking it complete
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} The created completion record
 */
const markLessonComplete = async (enrollmentId, lessonNumber, instructorId, notes = null) => {
  console.log(`[markLessonComplete] Enrollment ${enrollmentId}, Lesson ${lessonNumber}, Instructor ${instructorId}`);

  // Verify enrollment exists and instructor has access
  const enrollmentCheck = await query(
    `SELECT e.id, e.user_id, e.course_id, c.number_of_lessons
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     JOIN course_instructors ci ON c.id = ci.course_id
     WHERE e.id = $1 AND ci.instructor_id = $2`,
    [enrollmentId, instructorId]
  );

  if (enrollmentCheck.rows.length === 0) {
    throw new Error('Enrollment not found or you do not have access to this course');
  }

  const enrollment = enrollmentCheck.rows[0];
  const totalLessons = enrollment.number_of_lessons || 0;

  // Validate lesson number
  if (lessonNumber < 1 || (totalLessons > 0 && lessonNumber > totalLessons)) {
    throw new Error(`Invalid lesson number. Must be between 1 and ${totalLessons}`);
  }

  // Check if already completed
  const existing = await query(
    `SELECT id FROM lesson_completions WHERE enrollment_id = $1 AND lesson_number = $2`,
    [enrollmentId, lessonNumber]
  );

  if (existing.rows.length > 0) {
    throw new Error('This lesson is already marked as completed');
  }

  // Create completion record
  const result = await query(
    `INSERT INTO lesson_completions (enrollment_id, lesson_number, completed_by, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [enrollmentId, lessonNumber, instructorId, notes]
  );

  console.log(`[markLessonComplete] ✅ Lesson ${lessonNumber} marked complete for enrollment ${enrollmentId}`);

  return result.rows[0];
};

/**
 * Unmark a lesson (mark as incomplete)
 * @param {number} enrollmentId - The enrollment ID
 * @param {number} lessonNumber - The lesson number
 * @param {number} instructorId - The instructor unmarking it
 * @returns {Promise<Object>} Result of deletion
 */
const unmarkLessonComplete = async (enrollmentId, lessonNumber, instructorId) => {
  console.log(`[unmarkLessonComplete] Enrollment ${enrollmentId}, Lesson ${lessonNumber}, Instructor ${instructorId}`);

  // Verify instructor has access
  const accessCheck = await query(
    `SELECT e.id
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     JOIN course_instructors ci ON c.id = ci.course_id
     WHERE e.id = $1 AND ci.instructor_id = $2`,
    [enrollmentId, instructorId]
  );

  if (accessCheck.rows.length === 0) {
    throw new Error('Enrollment not found or you do not have access to this course');
  }

  // Delete the completion record
  const result = await query(
    `DELETE FROM lesson_completions
     WHERE enrollment_id = $1 AND lesson_number = $2
     RETURNING *`,
    [enrollmentId, lessonNumber]
  );

  if (result.rows.length === 0) {
    throw new Error('Lesson completion not found');
  }

  console.log(`[unmarkLessonComplete] ✅ Lesson ${lessonNumber} unmarked for enrollment ${enrollmentId}`);

  return result.rows[0];
};

/**
 * Get all completed lessons for an enrollment
 * @param {number} enrollmentId - The enrollment ID
 * @returns {Promise<Array>} Array of completed lesson numbers
 */
const getCompletedLessons = async (enrollmentId) => {
  const result = await query(
    `SELECT lesson_number, completed_at, completed_by, notes,
            u.name as instructor_name
     FROM lesson_completions lc
     JOIN users u ON lc.completed_by = u.id
     WHERE lc.enrollment_id = $1
     ORDER BY lc.lesson_number ASC`,
    [enrollmentId]
  );

  return result.rows;
};

/**
 * Get student's progress for a course
 * @param {number} userId - The student user ID
 * @param {number} courseId - The course ID
 * @returns {Promise<Object>} Progress information
 */
const getStudentProgress = async (userId, courseId) => {
  const result = await query(
    `SELECT 
      e.id as enrollment_id,
      c.id as course_id,
      c.title as course_title,
      c.number_of_lessons as total_lessons,
      COUNT(lc.id)::INTEGER as completed_lessons,
      CASE 
        WHEN c.number_of_lessons > 0 
        THEN ROUND((COUNT(lc.id)::DECIMAL / c.number_of_lessons) * 100, 2)
        ELSE 0
      END as progress_percentage
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     LEFT JOIN lesson_completions lc ON e.id = lc.enrollment_id
     WHERE e.user_id = $1 AND e.course_id = $2
     GROUP BY e.id, c.id, c.title, c.number_of_lessons`,
    [userId, courseId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

/**
 * Get instructor's view of a student's progress across all courses
 * @param {number} instructorId - The instructor ID
 * @param {number} studentId - The student ID
 * @returns {Promise<Array>} Array of course progress
 */
const getInstructorStudentProgress = async (instructorId, studentId) => {
  const result = await query(
    `SELECT 
      e.id as enrollment_id,
      e.status as enrollment_status,
      e.enrolled_at,
      c.id as course_id,
      c.title as course_title,
      c.description as course_description,
      c.number_of_lessons as total_lessons,
      c.google_meet_link,
      COUNT(lc.id)::INTEGER as completed_lessons,
      CASE 
        WHEN c.number_of_lessons > 0 
        THEN ROUND((COUNT(lc.id)::DECIMAL / c.number_of_lessons) * 100, 2)
        ELSE 0
      END as progress_percentage,
      json_agg(
        json_build_object(
          'lesson_number', lc.lesson_number,
          'completed_at', lc.completed_at,
          'notes', lc.notes
        ) ORDER BY lc.lesson_number
      ) FILTER (WHERE lc.id IS NOT NULL) as completed_lesson_details
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     JOIN course_instructors ci ON c.id = ci.course_id
     LEFT JOIN lesson_completions lc ON e.id = lc.enrollment_id
     WHERE ci.instructor_id = $1 AND e.user_id = $2
     GROUP BY e.id, e.status, e.enrolled_at, c.id, c.title, c.description, c.number_of_lessons, c.google_meet_link
     ORDER BY e.enrolled_at DESC`,
    [instructorId, studentId]
  );

  return result.rows;
};

/**
 * Bulk mark multiple lessons as complete
 * @param {number} enrollmentId - The enrollment ID
 * @param {Array<number>} lessonNumbers - Array of lesson numbers to mark complete
 * @param {number} instructorId - The instructor marking them complete
 * @returns {Promise<Array>} Array of created completion records
 */
const bulkMarkLessonsComplete = async (enrollmentId, lessonNumbers, instructorId) => {
  console.log(`[bulkMarkLessonsComplete] Enrollment ${enrollmentId}, Lessons: ${lessonNumbers.join(', ')}, Instructor ${instructorId}`);

  // Verify access
  const accessCheck = await query(
    `SELECT e.id, c.number_of_lessons
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     JOIN course_instructors ci ON c.id = ci.course_id
     WHERE e.id = $1 AND ci.instructor_id = $2`,
    [enrollmentId, instructorId]
  );

  if (accessCheck.rows.length === 0) {
    throw new Error('Enrollment not found or you do not have access to this course');
  }

  const totalLessons = accessCheck.rows[0].number_of_lessons || 0;

  // Validate all lesson numbers
  for (const lessonNum of lessonNumbers) {
    if (lessonNum < 1 || (totalLessons > 0 && lessonNum > totalLessons)) {
      throw new Error(`Invalid lesson number ${lessonNum}. Must be between 1 and ${totalLessons}`);
    }
  }

  // Build values for bulk insert
  const values = lessonNumbers.map((_, idx) => 
    `($1, $${idx * 2 + 2}, $${idx * 2 + 3}, NOW())`
  ).join(', ');

  const params = [instructorId];
  lessonNumbers.forEach(num => {
    params.push(enrollmentId, num);
  });

  const result = await query(
    `INSERT INTO lesson_completions (completed_by, enrollment_id, lesson_number, completed_at)
     VALUES ${values}
     ON CONFLICT (enrollment_id, lesson_number) DO NOTHING
     RETURNING *`,
    params
  );

  console.log(`[bulkMarkLessonsComplete] ✅ Marked ${result.rows.length} lessons complete`);

  return result.rows;
};

module.exports = {
  markLessonComplete,
  unmarkLessonComplete,
  getCompletedLessons,
  getStudentProgress,
  getInstructorStudentProgress,
  bulkMarkLessonsComplete
};
