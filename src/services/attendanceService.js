const { query } = require('../config/database');

const getInstructorCourses = async (instructorId) => {
  const result = await query(
    `SELECT c.*, cat.name AS category_name,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') AS enrolled_students
    FROM courses c
    INNER JOIN course_instructors ci ON ci.course_id = c.id
    LEFT JOIN categories cat ON c.category_id = cat.id
    WHERE ci.instructor_id = $1 AND c.status = 'published'
    ORDER BY c.title`,
    [instructorId]
  );
  return result.rows;
};

const getCourseStudents = async (courseId) => {
  const result = await query(
    `SELECT u.id, u.name, u.email, e.enrolled_at, e.progress
    FROM users u
    INNER JOIN enrollments e ON e.user_id = u.id
    WHERE e.course_id = $1 AND e.status = 'active' AND u.role = 'student'
    ORDER BY u.name`,
    [courseId]
  );
  return result.rows;
};

const getAttendanceForDate = async (courseId, date) => {
  const result = await query(
    `SELECT a.*, u.name as student_name, u.email as student_email
    FROM attendance a
    INNER JOIN users u ON a.student_id = u.id
    WHERE a.course_id = $1 AND a.date = $2
    ORDER BY u.name`,
    [courseId, date]
  );
  return result.rows;
};

const markAttendance = async (attendanceData) => {
  const { course_id, instructor_id, date, students } = attendanceData;
  
  // First, delete existing attendance for this course and date
  await query(
    'DELETE FROM attendance WHERE course_id = $1 AND date = $2',
    [course_id, date]
  );
  
  // Insert new attendance records
  const values = students.map((student, index) => {
    const paramStart = index * 6 + 1;
    return `($${paramStart}, $${paramStart + 1}, $${paramStart + 2}, $${paramStart + 3}, $${paramStart + 4}, $${paramStart + 5})`;
  }).join(', ');
  
  const params = students.flatMap(student => [
    course_id,
    student.student_id,
    instructor_id,
    date,
    student.status,
    student.notes || null
  ]);
  
  if (students.length > 0) {
    await query(
      `INSERT INTO attendance (course_id, student_id, instructor_id, date, status, notes) 
       VALUES ${values}`,
      params
    );
  }
  
  return { success: true, message: 'Attendance marked successfully' };
};

const getAttendanceReport = async (filters = {}) => {
  const { course_id, instructor_id, student_id, start_date, end_date } = filters;
  
  let sql = `
    SELECT a.*, 
           c.title as course_title,
           u_student.name as student_name,
           u_student.email as student_email,
           u_instructor.name as instructor_name
    FROM attendance a
    INNER JOIN courses c ON a.course_id = c.id
    INNER JOIN users u_student ON a.student_id = u_student.id
    INNER JOIN users u_instructor ON a.instructor_id = u_instructor.id
    WHERE 1=1
  `;
  
  const conditions = [];
  const params = [];
  let paramIdx = 1;
  
  if (course_id) {
    conditions.push(`a.course_id = $${paramIdx}`);
    params.push(course_id);
    paramIdx++;
  }
  
  if (instructor_id) {
    conditions.push(`a.instructor_id = $${paramIdx}`);
    params.push(instructor_id);
    paramIdx++;
  }
  
  if (student_id) {
    conditions.push(`a.student_id = $${paramIdx}`);
    params.push(student_id);
    paramIdx++;
  }
  
  if (start_date) {
    conditions.push(`a.date >= $${paramIdx}`);
    params.push(start_date);
    paramIdx++;
  }
  
  if (end_date) {
    conditions.push(`a.date <= $${paramIdx}`);
    params.push(end_date);
    paramIdx++;
  }
  
  if (conditions.length > 0) {
    sql += ' AND ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY a.date DESC, c.title, u_student.name';
  
  const result = await query(sql, params);
  return result.rows;
};

const getAttendanceStats = async (courseId, studentId = null) => {
  let sql = `
    SELECT 
      COUNT(*) as total_classes,
      COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
      COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
      COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
      ROUND(
        (COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
      ) as attendance_percentage
    FROM attendance
    WHERE course_id = $1
  `;
  
  const params = [courseId];
  
  if (studentId) {
    sql += ' AND student_id = $2';
    params.push(studentId);
  }
  
  const result = await query(sql, params);
  return result.rows[0];
};

module.exports = {
  getInstructorCourses,
  getCourseStudents,
  getAttendanceForDate,
  markAttendance,
  getAttendanceReport,
  getAttendanceStats,
};