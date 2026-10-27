const crypto = require('crypto');
const { query } = require('../config/database');

// OTP expiry time in minutes (configurable via env)
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
const MAX_OTP_ATTEMPTS = Number(process.env.MAX_OTP_ATTEMPTS || 5);

/**
 * Generate a 4-digit OTP code
 * @returns {string} 4-digit OTP code
 */
function generateOTPCode() {
  // Generate a random 4-digit code (0000-9999)
  return crypto.randomInt(0, 10000).toString().padStart(4, '0');
}

/**
 * Create and store a new OTP for a user
 * Deletes any existing OTPs for the user before creating a new one
 * @param {number} userId - The user's ID
 * @returns {Promise<string>} The generated OTP code
 */
async function createOTP(userId) {
  // Delete any existing OTPs for this user
  await query('DELETE FROM password_reset_otps WHERE user_id = $1', [userId]);
  
  const otpCode = generateOTPCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  
  await query(
    'INSERT INTO password_reset_otps (user_id, otp, expires_at, verified, attempts) VALUES ($1, $2, $3, $4, $5)',
    [userId, otpCode, expiresAt, false, 0]
  );
  
  return otpCode;
}

/**
 * Verify an OTP code for a user
 * @param {number} userId - The user's ID
 * @param {string} otpCode - The OTP code to verify
 * @returns {Promise<{success: boolean, error?: string}>} Verification result
 */
async function verifyOTP(userId, otpCode) {
  // Find the OTP record
  const result = await query(
    'SELECT * FROM password_reset_otps WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    return { success: false, error: 'Invalid OTP code. Please check and try again.' };
  }
  
  const otpRecord = result.rows[0];
  
  // Check if OTP matches
  if (otpRecord.otp !== otpCode && otpRecord.otp !== String(otpCode)) {
    // Increment attempt count for wrong OTP
    await query(
      'UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = $1',
      [otpRecord.id]
    );
    
    // Check if max attempts reached after incrementing
    const updatedRecord = await query(
      'SELECT attempts FROM password_reset_otps WHERE id = $1',
      [otpRecord.id]
    );
    
    if (updatedRecord.rows[0].attempts >= MAX_OTP_ATTEMPTS) {
      await query('DELETE FROM password_reset_otps WHERE id = $1', [otpRecord.id]);
      return { success: false, error: 'Too many failed attempts. Please request a new OTP.' };
    }
    
    return { success: false, error: 'Invalid OTP code. Please check and try again.' };
  }
  
  // Check if OTP has expired
  if (new Date(otpRecord.expires_at) < new Date()) {
    await query('DELETE FROM password_reset_otps WHERE id = $1', [otpRecord.id]);
    return { success: false, error: 'This OTP has expired. Please request a new one.' };
  }
  
  // Check if OTP has already been verified
  if (otpRecord.verified) {
    return { success: false, error: 'This OTP has already been used. Please request a new one.' };
  }
  
  // Check attempt count before verification
  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    await query('DELETE FROM password_reset_otps WHERE id = $1', [otpRecord.id]);
    return { success: false, error: 'Too many failed attempts. Please request a new OTP.' };
  }
  
  // Mark OTP as verified (don't increment attempts for successful verification)
  await query(
    'UPDATE password_reset_otps SET verified = $1 WHERE id = $2',
    [true, otpRecord.id]
  );
  
  return { success: true };
}

/**
 * Check if a user has a valid verified OTP
 * @param {number} userId - The user's ID
 * @returns {Promise<boolean>} True if user has a valid verified OTP
 */
async function hasValidVerifiedOTP(userId) {
  const result = await query(
    'SELECT * FROM password_reset_otps WHERE user_id = $1 AND verified = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
    [userId, true]
  );
  
  return result.rows.length > 0;
}

/**
 * Delete all OTPs for a user
 * @param {number} userId - The user's ID
 */
async function invalidateOTPs(userId) {
  await query('DELETE FROM password_reset_otps WHERE user_id = $1', [userId]);
}

/**
 * Clean up expired OTPs (can be run periodically)
 */
async function cleanupExpiredOTPs() {
  const result = await query('DELETE FROM password_reset_otps WHERE expires_at < NOW()');
  return result.rowCount;
}

module.exports = {
  createOTP,
  verifyOTP,
  hasValidVerifiedOTP,
  invalidateOTPs,
  cleanupExpiredOTPs,
  OTP_EXPIRY_MINUTES,
};
