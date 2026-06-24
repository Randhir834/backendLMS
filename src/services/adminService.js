const { query } = require('../config/database');

// Utility function to calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

const findAllUsers = async (role) => {
  let result;
  if (role) {
    result = await query(
      'SELECT id, name, email, role, avatar_url, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization, created_at, updated_at FROM users WHERE role = $1 ORDER BY created_at DESC',
      [role]
    );
  } else {
    result = await query(
      'SELECT id, name, email, role, avatar_url, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
  }
  
  // Add calculated age to each user and format dates
  return result.rows.map(user => {
    const formattedUser = {
      ...user,
      // Format date_of_birth as ISO string if it exists
      date_of_birth: user.date_of_birth ? user.date_of_birth.toISOString().split('T')[0] : null,
      age: calculateAge(user.date_of_birth)
    };
    
    return formattedUser;
  });
};

const findUserById = async (id) => {
  const result = await query(
    'SELECT id, name, email, role, avatar_url, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );
  
  const user = result.rows[0] || null;
  if (user) {
    // Format date_of_birth as ISO string if it exists
    if (user.date_of_birth) {
      user.date_of_birth = user.date_of_birth.toISOString().split('T')[0];
    }
    user.age = calculateAge(user.date_of_birth);
  }
  
  return user;
};

const updateUserRole = async (id, role) => {
  const result = await query(
    'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role, created_at',
    [role, id]
  );
  return result.rows[0];
};

const updateUser = async (id, userData) => {
  try {
    const {
      name, email, phone, location, grade, school, parent_guardian_name,
      date_of_birth, specialization, qualifications
    } = userData;

    // Build the update query dynamically based on provided fields
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined && name !== null) {
      updateFields.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (email !== undefined && email !== null) {
      updateFields.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramCount}`);
      values.push(phone || null);
      paramCount++;
    }
    if (location !== undefined) {
      updateFields.push(`location = $${paramCount}`);
      values.push(location || null);
      paramCount++;
    }
    if (grade !== undefined) {
      updateFields.push(`grade = $${paramCount}`);
      values.push(grade || null);
      paramCount++;
    }
    if (school !== undefined) {
      updateFields.push(`school = $${paramCount}`);
      values.push(school || null);
      paramCount++;
    }
    if (parent_guardian_name !== undefined) {
      updateFields.push(`parent_guardian_name = $${paramCount}`);
      values.push(parent_guardian_name || null);
      paramCount++;
    }
    if (date_of_birth !== undefined) {
      updateFields.push(`date_of_birth = $${paramCount}`);
      values.push(date_of_birth || null);
      paramCount++;
    }
    if (specialization !== undefined) {
      updateFields.push(`specialization = $${paramCount}`);
      values.push(specialization || null);
      paramCount++;
    }
    if (qualifications !== undefined) {
      updateFields.push(`qualifications = $${paramCount}`);
      values.push(qualifications || null);
      paramCount++;
    }

    // Always update the updated_at field
    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) { // Only updated_at field
      throw new Error('No fields to update');
    }

    // Add the user ID as the last parameter
    values.push(id);

    const updateQuery = `
      UPDATE users SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, email, role, avatar_url, date_of_birth, school, grade, 
                parent_guardian_name, phone, location, qualifications, specialization, 
                created_at, updated_at
    `;

    console.log('Update query:', updateQuery);
    console.log('Values:', values);

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];
    
    // Format date_of_birth as ISO string if it exists
    if (user.date_of_birth) {
      user.date_of_birth = user.date_of_birth.toISOString().split('T')[0];
    }
    user.age = calculateAge(user.date_of_birth);

    return user;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

const deleteUserById = async (id) => {
  await query('DELETE FROM users WHERE id = $1', [id]);
};

const getDashboardStats = async () => {
  const students = await query("SELECT COUNT(*) AS count FROM users WHERE role = 'student'");
  const instructors = await query("SELECT COUNT(*) AS count FROM users WHERE role = 'instructor'");
  const courses = await query('SELECT COUNT(*) AS count FROM courses');
  const enrollments = await query('SELECT COUNT(*) AS count FROM enrollments');
  const revenue = await query("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'completed'");

  return {
    totalStudents: parseInt(students.rows[0].count, 10),
    totalInstructors: parseInt(instructors.rows[0].count, 10),
    totalCourses: parseInt(courses.rows[0].count, 10),
    totalEnrollments: parseInt(enrollments.rows[0].count, 10),
    totalRevenue: parseFloat(revenue.rows[0].total),
  };
};

const getEnrollmentTrend = async (days = 30) => {
  const result = await query(
    `SELECT DATE(created_at) AS date, COUNT(*) AS count FROM enrollments WHERE created_at >= NOW() - INTERVAL '1 day' * $1 GROUP BY DATE(created_at) ORDER BY date ASC`,
    [days]
  );
  return result.rows;
};

const getRecentEnrollments = async (limit = 10) => {
  const result = await query(
    `SELECT e.*, u.name AS student_name, c.title AS course_title FROM enrollments e JOIN users u ON e.user_id = u.id JOIN courses c ON e.course_id = c.id ORDER BY e.created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
};

const getRecentPayments = async (limit = 10) => {
  const result = await query(
    `SELECT p.*, u.name AS student_name, c.title AS course_title FROM payments p JOIN users u ON p.user_id = u.id JOIN enrollments e ON p.enrollment_id = e.id JOIN courses c ON e.course_id = c.id ORDER BY p.created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
};

const createInstructor = async (instructorData) => {
  const { name, email, phone, location, qualifications, specialization } = instructorData;

  // Check if email already exists
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    throw new Error('Email already exists');
  }

  // Set default password to 12345
  const plainPassword = '12345';
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  // Create the instructor account
  const result = await query(
    `INSERT INTO users (name, email, password, role, phone, location, qualifications, specialization, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING id, name, email, role, phone, location, qualifications, specialization, created_at, updated_at`,
    [name, email, hashedPassword, 'instructor', phone, location, qualifications, specialization]
  );

  const instructor = result.rows[0];

  // Return instructor data with the plain password (only shown once to admin)
  return {
    ...instructor,
    plainPassword: plainPassword // This should only be shown to the admin once
  };
};

// Get comprehensive student statistics including live classes and lesson progress
const getStudentDetailedStats = async (studentId) => {
  // Get basic student info
  const studentResult = await query(
    `SELECT id, name, email, phone, role, avatar_url, date_of_birth, school, grade, 
            parent_guardian_name, location, created_at
     FROM users 
     WHERE id = $1 AND role = 'student'`,
    [studentId]
  );

  if (studentResult.rows.length === 0) {
    throw new Error('Student not found');
  }

  const student = studentResult.rows[0];
  student.age = calculateAge(student.date_of_birth);
  if (student.date_of_birth) {
    student.date_of_birth = student.date_of_birth.toISOString().split('T')[0];
  }

  // Get all enrollments with course details
  const enrollmentsResult = await query(
    `SELECT 
      e.id as enrollment_id,
      e.course_id,
      e.status as enrollment_status,
      e.enrolled_at,
      e.completed_at,
      e.manual_completed_lessons,
      c.title as course_title,
      c.description as course_description,
      c.thumbnail_url,
      c.total_lessons,
      c.price,
      c.level,
      c.duration_value,
      c.duration_unit
     FROM enrollments e
     JOIN courses c ON e.course_id = c.id
     WHERE e.user_id = $1
     ORDER BY e.enrolled_at DESC`,
    [studentId]
  );

  // For each enrollment, get live classes and lesson progress
  const enrollments = await Promise.all(enrollmentsResult.rows.map(async (enrollment) => {
    // Get live classes scheduled for this course
    const liveClassesResult = await query(
      `SELECT 
        lc.id,
        lc.title,
        lc.description,
        lc.meet_link,
        lc.scheduled_at,
        lc.duration_minutes,
        lc.status,
        lc.created_at,
        u.name as created_by_name
       FROM live_classes lc
       LEFT JOIN users u ON lc.created_by = u.id
       WHERE lc.course_id = $1
       ORDER BY lc.scheduled_at DESC`,
      [enrollment.course_id]
    );

    // Get lesson progress count (from lesson_progress table)
    const lessonProgressResult = await query(
      `SELECT COUNT(*) as completed_count
       FROM lesson_progress lp
       JOIN lessons l ON lp.lesson_id = l.id
       JOIN sections s ON l.section_id = s.id
       WHERE s.course_id = $1 AND lp.student_id = $2 AND lp.status = 'completed'`,
      [enrollment.course_id, studentId]
    );

    // Calculate progress percentage
    const completedFromDB = parseInt(lessonProgressResult.rows[0]?.completed_count || 0);
    const completedFromManual = enrollment.manual_completed_lessons || 0;
    const totalCompleted = Math.max(completedFromDB, completedFromManual);
    const totalLessons = enrollment.total_lessons || 0;
    const progressPercentage = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

    return {
      ...enrollment,
      live_classes: liveClassesResult.rows,
      total_live_classes: liveClassesResult.rows.length,
      completed_lessons: totalCompleted,
      total_lessons: totalLessons,
      progress_percentage: progressPercentage
    };
  }));

  // Calculate overall statistics
  const totalEnrollments = enrollments.length;
  const totalLiveClasses = enrollments.reduce((sum, e) => sum + e.total_live_classes, 0);
  const totalCompletedLessons = enrollments.reduce((sum, e) => sum + e.completed_lessons, 0);
  const totalLessons = enrollments.reduce((sum, e) => sum + e.total_lessons, 0);
  const overallProgress = totalLessons > 0 ? Math.round((totalCompletedLessons / totalLessons) * 100) : 0;

  return {
    student,
    enrollments,
    statistics: {
      total_enrollments: totalEnrollments,
      total_live_classes_scheduled: totalLiveClasses,
      total_lessons_completed: totalCompletedLessons,
      total_lessons: totalLessons,
      overall_progress_percentage: overallProgress
    }
  };
};

// Get all students with their aggregated statistics
const getAllStudentsWithStats = async () => {
  const studentsResult = await query(
    `SELECT id, name, email, phone, avatar_url, date_of_birth, school, grade, created_at
     FROM users 
     WHERE role = 'student'
     ORDER BY created_at DESC`
  );

  const students = await Promise.all(studentsResult.rows.map(async (student) => {
    // Get enrollment count
    const enrollmentResult = await query(
      'SELECT COUNT(*) as count FROM enrollments WHERE user_id = $1',
      [student.id]
    );

    // Get total live classes across all courses
    const liveClassResult = await query(
      `SELECT COUNT(DISTINCT lc.id) as count
       FROM live_classes lc
       JOIN enrollments e ON lc.course_id = e.course_id
       WHERE e.user_id = $1`,
      [student.id]
    );

    // Get total completed lessons
    const progressResult = await query(
      `SELECT 
        COALESCE(SUM(e.manual_completed_lessons), 0) as manual_completed,
        COUNT(DISTINCT lp.id) FILTER (WHERE lp.status = 'completed') as db_completed
       FROM enrollments e
       LEFT JOIN courses c ON e.course_id = c.id
       LEFT JOIN sections s ON s.course_id = c.id
       LEFT JOIN lessons l ON l.section_id = s.id
       LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = e.user_id
       WHERE e.user_id = $1`,
      [student.id]
    );

    // Get total lessons
    const totalLessonsResult = await query(
      `SELECT COALESCE(SUM(c.total_lessons), 0) as total
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.user_id = $1`,
      [student.id]
    );

    const manualCompleted = parseInt(progressResult.rows[0]?.manual_completed || 0);
    const dbCompleted = parseInt(progressResult.rows[0]?.db_completed || 0);
    const totalCompleted = Math.max(manualCompleted, dbCompleted);
    const totalLessons = parseInt(totalLessonsResult.rows[0]?.total || 0);
    const progressPercentage = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

    return {
      ...student,
      age: calculateAge(student.date_of_birth),
      date_of_birth: student.date_of_birth ? student.date_of_birth.toISOString().split('T')[0] : null,
      total_enrollments: parseInt(enrollmentResult.rows[0].count),
      total_live_classes: parseInt(liveClassResult.rows[0].count),
      lessons_completed: totalCompleted,
      total_lessons: totalLessons,
      progress_percentage: progressPercentage
    };
  }));

  return students;
};

module.exports = {
  findAllUsers, findUserById, updateUserRole, updateUser, deleteUserById,
  getDashboardStats, getEnrollmentTrend, getRecentEnrollments, getRecentPayments,
  createInstructor, getStudentDetailedStats, getAllStudentsWithStats
};
