const { query } = require('../config/database');

const findLiveClassesByCourse = async (courseId) => {
  const result = await query(
    'SELECT * FROM live_classes WHERE course_id = $1 ORDER BY scheduled_at ASC',
    [courseId]
  );
  return result.rows;
};

const findUpcomingLiveClasses = async (studentId) => {
  const result = await query(
    `SELECT lc.*, c.title AS course_title FROM live_classes lc
     JOIN enrollments e ON lc.course_id = e.course_id
     JOIN courses c ON lc.course_id = c.id
     WHERE e.user_id = $1 AND lc.scheduled_at > NOW()
     ORDER BY lc.scheduled_at ASC`,
    [studentId]
  );
  return result.rows;
};

// Get all live classes for enrolled student (including past, ongoing, and future classes)
const findAllLiveClassesForStudent = async (studentId) => {
  const result = await query(
    `SELECT lc.*, 
            c.title AS course_title, 
            c.thumbnail_url, 
            u.name AS instructor_name,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = lc.course_id AND e.status = 'active') AS enrolled_count
     FROM live_classes lc
     JOIN enrollments e ON lc.course_id = e.course_id
     JOIN courses c ON lc.course_id = c.id
     LEFT JOIN users u ON lc.created_by = u.id
     WHERE e.user_id = $1 AND e.status = 'active'
     ORDER BY lc.scheduled_at DESC`,
    [studentId]
  );
  return result.rows;
};

const findLiveClassById = async (id) => {
  const result = await query(
    `SELECT lc.*, 
            c.title AS course_title, 
            c.description AS course_description,
            c.thumbnail_url,
            u.name AS instructor_name, 
            u.email AS instructor_email,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = lc.course_id AND e.status = 'active') AS enrolled_count
     FROM live_classes lc
     JOIN courses c ON lc.course_id = c.id
     JOIN users u ON lc.created_by = u.id
     WHERE lc.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findLiveClassesByInstructor = async (instructorId, filters = {}) => {
  const { status, course_id, search } = filters;
  
  let sql = `
    SELECT lc.*, 
           c.title AS course_title, 
           c.thumbnail_url,
           u.name AS instructor_name,
           (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = lc.course_id AND e.status = 'active') AS enrolled_count
    FROM live_classes lc
    JOIN courses c ON lc.course_id = c.id
    JOIN course_instructors ci ON c.id = ci.course_id
    JOIN users u ON lc.created_by = u.id
    WHERE ci.instructor_id = $1
  `;
  
  const params = [instructorId];
  let paramIdx = 2;

  if (status) {
    sql += ` AND lc.status = $${paramIdx}`;
    params.push(status);
    paramIdx++;
  }

  if (course_id) {
    sql += ` AND lc.course_id = $${paramIdx}`;
    params.push(course_id);
    paramIdx++;
  }

  if (search) {
    sql += ` AND (LOWER(lc.title) LIKE $${paramIdx} OR LOWER(c.title) LIKE $${paramIdx})`;
    params.push(`%${search.toLowerCase()}%`);
    paramIdx++;
  }

  sql += ` ORDER BY lc.scheduled_at DESC`;

  const result = await query(sql, params);
  return result.rows;
};

const createLiveClass = async (data) => {
  const { course_id, title, description, meet_link, scheduled_at, duration_minutes, end_time, created_by } = data;
  
  const result = await query(
    'INSERT INTO live_classes (course_id, title, description, meet_link, scheduled_at, duration_minutes, created_by, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
    [course_id, title, description || null, meet_link, scheduled_at, duration_minutes || 60, created_by, 'scheduled']
  );
  return result.rows[0];
};

const updateLiveClassById = async (id, data) => {
  const result = await query(
    'UPDATE live_classes SET title = COALESCE($1, title), description = COALESCE($2, description), meet_link = COALESCE($3, meet_link), scheduled_at = COALESCE($4, scheduled_at), duration_minutes = COALESCE($5, duration_minutes), status = COALESCE($6, status), updated_at = NOW() WHERE id = $7 RETURNING *',
    [data.title, data.description, data.meet_link, data.scheduled_at, data.duration_minutes, data.status, id]
  );
  return result.rows[0];
};

const deleteLiveClassById = async (id) => {
  await query('DELETE FROM live_classes WHERE id = $1', [id]);
};

// Get courses with their live classes for instructors
const findCoursesWithLiveClassesByInstructor = async (instructorId) => {
  const result = await query(
    `SELECT 
      c.id AS course_id,
      c.title AS course_title,
      c.description AS course_description,
      c.thumbnail_url,
      c.status AS course_status,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count,
      COALESCE(
        json_agg(
          json_build_object(
            'id', lc.id,
            'title', lc.title,
            'description', lc.description,
            'meet_link', lc.meet_link,
            'scheduled_at', lc.scheduled_at,
            'duration_minutes', lc.duration_minutes,
            'status', lc.status,
            'created_at', lc.created_at
          ) ORDER BY lc.scheduled_at DESC
        ) FILTER (WHERE lc.id IS NOT NULL),
        '[]'
      ) AS live_classes
    FROM courses c
    INNER JOIN course_instructors ci ON ci.course_id = c.id
    LEFT JOIN live_classes lc ON lc.course_id = c.id
    WHERE ci.instructor_id = $1
    GROUP BY c.id
    ORDER BY c.created_at DESC`,
    [instructorId]
  );
  return result.rows;
};

// Get enrolled courses with their live classes for students
const findCoursesWithLiveClassesByStudent = async (studentId) => {
  const result = await query(
    `SELECT 
      c.id AS course_id,
      c.title AS course_title,
      c.description AS course_description,
      c.thumbnail_url,
      e.progress,
      e.status AS enrollment_status,
      COALESCE(
        json_agg(
          json_build_object(
            'id', lc.id,
            'title', lc.title,
            'description', lc.description,
            'meet_link', lc.meet_link,
            'scheduled_at', lc.scheduled_at,
            'duration_minutes', lc.duration_minutes,
            'status', lc.status,
            'instructor_name', u.name,
            'created_at', lc.created_at
          ) ORDER BY lc.scheduled_at ASC
        ) FILTER (WHERE lc.id IS NOT NULL AND lc.scheduled_at > NOW()),
        '[]'
      ) AS live_classes
    FROM enrollments e
    INNER JOIN courses c ON e.course_id = c.id
    LEFT JOIN live_classes lc ON lc.course_id = c.id
    LEFT JOIN users u ON lc.created_by = u.id
    WHERE e.user_id = $1 AND e.status = 'active'
    GROUP BY c.id, e.progress, e.status
    ORDER BY c.title ASC`,
    [studentId]
  );
  return result.rows;
};

// Get enrolled students for a live class
const findEnrolledStudentsForLiveClass = async (liveClassId) => {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.avatar_url
     FROM users u
     JOIN enrollments e ON u.id = e.user_id
     JOIN live_classes lc ON e.course_id = lc.course_id
     WHERE lc.id = $1 AND e.status = 'active' AND u.role = 'student'
     ORDER BY u.name ASC`,
    [liveClassId]
  );
  return result.rows;
};

