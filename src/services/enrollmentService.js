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
      e.enrolled_at,
      e.completed_at,
      u.name AS student_name,
      u.email AS student_email,
      u.phone AS student_phone,
      u.date_of_birth,
      u.grade,
      (SELECT COUNT(*) FROM lesson_progress lp 
       JOIN lessons l ON lp.lesson_id = l.id 
       JOIN sections s ON l.section_id = s.id
       WHERE lp.student_id = e.user_id AND s.course_id = e.course_id AND lp.status = 'completed') AS completed_lessons,
      (SELECT COUNT(*) FROM lessons l 
       JOIN sections s ON l.section_id = s.id
       WHERE s.course_id = e.course_id) AS total_lessons
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
  const validSortFields = ['enrolled_at', 'student_name', 'completed_at'];
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
      COUNT(*) FILTER (WHERE enrolled_at >= NOW() - INTERVAL '7 days') AS new_enrollments_week,
      COUNT(*) FILTER (WHERE enrolled_at >= NOW() - INTERVAL '30 days') AS new_enrollments_month
    FROM enrollments
    WHERE course_id = $1`,
    [course_id]
  );
  return result.rows[0];
};

// Get all students enrolled in any of the instructor's courses
const findStudentsByInstructor = async (instructor_id, filters = {}) => {
  const { search, sort_by = 'student_name', sort_order = 'asc', course_filter } = filters;
  
  // First, get all unique student-course pairs for this instructor
  let sql = `
    WITH student_courses AS (
      SELECT DISTINCT
        u.id AS student_id,
        u.name AS student_name,
        u.email AS student_email,
        u.phone AS student_phone,
        u.date_of_birth,
        u.grade,
        u.school,
        u.avatar_url,
        c.id AS course_id,
        c.title AS course_title,
        e.id AS enrollment_id,
        e.status AS enrollment_status,
        e.enrolled_at,
        e.completed_at
      FROM users u
      JOIN enrollments e ON u.id = e.user_id
      JOIN courses c ON e.course_id = c.id
      JOIN course_instructors ci ON c.id = ci.course_id
      WHERE ci.instructor_id = $1
        AND u.role = 'student'
  `;
  
  const params = [instructor_id];
  let paramIdx = 2;

  if (course_filter) {
    sql += ` AND c.id = $${paramIdx}`;
    params.push(course_filter);
    paramIdx++;
  }

  if (search) {
    sql += ` AND (LOWER(u.name) LIKE $${paramIdx} OR LOWER(u.email) LIKE $${paramIdx})`;
    params.push(`%${search.toLowerCase()}%`);
    paramIdx++;
  }

  sql += `
    )
    SELECT 
      student_id,
      student_name,
      student_email,
      student_phone,
      date_of_birth,
      grade,
      school,
      avatar_url,
      COUNT(DISTINCT course_id) AS total_courses_enrolled,
      json_agg(
        json_build_object(
          'course_id', course_id,
          'course_title', course_title,
          'enrollment_id', enrollment_id,
          'enrollment_status', enrollment_status,
          'enrolled_at', enrolled_at,
          'completed_at', completed_at
        ) ORDER BY enrolled_at DESC
      ) AS courses
    FROM student_courses
    GROUP BY student_id, student_name, student_email, student_phone, date_of_birth, grade, school, avatar_url
  `;

  // Add sorting
  const validSortFields = ['student_name', 'student_email', 'total_courses_enrolled'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'student_name';
  const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  
  if (sortField === 'student_name') {
    sql += ` ORDER BY student_name ${sortDirection}`;
  } else if (sortField === 'student_email') {
    sql += ` ORDER BY student_email ${sortDirection}`;
  } else if (sortField === 'total_courses_enrolled') {
    sql += ` ORDER BY total_courses_enrolled ${sortDirection}`;
  }

  const result = await query(sql, params);
  return result.rows;
};

// Get statistics about students for an instructor
const getInstructorStudentStats = async (instructor_id) => {
  const result = await query(
    `SELECT 
      COUNT(DISTINCT u.id) AS total_students,
      COUNT(DISTINCT CASE WHEN e.enrolled_at >= NOW() - INTERVAL '7 days' THEN u.id END) AS new_students_week,
      COUNT(DISTINCT CASE WHEN e.enrolled_at >= NOW() - INTERVAL '30 days' THEN u.id END) AS new_students_month,
      COUNT(DISTINCT c.id) AS total_courses
    FROM users u
    JOIN enrollments e ON u.id = e.user_id
    JOIN courses c ON e.course_id = c.id
    JOIN course_instructors ci ON c.id = ci.course_id
    WHERE ci.instructor_id = $1
      AND u.role = 'student'`,
    [instructor_id]
  );
  
  // Return default values if no data found
  if (!result.rows[0] || result.rows[0].total_students === '0') {
    return {
      total_students: 0,
      new_students_week: 0,
      new_students_month: 0,
      total_courses: 0
    };
  }
  
  return result.rows[0];
};

// Note: Slot-related functions have been removed.
// The system now uses lesson completions instead of time slots.
// See lessonCompletionService.js for the new implementation.

// Get student's enrolled courses for an instructor (only courses assigned to that instructor)
const getStudentEnrolledCoursesByInstructor = async (instructor_id, student_id) => {
  const result = await query(
    `SELECT 
      c.id AS course_id,
      c.title AS course_title,
      c.description AS course_description,
      c.google_meet_link,
      c.total_lessons,
      e.id AS enrollment_id,
      e.status AS enrollment_status,
      e.enrolled_at,
      COALESCE(e.manual_completed_lessons, 0) AS completed_lessons
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    JOIN course_instructors ci ON c.id = ci.course_id
    WHERE ci.instructor_id = $1
      AND e.user_id = $2
    ORDER BY e.enrolled_at DESC`,
    [instructor_id, student_id]
  );
  return result.rows;
};

// Update manual completed lessons for an enrollment
const updateManualCompletedLessons = async (enrollment_id, completed_lessons, instructor_id) => {
  // First verify the instructor has access to this enrollment
  const verifyResult = await query(
    `SELECT e.id, c.total_lessons
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     JOIN course_instructors ci ON c.id = ci.course_id
     WHERE e.id = $1 AND ci.instructor_id = $2`,
    [enrollment_id, instructor_id]
  );

  if (verifyResult.rows.length === 0) {
    const err = new Error('Access denied. You are not assigned to this course.');
    err.statusCode = 403;
    throw err;
  }

  const totalLessons = verifyResult.rows[0].total_lessons || 0;

  // Validate completed_lessons
  if (completed_lessons < 0) {
    const err = new Error('Completed lessons cannot be negative');
    err.statusCode = 400;
    throw err;
  }

  if (completed_lessons > totalLessons) {
    const err = new Error(`Completed lessons cannot exceed total lessons (${totalLessons})`);
    err.statusCode = 400;
    throw err;
  }

  // Update the enrollment
  const result = await query(
    `UPDATE enrollments 
     SET manual_completed_lessons = $1, 
         updated_at = NOW()
     WHERE id = $2
     RETURNING id, manual_completed_lessons, course_id, user_id`,
    [completed_lessons, enrollment_id]
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
  findStudentsByInstructor,
  getInstructorStudentStats,
  getStudentEnrolledCoursesByInstructor,
  updateManualCompletedLessons,
};
