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

module.exports = {
  findAllUsers, findUserById, updateUserRole, updateUser, deleteUserById,
  getDashboardStats, getEnrollmentTrend, getRecentEnrollments, getRecentPayments,
  createInstructor
};
