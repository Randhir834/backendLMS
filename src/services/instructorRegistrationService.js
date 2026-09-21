const { query } = require('../config/database');

const createInstructorRegistration = async ({ fullName, qualification, subjectExpertise, phoneNumber, role = 'instructor' }) => {
  const result = await query(
    'INSERT INTO instructor_registrations (full_name, qualification, subject_expertise, phone_number, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [fullName, qualification, subjectExpertise, phoneNumber, role]
  );
  return result.rows[0];
};

const getAllInstructorRegistrations = async () => {
  const result = await query('SELECT * FROM instructor_registrations ORDER BY created_at DESC');
  return result.rows;
};

const getInstructorRegistrationById = async (id) => {
  const result = await query('SELECT * FROM instructor_registrations WHERE id = $1', [id]);
  return result.rows[0];
};

const updateInstructorRegistration = async (id, { fullName, qualification, subjectExpertise, phoneNumber, role, status, notes }) => {
  // Build dynamic query based on provided fields
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (fullName !== undefined) {
    updates.push(`full_name = $${paramCount++}`);
    values.push(fullName);
  }
  if (qualification !== undefined) {
    updates.push(`qualification = $${paramCount++}`);
    values.push(qualification);
  }
  if (subjectExpertise !== undefined) {
    updates.push(`subject_expertise = $${paramCount++}`);
    values.push(subjectExpertise);
  }
  if (phoneNumber !== undefined) {
    updates.push(`phone_number = $${paramCount++}`);
    values.push(phoneNumber);
  }
  if (role !== undefined) {
    updates.push(`role = $${paramCount++}`);
    values.push(role);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramCount++}`);
    values.push(status);
  }
  if (notes !== undefined) {
    updates.push(`notes = $${paramCount++}`);
    values.push(notes);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE instructor_registrations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0];
};

const deleteInstructorRegistration = async (id) => {
  const result = await query('DELETE FROM instructor_registrations WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
};

module.exports = {
  createInstructorRegistration,
  getAllInstructorRegistrations,
  getInstructorRegistrationById,
  updateInstructorRegistration,
  deleteInstructorRegistration,
};
