const { query } = require('../config/database');
const { createNotification } = require('./notificationService');

const checkLowAttendanceAndNotify = async () => {
  try {
    // Find students with attendance below 60% in any course
    const lowAttendanceStudents = await query(`
      SELECT 
        u.id as student_id,
        u.name as student_name,
        u.email as student_email,
        c.id as course_id,
        c.title as course_title,
        COUNT(a.id) as total_classes,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        ROUND(
          (COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0)), 2
        ) as attendance_percentage
      FROM users u
      INNER JOIN enrollments e ON e.user_id = u.id
      INNER JOIN courses c ON c.id = e.course_id
      LEFT JOIN attendance a ON a.student_id = u.id AND a.course_id = c.id
      WHERE u.role = 'student' AND e.status = 'active'
      GROUP BY u.id, u.name, u.email, c.id, c.title
      HAVING COUNT(a.id) >= 3 AND 
             ROUND((COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0)), 2) < 60
    `);

    // Create notifications for low attendance students
    for (const student of lowAttendanceStudents.rows) {
      const message = `Your attendance in "${student.course_title}" is ${student.attendance_percentage}%. Please attend classes regularly to maintain good academic standing.`;
      
      await createNotification({
        user_id: student.student_id,
        title: 'Low Attendance Alert',
        message: message,
        type: 'warning',
        priority: 'high'
      });
    }

    // Find instructors whose courses have multiple low attendance students
    const instructorAlerts = await query(`
      SELECT 
        ci.instructor_id,
        u.name as instructor_name,
        c.id as course_id,
        c.title as course_title,
        COUNT(DISTINCT low_students.student_id) as low_attendance_count
      FROM course_instructors ci
      INNER JOIN courses c ON c.id = ci.course_id
      INNER JOIN users u ON u.id = ci.instructor_id
      INNER JOIN (
        SELECT 
          e.course_id,
          u.id as student_id
        FROM users u
        INNER JOIN enrollments e ON e.user_id = u.id
        LEFT JOIN attendance a ON a.student_id = u.id AND a.course_id = e.course_id
        WHERE u.role = 'student' AND e.status = 'active'
        GROUP BY e.course_id, u.id
        HAVING COUNT(a.id) >= 3 AND 
               ROUND((COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0)), 2) < 60
      ) low_students ON low_students.course_id = c.id
      GROUP BY ci.instructor_id, u.name, c.id, c.title
      HAVING COUNT(DISTINCT low_students.student_id) >= 3
    `);

    // Create notifications for instructors
    for (const instructor of instructorAlerts.rows) {
      const message = `${instructor.low_attendance_count} students in your course "${instructor.course_title}" have attendance below 60%. Please review and take appropriate action.`;
      
      await createNotification({
        user_id: instructor.instructor_id,
        title: 'Course Attendance Alert',
        message: message,
        type: 'info',
        priority: 'medium'
      });
    }

    console.log(`Processed ${lowAttendanceStudents.rows.length} low attendance alerts and ${instructorAlerts.rows.length} instructor alerts`);
    
    return {
      studentAlerts: lowAttendanceStudents.rows.length,
      instructorAlerts: instructorAlerts.rows.length
    };
  } catch (error) {
    console.error('Error in attendance notification service:', error);
    throw error;
  }
};

const getAttendanceTrends = async (courseId, days = 30) => {
  try {
    const result = await query(`
      SELECT 
        DATE(a.date) as attendance_date,
        COUNT(*) as total_students,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
        ROUND(
          (COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / COUNT(*)), 2
        ) as attendance_rate
      FROM attendance a
      WHERE a.course_id = $1 
        AND a.date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(a.date)
      ORDER BY attendance_date DESC
    `, [courseId]);

    return result.rows;
  } catch (error) {
    console.error('Error getting attendance trends:', error);
    throw error;
  }
};

module.exports = {
  checkLowAttendanceAndNotify,
  getAttendanceTrends,
};