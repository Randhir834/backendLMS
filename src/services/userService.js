const { query } = require('../config/database');

const findUserByEmail = async (email) => {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
};

const findUserByEmailOrPhone = async (identifier) => {
  const result = await query(
    'SELECT * FROM users WHERE email = $1 OR phone = $1',
    [identifier]
  );
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

const updateUserById = async (id, { name, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization, avatar_url }) => {
  // Build dynamic query parts
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(name);
  }
  if (date_of_birth !== undefined) {
    updates.push(`date_of_birth = $${paramCount++}`);
    values.push(date_of_birth);
  }
  if (school !== undefined) {
    updates.push(`school = $${paramCount++}`);
    values.push(school);
  }
  if (grade !== undefined) {
    updates.push(`grade = $${paramCount++}`);
    values.push(grade);
  }
  if (parent_guardian_name !== undefined) {
    updates.push(`parent_guardian_name = $${paramCount++}`);
    values.push(parent_guardian_name);
  }
  if (phone !== undefined) {
    updates.push(`phone = $${paramCount++}`);
    values.push(phone);
  }
  if (location !== undefined) {
    updates.push(`location = $${paramCount++}`);
    values.push(location);
  }
  if (qualifications !== undefined) {
    updates.push(`qualifications = $${paramCount++}`);
    values.push(qualifications);
  }
  if (specialization !== undefined) {
    updates.push(`specialization = $${paramCount++}`);
    values.push(specialization);
  }
  if (avatar_url !== undefined) {
    updates.push(`avatar_url = $${paramCount++}`);
    values.push(avatar_url);
  }

  if (updates.length === 0) {
    // No updates to perform, just return the current user
    return findUserById(id);
  }

  updates.push('updated_at = NOW()');
  values.push(id);

  const result = await query(
    `UPDATE users SET ${updates.join(', ')}
     WHERE id = $${paramCount}
     RETURNING id, name, email, role, avatar_url, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization, created_at`,
    values
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

module.exports = { findUserByEmail, findUserByEmailOrPhone, findUserById, createUser, updateUserById, updateUserPassword, getUserPasswordById };
