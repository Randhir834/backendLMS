const { query } = require('../config/database');

const updateLessonProgress = async ({ lesson_id, student_id, status }) => {
  const result = await query(
    `INSERT INTO lesson_progress (lesson_id, student_id, status, completed_at)
     VALUES ($1, $2, $3, CASE WHEN $3 = 'completed' THEN NOW() ELSE NULL END)
     ON CONFLICT (lesson_id, student_id)
     DO UPDATE SET status = $3, completed_at = CASE WHEN $3 = 'completed' THEN NOW() ELSE lesson_progress.completed_at END, updated_at = NOW()
     RETURNING *`,
    [lesson_id, student_id, status]
  );
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
