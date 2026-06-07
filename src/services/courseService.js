const { query } = require('../config/database');

const findAllCourses = async (filters = {}) => {
  const { status, category_id, instructor_id, search, level, price_range, sort_by = 'created_at', sort_order = 'desc' } = filters;
  
  let sql = `
    SELECT c.*, cat.name AS category_name,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count,
      COALESCE(
        json_agg(
          json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'is_primary', ci.is_primary)
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]'
      ) AS instructors
    FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN course_instructors ci ON ci.course_id = c.id
    LEFT JOIN users u ON ci.instructor_id = u.id
  `;
  
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (search) {
    conditions.push(`(LOWER(c.title) LIKE $${paramIdx} OR LOWER(c.description) LIKE $${paramIdx})`);
    params.push(`%${search.toLowerCase()}%`);
    paramIdx++;
  }
  
  if (status) {
    conditions.push(`c.status = $${paramIdx}`);
    params.push(status);
    paramIdx++;
  }
  
  if (category_id) {
    conditions.push(`c.category_id = $${paramIdx}`);
    params.push(category_id);
    paramIdx++;
  }
  
  if (instructor_id) {
    conditions.push(`ci.instructor_id = $${paramIdx}`);
    params.push(instructor_id);
    paramIdx++;
  }
  
  if (level) {
    conditions.push(`c.level = $${paramIdx}`);
    params.push(level);
    paramIdx++;
  }
  
  if (price_range) {
    if (price_range === 'free') {
      conditions.push('c.price = 0');
    } else if (price_range.includes('-')) {
      const [min, max] = price_range.split('-').map(p => parseFloat(p));
      if (max) {
        conditions.push(`c.price >= $${paramIdx} AND c.price <= $${paramIdx + 1}`);
        params.push(min, max);
        paramIdx += 2;
      } else {
        conditions.push(`c.price >= $${paramIdx}`);
        params.push(min);
        paramIdx++;
      }
    } else if (price_range.endsWith('+')) {
      const min = parseFloat(price_range.replace('+', ''));
      conditions.push(`c.price >= $${paramIdx}`);
      params.push(min);
      paramIdx++;
    }
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' GROUP BY c.id, cat.name';

  // Add sorting
  const validSortFields = ['created_at', 'title', 'price', 'enrollment_count'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  
  if (sortField === 'enrollment_count') {
    sql += ` ORDER BY enrollment_count ${sortDirection}, c.created_at DESC`;
  } else {
    sql += ` ORDER BY c.${sortField} ${sortDirection}`;
  }

  const result = await query(sql, params);
  return result.rows;
};

const findPublishedCourses = async (filters = {}) => {
  return findAllCourses({ ...filters, status: 'published' });
};

const findCourseById = async (id) => {
  const result = await query(
    `SELECT c.*, cat.name AS category_name,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count,
      COALESCE(
        json_agg(
          json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'is_primary', ci.is_primary)
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]'
      ) AS instructors
    FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN course_instructors ci ON ci.course_id = c.id
    LEFT JOIN users u ON ci.instructor_id = u.id
    WHERE c.id = $1
    GROUP BY c.id, cat.name`,
    [id]
  );
  return result.rows[0] || null;
};

const findCoursesByInstructor = async (instructorId, filters = {}) => {
  const { search, status, level, sort_by = 'created_at', sort_order = 'desc' } = filters;
  
  let sql = `
    SELECT c.*, cat.name AS category_name,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count,
      COALESCE(
        json_agg(
          json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'is_primary', ci2.is_primary)
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]'
      ) AS instructors
    FROM courses c
    INNER JOIN course_instructors ci ON ci.course_id = c.id
    LEFT JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN course_instructors ci2 ON ci2.course_id = c.id
    LEFT JOIN users u ON ci2.instructor_id = u.id
    WHERE ci.instructor_id = $1
  `;
  
  const conditions = [];
  const params = [instructorId];
  let paramIdx = 2;

  if (search) {
    conditions.push(`(LOWER(c.title) LIKE $${paramIdx} OR LOWER(c.description) LIKE $${paramIdx})`);
    params.push(`%${search.toLowerCase()}%`);
    paramIdx++;
  }
  
  if (status) {
    conditions.push(`c.status = $${paramIdx}`);
    params.push(status);
    paramIdx++;
  }
  
  if (level) {
    conditions.push(`c.level = $${paramIdx}`);
    params.push(level);
    paramIdx++;
  }

  if (conditions.length > 0) {
    sql += ' AND ' + conditions.join(' AND ');
  }

  sql += ' GROUP BY c.id, cat.name';

  // Add sorting
  const validSortFields = ['created_at', 'title', 'price', 'enrollment_count'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortDirection = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  
  if (sortField === 'enrollment_count') {
    sql += ` ORDER BY enrollment_count ${sortDirection}, c.created_at DESC`;
  } else {
    sql += ` ORDER BY c.${sortField} ${sortDirection}`;
  }

  const result = await query(sql, params);
  return result.rows;
};

const createNewCourse = async ({
  title, description, price, thumbnail_url, category_id, status,
  duration_value, duration_unit, level, language, what_you_learn, requirements,
  instructor_ids
}) => {
  const result = await query(
    `INSERT INTO courses (title, description, price, thumbnail_url, category_id, status,
      duration_value, duration_unit, level, language, what_you_learn, requirements)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [title, description, price, thumbnail_url, category_id, status || 'published',
     duration_value || 0, duration_unit || 'days', level || 'beginner', language || 'English',
     what_you_learn, requirements]
  );

  const course = result.rows[0];

  if (instructor_ids && instructor_ids.length > 0) {
    await assignInstructors(course.id, instructor_ids);
  }

  return findCourseById(course.id);
};

const updateCourseById = async (id, data) => {
  const fields = [];
  const params = [];
  let paramIdx = 1;

  const allowedFields = [
    'title', 'description', 'price', 'thumbnail_url', 'category_id', 'status',
    'duration_value', 'duration_unit', 'level', 'language', 'what_you_learn', 'requirements'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${paramIdx}`);
      params.push(data[field]);
      paramIdx++;
    }
  }

  if (fields.length === 0 && data.instructor_ids === undefined) {
    return findCourseById(id);
  }

  if (fields.length > 0) {
    fields.push(`updated_at = NOW()`);
    params.push(id);
    await query(
      `UPDATE courses SET ${fields.join(', ')} WHERE id = $${paramIdx}`,
      params
    );
  }

  if (data.instructor_ids !== undefined) {
    await query('DELETE FROM course_instructors WHERE course_id = $1', [id]);
    if (data.instructor_ids.length > 0) {
      await assignInstructors(id, data.instructor_ids);
    }
  }

  return findCourseById(id);
};

const deleteCourseById = async (id) => {
  await query('DELETE FROM courses WHERE id = $1', [id]);
};

const assignInstructors = async (courseId, instructorIds) => {
  const values = instructorIds.map((instId, index) => {
    const isPrimary = index === 0;
    return `(${courseId}, ${instId}, ${isPrimary})`;
  }).join(', ');

  await query(
    `INSERT INTO course_instructors (course_id, instructor_id, is_primary) VALUES ${values}
    ON CONFLICT (course_id, instructor_id) DO NOTHING`
  );
};

const removeInstructor = async (courseId, instructorId) => {
  await query(
    'DELETE FROM course_instructors WHERE course_id = $1 AND instructor_id = $2',
    [courseId, instructorId]
  );
};

const getEnrollmentCount = async (courseId) => {
  const result = await query(
    'SELECT COUNT(*) AS count FROM enrollments WHERE course_id = $1',
    [courseId]
  );
  return parseInt(result.rows[0].count, 10);
};

module.exports = {
  findAllCourses,
  findPublishedCourses,
  findCourseById,
  findCoursesByInstructor,
  createNewCourse,
  updateCourseById,
  deleteCourseById,
  assignInstructors,
  removeInstructor,
  getEnrollmentCount,
};