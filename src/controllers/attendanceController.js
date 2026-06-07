const {
  getInstructorCourses,
  getCourseStudents,
  getAttendanceForDate,
  markAttendance,
  getAttendanceReport,
  getAttendanceStats,
} = require('../services/attendanceService');

const getInstructorCoursesForAttendance = async (req, res, next) => {
  try {
    const instructorId = req.user.role === 'admin' ? req.params.instructorId : req.user.id;
    const courses = await getInstructorCourses(instructorId);
    res.json({ courses });
  } catch (error) {
    next(error);
  }
};

const getCourseStudentsForAttendance = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const students = await getCourseStudents(courseId);
    res.json({ students });
  } catch (error) {
    next(error);
  }
};

const getAttendanceByDate = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    const attendance = await getAttendanceForDate(courseId, date);
    res.json({ attendance });
  } catch (error) {
    next(error);
  }
};

const submitAttendance = async (req, res, next) => {
  try {
    const { course_id, date, students } = req.body;
    const instructor_id = req.user.id;
    
    if (!course_id || !date || !students || !Array.isArray(students)) {
      return res.status(400).json({ error: 'Course ID, date, and students array are required' });
    }
    
    // Validate date format and not in future
    const attendanceDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    if (attendanceDate > today) {
      return res.status(400).json({ error: 'Cannot mark attendance for future dates' });
    }
    
    // Validate students array
    if (students.length === 0) {
      return res.status(400).json({ error: 'At least one student is required' });
    }
    
    for (const student of students) {
      if (!student.student_id || !student.status) {
        return res.status(400).json({ error: 'Each student must have student_id and status' });
      }
      if (!['present', 'absent', 'late'].includes(student.status)) {
        return res.status(400).json({ error: 'Invalid status. Must be present, absent, or late' });
      }
    }
    
    // Validate that instructor is assigned to this course
    const instructorCourses = await getInstructorCourses(instructor_id);
    const hasAccess = instructorCourses.some(course => course.id === parseInt(course_id));
    
    if (!hasAccess && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You are not authorized to mark attendance for this course' });
    }
    
    const result = await markAttendance({
      course_id,
      instructor_id,
      date,
      students
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getAttendanceReports = async (req, res, next) => {
  try {
    const filters = {};
    
    if (req.query.course_id) filters.course_id = req.query.course_id;
    if (req.query.student_id) filters.student_id = req.query.student_id;
    if (req.query.start_date) filters.start_date = req.query.start_date;
    if (req.query.end_date) filters.end_date = req.query.end_date;
    
    // If instructor, only show their courses
    if (req.user.role === 'instructor') {
      filters.instructor_id = req.user.id;
    } else if (req.query.instructor_id) {
      filters.instructor_id = req.query.instructor_id;
    }
    
    const attendance = await getAttendanceReport(filters);
    res.json({ attendance });
  } catch (error) {
    next(error);
  }
};

const getCourseAttendanceStats = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.query;
    
    const stats = await getAttendanceStats(courseId, studentId);
    res.json({ stats });
  } catch (error) {
    next(error);
  }
};

const getStudentAttendanceHistory = async (req, res, next) => {
  try {
    const studentId = req.params.studentId === 'me' ? req.user.id : req.params.studentId;
    const { courseId } = req.query;
    
    // If not admin/instructor, students can only view their own records
    if (req.user.role === 'student' && studentId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const filters = { student_id: studentId };
    if (courseId) filters.course_id = courseId;
    
    const attendance = await getAttendanceReport(filters);
    res.json({ attendance });
  } catch (error) {
    next(error);
  }
};

const getStudentStats = async (req, res, next) => {
  try {
    const studentId = req.params.studentId === 'me' ? req.user.id : req.params.studentId;
    const { courseId } = req.query;
    
    // If not admin/instructor, students can only view their own records
    if (req.user.role === 'student' && studentId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { query } = require('../config/database');
    
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
      WHERE student_id = $1
    `;
    
    const params = [studentId];
    
    if (courseId) {
      sql += ' AND course_id = $2';
      params.push(courseId);
    }
    
    const result = await query(sql, params);
    res.json({ stats: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const getAttendanceSummary = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { query } = require('../config/database');
    
    // Get summary with student-wise attendance
    const result = await query(
      `SELECT 
        u.id as student_id,
        u.name as student_name,
        u.email as student_email,
        COUNT(a.id) as total_classes,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
        ROUND(
          (COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0)), 2
        ) as attendance_percentage
      FROM users u
      INNER JOIN enrollments e ON e.user_id = u.id
      LEFT JOIN attendance a ON a.student_id = u.id AND a.course_id = e.course_id
      WHERE e.course_id = $1 AND e.status = 'active' AND u.role = 'student'
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name`,
      [courseId]
    );
    
    res.json({ summary: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInstructorCoursesForAttendance,
  getCourseStudentsForAttendance,
  getAttendanceByDate,
  submitAttendance,
  getAttendanceReports,
  getCourseAttendanceStats,
  getStudentAttendanceHistory,
  getAttendanceSummary,
  getStudentStats,
};