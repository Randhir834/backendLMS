const { query } = require('../config/database');

const findLiveClassesByCourse = async (courseId) => {
  const result = await query(
    `SELECT lc.*, u.name AS created_by_name, u.email AS created_by_email
     FROM live_classes lc
     JOIN users u ON lc.created_by = u.id
     WHERE lc.course_id = $1 
     ORDER BY lc.scheduled_at ASC`,
    [courseId]
  );
  return result.rows;
};

const findUpcomingLiveClasses = async (studentId) => {
  const result = await query(
    `SELECT lc.*, c.title AS course_title, c.thumbnail_url, u.name AS instructor_name
     FROM live_classes lc
     JOIN enrollments e ON lc.course_id = e.course_id
     JOIN courses c ON lc.course_id = c.id
     LEFT JOIN users u ON lc.created_by = u.id
     WHERE e.user_id = $1 AND lc.scheduled_at > NOW() AND lc.status = 'scheduled'
     ORDER BY lc.scheduled_at ASC`,
    [studentId]
  );
  return result.rows;
};

const findLiveClassById = async (id) => {
  const result = await query(
    `SELECT lc.*, u.name AS created_by_name, u.email AS created_by_email
     FROM live_classes lc
     JOIN users u ON lc.created_by = u.id
     WHERE lc.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findLiveClassesByInstructor = async (instructorId, filters = {}) => {
  const { status, course_id, search } = filters;
  
  let sql = `
    SELECT lc.*, c.title AS course_title, u.name AS created_by_name
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

const createLiveClass = async ({ course_id, lesson_id, section_id, title, description, meet_link, scheduled_at, duration_minutes, created_by }) => {
  const result = await query(
    `INSERT INTO live_classes (course_id, lesson_id, section_id, title, description, meet_link, scheduled_at, duration_minutes, created_by) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
     RETURNING *`,
    [course_id, lesson_id, section_id, title, description, meet_link, scheduled_at, duration_minutes, created_by]
  );
  return result.rows[0];
};

const updateLiveClassById = async (id, data) => {
  const fields = [];
  const params = [];
  let paramIdx = 1;

  const allowedFields = ['title', 'description', 'meet_link', 'scheduled_at', 'duration_minutes', 'status', 'lesson_id', 'section_id'];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${paramIdx}`);
      params.push(data[field]);
      paramIdx++;
    }
  }

  if (fields.length === 0) {
    return findLiveClassById(id);
  }

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE live_classes SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    params
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

module.exports = {
  findLiveClassesByCourse,
  findUpcomingLiveClasses,
  findLiveClassById,
  findLiveClassesByInstructor,
  createLiveClass,
  updateLiveClassById,
  deleteLiveClassById,
  findCoursesWithLiveClassesByInstructor,
  findCoursesWithLiveClassesByStudent,
};
