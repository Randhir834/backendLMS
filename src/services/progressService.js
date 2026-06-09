const { query } = require('../config/database');

// Helper function to get course_id from lesson_id
const getCourseIdFromLesson = async (lesson_id) => {
  const result = await query(
    `SELECT s.course_id FROM lessons l
     JOIN sections s ON l.section_id = s.id
     WHERE l.id = $1`,
    [lesson_id]
  );
  return result.rows[0]?.course_id;
};

// Helper function to create certificate if course is complete
const createCertificateIfCourseComplete = async (student_id, course_id) => {
  try {
    const { percentage } = await getCourseProgressPercentage(student_id, course_id);
    
    if (percentage === 100) {
      // Check if certificate already exists
      const existing = await query(
        'SELECT id FROM certificates WHERE user_id = $1 AND course_id = $2',
        [student_id, course_id]
      );

      if (existing.rows.length === 0) {
        // Get enrollment for this user-course
        const enrollment = await query(
          'SELECT id, user_id, course_id FROM enrollments WHERE user_id = $1 AND course_id = $2',
          [student_id, course_id]
        );

        if (enrollment.rows.length > 0) {
          const enrollmentId = enrollment.rows[0].id;
          const { createCertificate } = require('./certificateService');
          await createCertificate({
            user_id: student_id,
            course_id,
            enrollment_id: enrollmentId,
          });
        }
      }

      // Update enrollment to mark as completed
      await query(
        'UPDATE enrollments SET status = $1, progress = 100, completed_at = NOW() WHERE user_id = $2 AND course_id = $3',
        ['completed', student_id, course_id]
      );
    } else {
      // Update progress in enrollment
      await query(
        'UPDATE enrollments SET progress = $1 WHERE user_id = $2 AND course_id = $3',
        [percentage, student_id, course_id]
      );
    }
  } catch (error) {
    console.error('Error creating certificate or updating enrollment:', error);
  }
};

const updateLessonProgress = async ({ lesson_id, student_id, status }) => {
  const result = await query(
    `INSERT INTO lesson_progress (lesson_id, student_id, status, completed_at)
     VALUES ($1, $2, $3, CASE WHEN $3 = 'completed' THEN NOW() ELSE NULL END)
     ON CONFLICT (lesson_id, student_id)
     DO UPDATE SET status = $3, completed_at = CASE WHEN $3 = 'completed' THEN NOW() ELSE lesson_progress.completed_at END, updated_at = NOW()
     RETURNING *`,
    [lesson_id, student_id, status]
  );

  // If lesson was completed, check if course is now complete and create certificate
  if (status === 'completed') {
    const courseId = await getCourseIdFromLesson(lesson_id);
    if (courseId) {
      await createCertificateIfCourseComplete(student_id, courseId);
    }
  }

  return result.rows[0];
};

const findProgressByStudentAndCourse = async (studentId, courseId) => {
  const result = await query(
    `SELECT lp.*, l.title AS lesson_title, s.title AS section_title
     FROM lesson_progress lp
     JOIN lessons l ON lp.lesson_id = l.id
     JOIN sections s ON l.section_id = s.id
     JOIN courses c ON s.course_id = c.id
     WHERE lp.student_id = $1 AND c.id = $2
     ORDER BY s.sort_order, l.sort_order`,
    [studentId, courseId]
  );
  return result.rows;
};

const getCourseProgressPercentage = async (studentId, courseId) => {
  const totalResult = await query(
    `SELECT COUNT(*) AS total FROM lessons l
     JOIN sections s ON l.section_id = s.id
     WHERE s.course_id = $1`,
    [courseId]
  );
  const completedResult = await query(
    `SELECT COUNT(*) AS completed FROM lesson_progress lp
     JOIN lessons l ON lp.lesson_id = l.id
     JOIN sections s ON l.section_id = s.id
     WHERE s.course_id = $1 AND lp.student_id = $2 AND lp.status = 'completed'`,
    [courseId, studentId]
  );
  const total = parseInt(totalResult.rows[0].total, 10);
  const completed = parseInt(completedResult.rows[0].completed, 10);
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percentage };
};

module.exports = { updateLessonProgress, findProgressByStudentAndCourse, getCourseProgressPercentage };
