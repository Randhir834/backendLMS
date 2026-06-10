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

const updateInstructorRegistration = async (id, { fullName, qualification, subjectExpertise, phoneNumber, role }) => {
  const result = await query(
    'UPDATE instructor_registrations SET full_name = $1, qualification = $2, subject_expertise = $3, phone_number = $4, role = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
    [fullName, qualification, subjectExpertise, phoneNumber, role, id]
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
