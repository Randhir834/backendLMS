const { pool } = require('../config/database');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Generate a unique session token
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash session token for storage
 */
function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Parse device information from request headers
 */
function parseDeviceInfo(req) {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ip = req.ip || req.connection?.remoteAddress || 'Unknown';
  
  // Basic parsing - can be enhanced with user-agent parsing library
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Unknown';
  
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  
  if (userAgent.includes('Mobile')) device = 'Mobile';
  else if (userAgent.includes('Tablet')) device = 'Tablet';
  else device = 'Desktop';
  
  return {
    userAgent,
    browser,
    os,
    device,
    ip
  };
}

/**
 * Create a new session for a user
 */
async function createSession(userId, jwtToken, req) {
  const sessionToken = generateSessionToken();
  const hashedToken = hashSessionToken(sessionToken);
  const deviceInfo = parseDeviceInfo(req);
  const ip = deviceInfo.ip;
  
  // Calculate expiration based on JWT expiration
  const decoded = jwt.decode(jwtToken);
  const expiresAt = new Date(decoded.exp * 1000);
  
  const query = `
    INSERT INTO user_sessions (
      user_id, session_token, jwt_token, device_info, login_ip, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, session_token, device_info, login_at, expires_at
  `;
  
  const result = await pool.query(query, [
    userId,
    hashedToken,
    jwtToken,
    JSON.stringify(deviceInfo),
    ip,
    expiresAt
  ]);
  
  return {
    sessionId: result.rows[0].id,
    sessionToken, // Return unhashed token to client
    deviceInfo: result.rows[0].device_info,
    loginAt: result.rows[0].login_at,
    expiresAt: result.rows[0].expires_at
  };
}

/**
 * Validate if a session is active
 */
async function validateSession(sessionToken) {
  const hashedToken = hashSessionToken(sessionToken);
  
  const query = `
    SELECT id, user_id, jwt_token, is_active, expires_at
    FROM user_sessions
    WHERE session_token = $1
      AND is_active = TRUE
      AND expires_at > CURRENT_TIMESTAMP
  `;
  
  const result = await pool.query(query, [hashedToken]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  // Update last activity
  await pool.query(
    'UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
    [result.rows[0].id]
  );
  
  return result.rows[0];
}

/**
 * Get all active sessions for a user
 */
async function getUserSessions(userId) {
  const query = `
    SELECT 
      id,
      device_info,
      login_ip,
      login_at,
      last_activity,
      expires_at,
      is_active
    FROM user_sessions
    WHERE user_id = $1
      AND is_active = TRUE
      AND expires_at > CURRENT_TIMESTAMP
    ORDER BY last_activity DESC
  `;
  
  const result = await pool.query(query, [userId]);
  
  return result.rows.map(row => ({
    id: row.id,
    deviceInfo: row.device_info,
    loginIp: row.login_ip,
    loginAt: row.login_at,
    lastActivity: row.last_activity,
    expiresAt: row.expires_at,
    isActive: row.is_active
  }));
}

/**
 * Revoke a specific session
 */
async function revokeSession(sessionId, userId) {
  const query = `
    UPDATE user_sessions
    SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  
  const result = await pool.query(query, [sessionId, userId]);
  return result.rows.length > 0;
}

/**
 * Revoke all sessions for a user except the current one
 */
async function revokeAllOtherSessions(userId, currentSessionToken) {
  const hashedToken = hashSessionToken(currentSessionToken);
  
  const query = `
    UPDATE user_sessions
    SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
      AND session_token != $2
      AND is_active = TRUE
    RETURNING id
  `;
  
  const result = await pool.query(query, [userId, hashedToken]);
  return result.rowCount;
}

/**
 * Revoke all sessions for a user
 */
async function revokeAllSessions(userId) {
  const query = `
    UPDATE user_sessions
    SET is_active = FALSE, revoked_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND is_active = TRUE
    RETURNING id
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rowCount;
}

/**
 * Delete a specific session (complete removal)
 */
async function deleteSession(sessionToken) {
  const hashedToken = hashSessionToken(sessionToken);
  
  const query = 'DELETE FROM user_sessions WHERE session_token = $1 RETURNING id';
  const result = await pool.query(query, [hashedToken]);
  return result.rows.length > 0;
}

/**
 * Clean up expired sessions (maintenance task)
 */
async function cleanupExpiredSessions() {
  const query = `
    DELETE FROM user_sessions
    WHERE expires_at < CURRENT_TIMESTAMP
      OR (is_active = FALSE AND revoked_at < CURRENT_TIMESTAMP - INTERVAL '7 days')
    RETURNING id
  `;
  
  const result = await pool.query(query);
  return result.rowCount;
}

/**
 * Get session count for a user
 */
async function getActiveSessionCount(userId) {
  const query = `
    SELECT COUNT(*) as count
    FROM user_sessions
    WHERE user_id = $1
      AND is_active = TRUE
      AND expires_at > CURRENT_TIMESTAMP
  `;
  
  const result = await pool.query(query, [userId]);
  return parseInt(result.rows[0].count);
}

module.exports = {
  generateSessionToken,
  hashSessionToken,
  parseDeviceInfo,
  createSession,
  validateSession,
  getUserSessions,
  revokeSession,
  revokeAllOtherSessions,
  revokeAllSessions,
  deleteSession,
  cleanupExpiredSessions,
  getActiveSessionCount
};
