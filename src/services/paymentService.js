const { query } = require('../config/database');

const createPaymentRecord = async ({ user_id, enrollment_id, amount, payment_method }) => {
  const result = await query(
    'INSERT INTO payments (user_id, enrollment_id, amount, payment_method, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [user_id, enrollment_id, amount, payment_method, 'pending']
  );
  return result.rows[0];
};

const updatePaymentStatus = async (payment_id, updates) => {
  const fields = [];
  const params = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${paramIdx++}`);
    params.push(value);
  }

  if (fields.length === 0) return null;

  fields.push('updated_at = NOW()');
  params.push(payment_id);

  const result = await query(
    `UPDATE payments SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    params
  );
  return result.rows[0] || null;
};

const findPaymentsByUser = async (user_id) => {
  const result = await query(
    'SELECT p.*, c.title AS course_title FROM payments p JOIN enrollments e ON p.enrollment_id = e.id JOIN courses c ON e.course_id = c.id WHERE p.user_id = $1 ORDER BY p.created_at DESC',
    [user_id]
  );
  return result.rows;
};

const findPaymentById = async (id) => {
  const result = await query('SELECT * FROM payments WHERE id = $1', [id]);
  return result.rows[0] || null;
};

module.exports = { 
  createPaymentRecord, 
  updatePaymentStatus,
  findPaymentsByUser, 
  findPaymentById 
};
