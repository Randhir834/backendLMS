const { getAttendanceReport } = require('../services/attendanceService');
const { query } = require('../config/database');

const exportAttendanceCSV = async (req, res, next) => {
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
    
    // Generate CSV content
    const csvHeaders = [
      'Date',
      'Course',
      'Instructor',
      'Student Name',
      'Student Email',
      'Status',
      'Notes'
    ];
    
    const csvRows = attendance.map(record => [
      new Date(record.date).toLocaleDateString(),
      record.course_title,
      record.instructor_name,
      record.student_name,
      record.student_email,
      record.status.charAt(0).toUpperCase() + record.status.slice(1),
      record.notes || ''
    ]);
    
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
    
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

const exportCourseSummaryCSV = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    
    // Get course info
    const courseResult = await query(
      'SELECT title FROM courses WHERE id = $1',
      [courseId]
    );
    
    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    const courseTitle = courseResult.rows[0].title;
    
    // Get summary data
    const result = await query(
      `SELECT 
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
    
    // Generate CSV content
    const csvHeaders = [
      'Student Name',
      'Student Email',
      'Total Classes',
      'Present Count',
      'Absent Count',
      'Late Count',
      'Attendance Percentage'
    ];
    
    const csvRows = result.rows.map(record => [
      record.student_name,
      record.student_email,
      record.total_classes,
      record.present_count,
      record.absent_count,
      record.late_count,
      `${record.attendance_percentage || 0}%`
    ]);
    
    const csvContent = [
      `Course: ${courseTitle}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${courseTitle.replace(/[^a-zA-Z0-9]/g, '_')}-attendance-summary.csv"`);
    
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  exportAttendanceCSV,
  exportCourseSummaryCSV,
};