const crypto = require('crypto');
const { query } = require('../config/database');

const TOKEN_BYTES = 32;
// Token expiry time: 10 minutes (configurable via env)
const EXPIRY_MINUTES = Number(process.env.PASSWORD_RESET_EXPIRY_MINUTES || 10);

const createResetToken = async (userId) => {
  await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);
  await query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt.toISOString()]
  );
  return token;
};

const findUserIdByValidToken = async (token) => {
  const result = await query(
    'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  return result.rows[0]?.user_id ?? null;
};

const deleteTokensForUser = async (userId) => {
  await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
};

module.exports = {
  createResetToken,
  findUserIdByValidToken,
  deleteTokensForUser,
};
