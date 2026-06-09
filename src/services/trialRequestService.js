const { query } = require('../config/database');

const createTrialRequest = async ({ name, email, phone, grade }) => {
  const result = await query(
    'INSERT INTO trial_requests (name, email, phone, grade) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, email, phone, grade]
  );
  return result.rows[0];
};

const getAllTrialRequests = async () => {
  const result = await query('SELECT * FROM trial_requests ORDER BY created_at DESC');
  return result.rows;
};

module.exports = { createTrialRequest, getAllTrialRequests };
