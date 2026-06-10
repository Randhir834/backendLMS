const { query } = require('../config/database');

const createEnrollment = async ({ user_id, course_id }) => {
  const existing = await query(
    'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [user_id, course_id]
  );
  if (existing.rows.length > 0) {
    const err = new Error('Already enrolled in this course');
    err.statusCode = 409;
    throw err;
  }

  const course = await query(
    "SELECT id, status FROM courses WHERE id = $1",
    [course_id]
  );
  if (!course.rows[0]) {
    const err = new Error('Course not found');
    err.statusCode = 404;
    throw err;
  }
  if (course.rows[0].status !== 'published') {
    const err = new Error('Course is not available for enrollment');
    err.statusCode = 400;
    throw err;
  }

  const result = await query(
    'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2) RETURNING *',
    [user_id, course_id]
  );
  return result.rows[0];
};

const findEnrollmentsByUser = async (user_id) => {
  const result = await query(
    `SELECT e.*, c.title AS course_title, c.description AS course_description,
      c.thumbnail_url, c.price, c.duration_value, c.duration_unit, c.level, c.status AS course_status,
      COALESCE(
        json_agg(
          json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'is_primary', ci.is_primary)
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]'
      ) AS instructors
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    LEFT JOIN course_instructors ci ON ci.course_id = c.id
    LEFT JOIN users u ON ci.instructor_id = u.id
    WHERE e.user_id = $1
    GROUP BY e.id, c.id
    ORDER BY e.created_at DESC`,
    [user_id]
  );
  return result.rows;
};

const findEnrollmentById = async (id) => {
  const result = await query(
    `SELECT e.*, c.title AS course_title, c.description AS course_description,
      c.thumbnail_url, c.price, c.duration_value, c.duration_unit, c.level,
      COALESCE(
        json_agg(
          json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'is_primary', ci.is_primary)
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]'
      ) AS instructors
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    LEFT JOIN course_instructors ci ON ci.course_id = c.id
    LEFT JOIN users u ON ci.instructor_id = u.id
    WHERE e.id = $1
    GROUP BY e.id, c.id`,
    [id]
  );
  return result.rows[0] || null;
};

const findEnrollmentByUserAndCourse = async (user_id, course_id) => {
  const result = await query(
    'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
    [user_id, course_id]
  );
  return result.rows[0] || null;
};

const findAllEnrollments = async () => {
  const result = await query(
    `SELECT e.*, u.name AS student_name, u.email AS student_email,
      c.title AS course_title, c.price AS course_price
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    JOIN courses c ON e.course_id = c.id
    ORDER BY e.created_at DESC`
  );
  return result.rows;
};

const findStudentsByCourse = async (course_id) => {
  const result = await query(
    'SELECT user_id FROM enrollments WHERE course_id = $1',
    [course_id]
  );
  return result.rows.map(row => row.user_id);
};

// Get detailed enrollments for a course (for instructors)
const findCourseEnrollments = async (course_id, filters = {}) => {
  const { status, search, sort_by = 'enrolled_at', sort_order = 'desc' } = filters;
  
  let sql = `
    SELECT 
      e.id,
      e.user_id,
      e.course_id,
      e.status,
      e.progress,
      e.enrolled_at,
      e.completed_at,
      u.name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      u.date_of_birth,
      u.grade,
      (SELECT COUNT(*) FROM lesson_progress lp 
       JOIN lessons l ON lp.lesson_id = l.id 
       WHERE lp.student_id = e.user_id AND l.course_id = e.course_id AND lp.status = 'completed') AS completed_lessons,
      (SELECT COUNT(*) FROM lessons l 
       WHERE l.course_id = e.course_id) AS total_lessons
    FROM enrollments e
    JOIN users u ON e.user_id = u.id
    WHERE e.course_id = $1
  `;
  
  const params = [course_id];
  let paramIdx = 2;

  if (status) {
    sql += ` AND e.status = $${paramIdx}`;
    params.push(status);
    paramIdx++;
  }

  if (search) {
    sql += ` AND (LOWER(u.name) LIKE $${paramIdx} OR LOWER(u.email) LIKE $${paramIdx})`;
    params.push(`%${search.toLowerCase()}%`);
    paramIdx++;
  }

  // Add sorting
  const validSortFields = ['enrolled_at', 'progress', 'student_name', 'completed_at'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'enrolled_at';
  const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  
  if (sortField === 'student_name') {
    sql += ` ORDER BY u.name ${sortDirection}`;
  } else if (sortField === 'enrolled_at') {
    sql += ` ORDER BY e.enrolled_at ${sortDirection}`;
  } else {
    sql += ` ORDER BY e.${sortField} ${sortDirection}`;
  }

  const result = await query(sql, params);
  return result.rows;
};

// Get enrollment statistics for a course
const getCourseEnrollmentStats = async (course_id) => {
  const result = await query(
    `SELECT 
      COUNT(*) AS total_students,
      COUNT(*) FILTER (WHERE status = 'active') AS active_students,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_students,
      COUNT(*) FILTER (WHERE progress = 100) AS students_completed_course,
      ROUND(AVG(progress), 2) AS average_progress,
      COUNT(*) FILTER (WHERE enrolled_at >= NOW() - INTERVAL '7 days') AS new_enrollments_week,
      COUNT(*) FILTER (WHERE enrolled_at >= NOW() - INTERVAL '30 days') AS new_enrollments_month
    FROM enrollments
    WHERE course_id = $1`,
    [course_id]
  );
  return result.rows[0];
};

module.exports = {
  createEnrollment,
  findEnrollmentsByUser,
  findEnrollmentById,
  findEnrollmentByUserAndCourse,
  findAllEnrollments,
  findStudentsByCourse,
  findCourseEnrollments,
  getCourseEnrollmentStats,
};