// Get all live classes for admin (platform-wide) with optional filters
const findAllLiveClasses = async (filters = {}) => {
  const { course_id, instructor_id } = filters;
  
  let sql = `
    SELECT lc.*, 
           c.title AS course_title, 
           c.thumbnail_url,
           u.name AS instructor_name,
           u.id AS instructor_id,
           (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = lc.course_id AND e.status = 'active') AS enrolled_count
    FROM live_classes lc
    JOIN courses c ON lc.course_id = c.id
    JOIN users u ON lc.created_by = u.id
    WHERE 1=1
  `;
  
  const params = [];
  let paramIdx = 1;

  if (course_id) {
    sql += ` AND lc.course_id = $${paramIdx}`;
    params.push(course_id);
    paramIdx++;
  }

  if (instructor_id) {
    sql += ` AND lc.created_by = $${paramIdx}`;
    params.push(instructor_id);
    paramIdx++;
  }

  sql += ` ORDER BY lc.scheduled_at DESC`;

  const result = await query(sql, params);
  return result.rows;
};

// Get all courses that have live classes scheduled (for filter dropdown)
const findCoursesForFilter = async () => {
  const result = await query(
    `SELECT DISTINCT c.id, c.title
     FROM courses c
     INNER JOIN live_classes lc ON c.id = lc.course_id
     ORDER BY c.title ASC`
  );
  return result.rows;
};

// Get all instructors who have created live classes (for filter dropdown)
const findInstructorsForFilter = async () => {
  const result = await query(
    `SELECT DISTINCT u.id, u.name
     FROM users u
     INNER JOIN live_classes lc ON u.id = lc.created_by
     WHERE u.role = 'instructor'
     ORDER BY u.name ASC`
  );
  return result.rows;
};

module.exports = {
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
};
