const { query } = require('../config/database');

const findNotificationsByUser = async (userId) => {
  const result = await query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
};

const findUnreadCount = async (userId) => {
  const result = await query(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
};

const createNotification = async ({ user_id, title, message, type }) => {
  const result = await query(
    'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4) RETURNING *',
    [user_id, title, message, type]
  );
  return result.rows[0];
};

const markAsRead = async (id) => {
  const result = await query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
};

const markAllAsRead = async (userId) => {
  await query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
};

const deleteNotification = async (id) => {
  await query('DELETE FROM notifications WHERE id = $1', [id]);
};

const notifyAllUsers = async ({ title, message, type }) => {
  const result = await query(
    'INSERT INTO notifications (user_id, title, message, type) SELECT id, $1, $2, $3 FROM users RETURNING *',
    [title, message, type]
  );
  return result.rows;
};

const notifyUsersByRole = async ({ title, message, type, role }) => {
  const result = await query(
    'INSERT INTO notifications (user_id, title, message, type) SELECT id, $1, $2, $3 FROM users WHERE role = $4 RETURNING *',
    [title, message, type, role]
  );
  return result.rows;
};

module.exports = {
  findNotificationsByUser, findUnreadCount, createNotification,
  markAsRead, markAllAsRead, deleteNotification, notifyAllUsers, notifyUsersByRole,
};
