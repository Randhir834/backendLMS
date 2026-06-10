const { query } = require('../config/database');

const findUserByEmail = async (email) => {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
};

const findUserById = async (id) => {
  const result = await query(
    'SELECT id, name, email, role, avatar_url, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization, created_at FROM users WHERE id = $1',
    [id]
  );
  
  const user = result.rows[0] || null;
  if (user && user.date_of_birth) {
    // Format date_of_birth as ISO string
    const formattedDate = user.date_of_birth.toISOString().split('T')[0];
    user.date_of_birth = formattedDate;
    
    // Calculate age
    const today = new Date();
    const birthDate = new Date(formattedDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    user.age = age;
  }
  
  return user;
};

const createUser = async ({ name, email, password, role, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization }) => {
  const result = await query(
    `INSERT INTO users (name, email, password, role, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, name, email, role, avatar_url, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization, created_at`,
    [name, email, password, role, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization]
  );
  
  const user = result.rows[0];
  if (user && user.date_of_birth) {
    // Format date_of_birth as ISO string
    const formattedDate = user.date_of_birth.toISOString().split('T')[0];
    user.date_of_birth = formattedDate;
    
    // Calculate age
    const today = new Date();
    const birthDate = new Date(formattedDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    user.age = age;
  }
  
  return user;
};

const updateUserById = async (id, { name, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization }) => {
  const result = await query(
    `UPDATE users SET
      name = COALESCE($1, name),
      date_of_birth = COALESCE($2, date_of_birth),
      school = COALESCE($3, school),
      grade = COALESCE($4, grade),
      parent_guardian_name = COALESCE($5, parent_guardian_name),
      phone = COALESCE($6, phone),
      location = COALESCE($7, location),
      qualifications = COALESCE($8, qualifications),
      specialization = COALESCE($9, specialization),
      updated_at = NOW()
     WHERE id = $10
     RETURNING id, name, email, role, avatar_url, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization, created_at`,
    [name, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization, id]
  );
  
  const user = result.rows[0];
  if (user && user.date_of_birth) {
    // Format date_of_birth as ISO string
    const formattedDate = user.date_of_birth.toISOString().split('T')[0];
    user.date_of_birth = formattedDate;
    
    // Calculate age
    const today = new Date();
    const birthDate = new Date(formattedDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    user.age = age;
  }
  
  return user;
};

const updateUserPassword = async (id, hashedPassword, markAsChanged = false) => {
  // Always update password, password_changed is already TRUE by default
  await query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, id]);
};

const getUserPasswordById = async (id) => {
  const result = await query('SELECT password FROM users WHERE id = $1', [id]);
  return result.rows[0]?.password || null;
};

module.exports = { findUserByEmail, findUserById, createUser, updateUserById, updateUserPassword, getUserPasswordById };
