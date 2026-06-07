const { query } = require('../config/database');
const { markAttendance } = require('../services/attendanceService');

const bulkMarkAttendance = async (req, res, next) => {
  try {
    const { courses, date, defaultStatus = 'present' } = req.body;
    const instructor_id = req.user.id;
    
    if (!courses || !Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ error: 'Courses array is required' });
    }
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }
    
    // Validate date
    const attendanceDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    
    if (attendanceDate > today) {
      return res.status(400).json({ error: 'Cannot mark attendance for future dates' });
    }
    
    const results = [];
    const errors = [];
    
    // Process each course
    for (const courseId of courses) {
      try {
        // Get students for this course
        const studentsResult = await query(
          `SELECT u.id
          FROM users u
          INNER JOIN enrollments e ON e.user_id = u.id
          WHERE e.course_id = $1 AND e.status = 'active' AND u.role = 'student'
          ORDER BY u.name`,
          [courseId]
        );
        
        if (studentsResult.rows.length === 0) {
          errors.push({ courseId, error: 'No students found' });
          continue;
        }
        
        // Prepare attendance data
        const students = studentsResult.rows.map(student => ({
          student_id: student.id,
          status: defaultStatus,
          notes: 'Bulk marked'
        }));
        
        // Mark attendance
        await markAttendance({
          course_id: courseId,
          instructor_id,
          date,
          students
        });
        
        results.push({ 
          courseId, 
          studentsMarked: students.length,
          status: 'success'
        });
        
      } catch (error) {
        console.error(`Error marking attendance for course ${courseId}:`, error);
        errors.push({ courseId, error: error.message });
      }
    }
    
    res.json({
      success: true,
      results,
      errors,
      summary: {
        totalCourses: courses.length,
        successfulCourses: results.length,
        failedCourses: errors.length,
        totalStudentsMarked: results.reduce((sum, r) => sum + r.studentsMarked, 0)
      }
    });
    
  } catch (error) {
    next(error);
  }
};

const bulkUpdateAttendance = async (req, res, next) => {
  try {
    const { attendanceRecords } = req.body;
    const instructor_id = req.user.id;
    
    if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
      return res.status(400).json({ error: 'Attendance records array is required' });
    }
    
    const results = [];
    const errors = [];
    
    // Group records by course and date
    const groupedRecords = attendanceRecords.reduce((acc, record) => {
      const key = `${record.course_id}-${record.date}`;
      if (!acc[key]) {
        acc[key] = {
          course_id: record.course_id,
          date: record.date,
          students: []
        };
      }
      acc[key].students.push({
        student_id: record.student_id,
        status: record.status,
        notes: record.notes || 'Bulk updated'
      });
      return acc;
    }, {});
    
    // Process each group
    for (const [key, group] of Object.entries(groupedRecords)) {
      try {
        await markAttendance({
          course_id: group.course_id,
          instructor_id,
          date: group.date,
          students: group.students
        });
        
        results.push({
          courseId: group.course_id,
          date: group.date,
          studentsUpdated: group.students.length,
          status: 'success'
        });
        
      } catch (error) {
        console.error(`Error updating attendance for ${key}:`, error);
        errors.push({
          courseId: group.course_id,
          date: group.date,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      results,
      errors,
      summary: {
        totalGroups: Object.keys(groupedRecords).length,
        successfulGroups: results.length,
        failedGroups: errors.length,
        totalStudentsUpdated: results.reduce((sum, r) => sum + r.studentsUpdated, 0)
      }
    });
    
  } catch (error) {
    next(error);
  }
};

const getAttendanceTemplate = async (req, res, next) => {
  try {
    const { courseIds, startDate, endDate } = req.query;
    const instructor_id = req.user.id;
    
    if (!courseIds) {
      return res.status(400).json({ error: 'Course IDs are required' });
    }
    
    const courseIdArray = courseIds.split(',').map(id => parseInt(id));
    
    // Generate date range
    const start = new Date(startDate || new Date());
    const end = new Date(endDate || start);
    const dates = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }
    
    const template = [];
    
    // For each course and date, get students
    for (const courseId of courseIdArray) {
      // Get course info
      const courseResult = await query(
        'SELECT title FROM courses WHERE id = $1',
        [courseId]
      );
      
      if (courseResult.rows.length === 0) continue;
      
      const courseTitle = courseResult.rows[0].title;
      
      // Get students
      const studentsResult = await query(
        `SELECT u.id, u.name, u.email
        FROM users u
        INNER JOIN enrollments e ON e.user_id = u.id
        WHERE e.course_id = $1 AND e.status = 'active' AND u.role = 'student'
        ORDER BY u.name`,
        [courseId]
      );
      
      // Generate template rows
      for (const date of dates) {
        for (const student of studentsResult.rows) {
          template.push({
            course_id: courseId,
            course_title: courseTitle,
            date: date,
            student_id: student.id,
            student_name: student.name,
            student_email: student.email,
            status: 'present', // default
            notes: ''
          });
        }
      }
    }
    
    res.json({ template });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  bulkMarkAttendance,
  bulkUpdateAttendance,
  getAttendanceTemplate,
};