const { query } = require('../config/database');

/**
 * Universal search service that searches across all entities
 * Optimized for performance with parallel queries and context-aware prioritization
 */

const searchAll = async (searchTerm, userRole = null, userId = null, searchContext = {}) => {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return {
      courses: [],
      lessons: [],
      assignments: [],
      quizzes: [],
      liveClasses: [],
      users: [],
      categories: [],
      enrollments: [],
      sections: [],
    };
  }

  const term = `%${searchTerm.toLowerCase()}%`;
  const phoneDigits = searchTerm.replace(/\D/g, '');
  const { type: contextType, id: contextId } = searchContext;
  
  // Execute all searches in parallel for better performance
  const searchPromises = [];

  // Search Courses
  const searchCourses = async () => {
    try {
      let courseSql = `
        SELECT DISTINCT c.id, c.title, c.description, c.thumbnail_url, c.price, c.status, c.level,
          c.duration_value, c.duration_unit, c.language, c.requirements, c.created_at,
          cat.name AS category_name, cat.id AS category_id,
          'course' AS result_type,
          CASE 
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND c.id = CAST($2 AS INTEGER) THEN 0
            WHEN $3 = 'course' THEN 1
            WHEN LOWER(c.title) LIKE $1 THEN 2
            WHEN LOWER(COALESCE(cat.name, '')) LIKE $1 THEN 3
            ELSE 4
          END AS priority
        FROM courses c
        LEFT JOIN categories cat ON c.category_id = cat.id
        WHERE (
          LOWER(c.title) LIKE $1 
          OR LOWER(COALESCE(c.description, '')) LIKE $1
          OR LOWER(COALESCE(c.level, '')) LIKE $1
          OR LOWER(COALESCE(c.language, '')) LIKE $1
          OR LOWER(COALESCE(c.requirements, '')) LIKE $1
          OR LOWER(COALESCE(cat.name, '')) LIKE $1
          OR CAST(c.id AS TEXT) LIKE $1
        )
      `;
      
      const params = [term, contextId?.toString() || null, contextType || null];
      
      if (userRole === 'student') {
        courseSql += " AND c.status = 'published'";
      } else if (userRole === 'instructor' && userId) {
        courseSql += ' AND EXISTS (SELECT 1 FROM course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = $4)';
        params.push(userId);
      }
      
      courseSql += `
        ORDER BY priority, c.created_at DESC
        LIMIT 30
      `;
      
      const result = await query(courseSql, params);
      return result.rows;
    } catch (err) {
      console.error('Error searching courses:', err);
      return [];
    }
  };
  
  searchPromises.push(searchCourses());

  // Search Sections
  const searchSections = async () => {
    try {
      let sectionSql = `
        SELECT s.id, s.title, s.description, s.course_id, s.sort_order, s.created_at,
          c.title AS course_title, c.status AS course_status,
          'section' AS result_type,
          CASE 
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND s.id = CAST($2 AS INTEGER) THEN 0
            WHEN $3 = 'section' THEN 1
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND s.course_id = CAST($2 AS INTEGER) THEN 2
            WHEN $3 = 'course' THEN 3
            WHEN LOWER(s.title) LIKE $1 THEN 4
            ELSE 5
          END AS priority
        FROM sections s
        JOIN courses c ON s.course_id = c.id
        WHERE (
          LOWER(s.title) LIKE $1 
          OR LOWER(COALESCE(s.description, '')) LIKE $1
          OR CAST(s.id AS TEXT) LIKE $1
        )
      `;
      
      const params = [term, contextId?.toString() || null, contextType || null];
      
      if (userRole === 'student') {
        sectionSql += " AND c.status = 'published'";
      }
      
      sectionSql += ' ORDER BY priority, s.created_at DESC LIMIT 20';
      
      const result = await query(sectionSql, params);
      return result.rows;
    } catch (err) {
      console.error('Error searching sections:', err);
      return [];
    }
  };
  
  searchPromises.push(searchSections());

  // Search Lessons
  const searchLessons = async () => {
    try {
      let lessonSql = `
        SELECT l.id, l.title, l.description, l.section_id, l.sort_order, l.duration_minutes,
          l.content_url, l.content_type, l.created_at,
          s.title AS section_title, s.course_id,
          c.title AS course_title, c.status AS course_status,
          'lesson' AS result_type,
          CASE 
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND l.id = CAST($2 AS INTEGER) THEN 0
            WHEN $3 = 'lesson' THEN 1
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND s.course_id = CAST($2 AS INTEGER) THEN 2
            WHEN $3 = 'course' THEN 3
            WHEN LOWER(l.title) LIKE $1 THEN 4
            ELSE 5
          END AS priority
        FROM lessons l
        JOIN sections s ON l.section_id = s.id
        JOIN courses c ON s.course_id = c.id
        WHERE (
          LOWER(l.title) LIKE $1 
          OR LOWER(COALESCE(l.description, '')) LIKE $1
          OR LOWER(COALESCE(l.content_type, '')) LIKE $1
          OR CAST(l.id AS TEXT) LIKE $1
        )
      `;
      
      const params = [term, contextId?.toString() || null, contextType || null];
      
      if (userRole === 'student') {
        lessonSql += " AND c.status = 'published'";
      }
      
      lessonSql += ' ORDER BY priority, l.created_at DESC LIMIT 20';
      
      const result = await query(lessonSql, params);
      return result.rows;
    } catch (err) {
      console.error('Error searching lessons:', err);
      return [];
    }
  };
  
  searchPromises.push(searchLessons());

  // Search Assignments
  const searchAssignments = async () => {
    try {
      let assignmentSql = `
        SELECT a.id, a.title, a.description, a.course_id, a.due_date, a.max_score, a.created_at,
          c.title AS course_title, c.status AS course_status,
          'assignment' AS result_type,
          CASE 
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND a.id = CAST($2 AS INTEGER) THEN 0
            WHEN $3 = 'assignment' THEN 1
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND a.course_id = CAST($2 AS INTEGER) THEN 2
            WHEN $3 = 'course' THEN 3
            WHEN LOWER(a.title) LIKE $1 THEN 4
            ELSE 5
          END AS priority
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        WHERE (
          LOWER(a.title) LIKE $1 
          OR LOWER(COALESCE(a.description, '')) LIKE $1
          OR CAST(a.id AS TEXT) LIKE $1
        )
      `;
      
      const params = [term, contextId?.toString() || null, contextType || null];
      
      if (userRole === 'student') {
        assignmentSql += " AND c.status = 'published'";
      }
      
      assignmentSql += ' ORDER BY priority, a.created_at DESC LIMIT 20';
      
      const result = await query(assignmentSql, params);
      return result.rows;
    } catch (err) {
      console.error('Error searching assignments:', err);
      return [];
    }
  };
  
  searchPromises.push(searchAssignments());

  // Search Quizzes
  const searchQuizzes = async () => {
    try {
      let quizSql = `
        SELECT q.id, q.title, q.description, q.course_id, q.time_limit_minutes, q.passing_score, q.created_at,
          c.title AS course_title, c.status AS course_status,
          'quiz' AS result_type,
          CASE 
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND q.id = CAST($2 AS INTEGER) THEN 0
            WHEN $3 = 'quiz' THEN 1
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND q.course_id = CAST($2 AS INTEGER) THEN 2
            WHEN $3 = 'course' THEN 3
            WHEN LOWER(q.title) LIKE $1 THEN 4
            ELSE 5
          END AS priority
        FROM quizzes q
        JOIN courses c ON q.course_id = c.id
        WHERE (
          LOWER(q.title) LIKE $1 
          OR LOWER(COALESCE(q.description, '')) LIKE $1
          OR CAST(q.id AS TEXT) LIKE $1
        )
      `;
      
      const params = [term, contextId?.toString() || null, contextType || null];
      
      if (userRole === 'student') {
        quizSql += " AND c.status = 'published'";
      }
      
      quizSql += ' ORDER BY priority, q.created_at DESC LIMIT 20';
      
      const result = await query(quizSql, params);
      return result.rows;
    } catch (err) {
      console.error('Error searching quizzes:', err);
      return [];
    }
  };
  
  searchPromises.push(searchQuizzes());

  // Search Live Classes
  const searchLiveClasses = async () => {
    try {
      let liveClassSql = `
        SELECT lc.id, lc.title, lc.description, lc.course_id, lc.scheduled_at, lc.duration_minutes, lc.meet_link,
          c.title AS course_title, c.status AS course_status,
          'live_class' AS result_type,
          CASE 
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND lc.id = CAST($2 AS INTEGER) THEN 0
            WHEN $3 = 'live_class' THEN 1
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND lc.course_id = CAST($2 AS INTEGER) THEN 2
            WHEN $3 = 'course' THEN 3
            WHEN LOWER(lc.title) LIKE $1 THEN 4
            ELSE 5
          END AS priority
        FROM live_classes lc
        JOIN courses c ON lc.course_id = c.id
        WHERE (
          LOWER(lc.title) LIKE $1 
          OR LOWER(COALESCE(lc.description, '')) LIKE $1
          OR CAST(lc.id AS TEXT) LIKE $1
        )
      `;
      
      const params = [term, contextId?.toString() || null, contextType || null];
      
      if (userRole === 'student') {
        liveClassSql += " AND c.status = 'published'";
      }
      
      liveClassSql += ' ORDER BY priority, lc.scheduled_at DESC LIMIT 20';
      
      const result = await query(liveClassSql, params);
      return result.rows;
    } catch (err) {
      console.error('Error searching live classes:', err);
      return [];
    }
  };
  
  searchPromises.push(searchLiveClasses());

  // Search Users (only for admin and instructor)
  const searchUsers = async () => {
    if (userRole !== 'admin' && userRole !== 'instructor') {
      return [];
    }
    
    try {
      let userSql = `
        SELECT id, name, email, role, phone, location, school, grade, 
          qualifications, specialization, created_at, avatar_url,
          'user' AS result_type,
          CASE 
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND id = CAST($2 AS INTEGER) THEN 0
            WHEN $3 IN ('user', 'student', 'instructor') THEN 1
            WHEN LOWER(name) LIKE $1 THEN 2
            WHEN LOWER(email) LIKE $1 THEN 3
            WHEN LOWER(COALESCE(phone, '')) LIKE $1 THEN 4
            ELSE 5
          END AS priority
        FROM users
        WHERE (
          LOWER(name) LIKE $1 
          OR LOWER(email) LIKE $1
          OR LOWER(COALESCE(phone, '')) LIKE $1
          OR LOWER(COALESCE(location, '')) LIKE $1
          OR LOWER(COALESCE(school, '')) LIKE $1
          OR LOWER(COALESCE(grade, '')) LIKE $1
          OR LOWER(COALESCE(qualifications, '')) LIKE $1
          OR LOWER(COALESCE(specialization, '')) LIKE $1
          OR LOWER(role) LIKE $1
          OR CAST(id AS TEXT) LIKE $1
      `;
      
      const params = [term, contextId?.toString() || null, contextType || null];
      
      if (phoneDigits.length > 0) {
        userSql += " OR REPLACE(REPLACE(REPLACE(COALESCE(phone, ''), '-', ''), ' ', ''), '+', '') LIKE $4";
        params.push(`%${phoneDigits}%`);
      }
      
      userSql += ')';
      
      // Instructors can only see students enrolled in their courses
      if (userRole === 'instructor' && userId) {
        userSql += `
          AND (
            role = 'student' 
            AND id IN (
              SELECT DISTINCT e.user_id 
              FROM enrollments e
              JOIN course_instructors ci ON ci.course_id = e.course_id
              WHERE ci.instructor_id = $4
            )
            OR id = $4
          )
        `;
        params.push(userId);
      }
      
      userSql += ' ORDER BY priority, created_at DESC LIMIT 30';
      
      const result = await query(userSql, params);
      return result.rows;
    } catch (err) {
      console.error('Error searching users:', err);
      return [];
    }
  };
  
  searchPromises.push(searchUsers());

  // Search Categories
  const searchCategories = async () => {
    try {
      const categorySql = `
        SELECT id, name, description, created_at,
          (SELECT COUNT(*) FROM courses WHERE category_id = categories.id) AS course_count,
          'category' AS result_type,
          CASE 
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND id = CAST($2 AS INTEGER) THEN 0
            WHEN $3 = 'category' THEN 1
            WHEN LOWER(name) LIKE $1 THEN 2
            ELSE 3
          END AS priority
        FROM categories
        WHERE (
          LOWER(name) LIKE $1 
          OR LOWER(COALESCE(description, '')) LIKE $1
          OR CAST(id AS TEXT) LIKE $1
        )
        ORDER BY priority, name ASC
        LIMIT 20
      `;
      
      const result = await query(categorySql, [term, contextId?.toString() || null, contextType || null]);
      return result.rows;
    } catch (err) {
      console.error('Error searching categories:', err);
      return [];
    }
  };
  
  searchPromises.push(searchCategories());

  // Search Enrollments (only for admin and instructor)
  const searchEnrollments = async () => {
    if (userRole !== 'admin' && userRole !== 'instructor') {
      return [];
    }
    
    try {
      let enrollmentSql = `
        SELECT e.id, e.user_id, e.course_id, e.status, e.enrolled_at, e.progress,
          u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
          c.title AS course_title,
          'enrollment' AS result_type,
          CASE 
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND e.id = CAST($2 AS INTEGER) THEN 0
            WHEN $3 = 'enrollment' THEN 1
            WHEN CAST($2 AS INTEGER) IS NOT NULL AND e.course_id = CAST($2 AS INTEGER) THEN 2
            WHEN $3 = 'course' THEN 3
            WHEN LOWER(u.name) LIKE $1 THEN 4
            ELSE 5
          END AS priority
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        WHERE (
          LOWER(u.name) LIKE $1
          OR LOWER(u.email) LIKE $1
          OR LOWER(c.title) LIKE $1
          OR LOWER(e.status) LIKE $1
          OR CAST(e.id AS TEXT) LIKE $1
          OR LOWER(COALESCE(u.phone, '')) LIKE $1
      `;
      
      const params = [term, contextId?.toString() || null, contextType || null];
      
      if (phoneDigits.length > 0) {
        enrollmentSql += " OR REPLACE(REPLACE(REPLACE(COALESCE(u.phone, ''), '-', ''), ' ', ''), '+', '') LIKE $4";
        params.push(`%${phoneDigits}%`);
      }
      
      enrollmentSql += ')';
      
      if (userRole === 'instructor' && userId) {
        enrollmentSql += `
          AND c.id IN (
            SELECT course_id FROM course_instructors WHERE instructor_id = $4
          )
        `;
        params.push(userId);
      }
      
      enrollmentSql += ' ORDER BY priority, e.enrolled_at DESC LIMIT 20';
      
      const result = await query(enrollmentSql, params);
      return result.rows;
    } catch (err) {
      console.error('Error searching enrollments:', err);
      return [];
    }
  };
  
  searchPromises.push(searchEnrollments());

  // Execute all searches in parallel and wait for results
  const [
    courses,
    sections,
    lessons,
    assignments,
    quizzes,
    liveClasses,
    users,
    categories,
    enrollments
  ] = await Promise.all(searchPromises);

  return {
    courses,
    sections,
    lessons,
    assignments,
    quizzes,
    liveClasses,
    users,
    categories,
    enrollments
  };
};

/**
 * Search courses with filters
 */
const searchCourses = async (searchTerm, filters = {}) => {
  const { status, category_id, instructor_id } = filters;
  const term = `%${searchTerm.toLowerCase()}%`;
  
  let sql = `
    SELECT c.*, cat.name AS category_name
    FROM courses c
    LEFT JOIN categories cat ON c.category_id = cat.id
    WHERE (LOWER(c.title) LIKE $1 OR LOWER(COALESCE(c.description, '')) LIKE $1)
  `;
  
  const conditions = [];
  const params = [term];
  let paramIdx = 2;

  if (status) {
    conditions.push(`c.status = $${paramIdx++}`);
    params.push(status);
  }
  if (category_id) {
    conditions.push(`c.category_id = $${paramIdx++}`);
    params.push(category_id);
  }
  if (instructor_id) {
    conditions.push(`EXISTS (SELECT 1 FROM course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = $${paramIdx++})`);
    params.push(instructor_id);
  }

  if (conditions.length > 0) {
    sql += ' AND ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY c.created_at DESC';

  const result = await query(sql, params);
  return result.rows;
};

module.exports = {
  searchAll,
  searchCourses,
};