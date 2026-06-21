const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByEmail, findUserByEmailOrPhone, createUser, updateUserPassword } = require('../services/userService');
const { createResetToken, findUserIdByValidToken, deleteTokensForUser } = require('../services/passwordResetService');
const { sendEmail } = require('../services/emailService');
const { 
  createSession, 
  getUserSessions, 
  revokeSession, 
  revokeAllOtherSessions, 
  revokeAllSessions,
  getActiveSessionCount 
} = require('../services/sessionService');

const ALLOWED_ROLES = ['student', 'instructor', 'admin'];

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (!role || !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid or missing role.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    if (role === 'student') {
      if (!date_of_birth || !school || !grade || !parent_guardian_name || !phone || !location) {
        return res.status(400).json({ error: 'Date of birth, school, grade, parent/guardian name, phone, and location are required for student registration.' });
      }
    }

    if (role === 'instructor') {
      if (!phone || !location || !qualifications || !specialization) {
        return res.status(400).json({ error: 'Phone, location, qualifications, and specialization are required for instructor registration.' });
      }
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await createUser({
      name, email, password: hashedPassword, role,
      date_of_birth, school, grade, parent_guardian_name, phone, location, qualifications, specialization
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Create session for multi-device tracking
    const session = await createSession(user.id, token, req);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role, password_changed: true,
        date_of_birth: user.date_of_birth, age: user.age, school: user.school, grade: user.grade,
        parent_guardian_name: user.parent_guardian_name, phone: user.phone, location: user.location,
        qualifications: user.qualifications, specialization: user.specialization
      },
      token,
      sessionToken: session.sessionToken,
      sessionInfo: {
        deviceInfo: session.deviceInfo,
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, phone, identifier, password, expectedRole } = req.body;

    // Support multiple login methods:
    // 1. Legacy: email + password
    // 2. New: phone + password
    // 3. Unified: identifier (email or phone) + password
    let loginIdentifier = email || phone || identifier;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Email/Phone and password are required.' });
    }

    if (expectedRole && !ALLOWED_ROLES.includes(expectedRole)) {
      return res.status(400).json({ error: 'Invalid expectedRole.' });
    }

    const user = await findUserByEmailOrPhone(loginIdentifier);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check role match with case-insensitive comparison and better error messaging
    if (expectedRole && user.role.toLowerCase() !== expectedRole.toLowerCase()) {
      return res.status(401).json({
        error: `Invalid credentials. This portal is for ${expectedRole}s only. Your account is registered as a ${user.role}.`,
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Create session for multi-device tracking
    const session = await createSession(user.id, token, req);
    
    // Get active session count
    const activeSessionCount = await getActiveSessionCount(user.id);

    res.json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, password_changed: true },
      token,
      sessionToken: session.sessionToken,
      sessionInfo: {
        deviceInfo: session.deviceInfo,
        expiresAt: session.expiresAt,
        activeDevices: activeSessionCount
      }
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { token: oldToken } = req.body;
    if (!oldToken) {
      return res.status(401).json({ error: 'Token is required' });
    }

    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);
    const newToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token: newToken });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email, phone, identifier, expectedRole, clientOrigin } = req.body;

    // Support multiple reset methods:
    // 1. Legacy: email
    // 2. New: phone
    // 3. Unified: identifier (email or phone)
    let resetIdentifier = email || phone || identifier;

    if (!resetIdentifier) {
      return res.status(400).json({ error: 'Email or phone number is required.' });
    }

    if (expectedRole && !ALLOWED_ROLES.includes(expectedRole)) {
      return res.status(400).json({ error: 'Invalid expectedRole.' });
    }

    const user = await findUserByEmailOrPhone(resetIdentifier);
    const roleOk = user && (!expectedRole || user.role === expectedRole);

    if (roleOk) {
      const token = await createResetToken(user.id);
      const origin = (clientOrigin || process.env.APP_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');
      const path = '/reset-password';
      const link = `${origin}${path}?token=${token}`;
      const subject = 'Reset Your Playfit Password';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
            <p style="font-size: 16px; margin-bottom: 20px;">We received a request to reset the password for your <strong>Playfit ${expectedRole || 'user'}</strong> account.</p>
            <p style="font-size: 16px; margin-bottom: 25px;">Click the button below to create a new password. This link will expire in <strong>10 minutes</strong> for security reasons.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${link}" style="background: #1E88E5; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 25px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="font-size: 13px; color: #1E88E5; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px;">${link}</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            <p style="font-size: 14px; color: #666; margin-top: 20px;"><strong>Didn't request this?</strong><br>If you didn't ask to reset your password, you can safely ignore this email. Your password will remain unchanged.</p>
            <p style="font-size: 13px; color: #999; margin-top: 30px; text-align: center;">© ${new Date().getFullYear()} Playfit. All rights reserved.</p>
          </div>
        </body>
        </html>
      `;
      const text = `
Hello,

We received a request to reset the password for your Playfit ${expectedRole || 'user'} account.

Click the link below to create a new password. This link will expire in 10 minutes:
${link}

If you didn't request this password reset, you can safely ignore this email.

© ${new Date().getFullYear()} Playfit
      `;

      // Always send to email even if user searched by phone
      const result = await sendEmail({
        to: user.email,
        subject,
        html,
        text,
      });

      if (!result.sent) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📧 PASSWORD RESET LINK (Development Mode)`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Link: ${link}`);
        console.log(`Expires in: 10 minutes`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      }
    }

    res.json({
      message:
        'If an account exists with that email, password reset instructions have been sent. Please check your email inbox and spam folder. The reset link will expire in 10 minutes.',
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const userId = await findUserIdByValidToken(token);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Request a new reset from the login page.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await updateUserPassword(userId, hashedPassword);
    await deleteTokensForUser(userId);
    
    // Revoke all sessions when password is changed for security
    await revokeAllSessions(userId);

    res.json({ message: 'Password updated successfully. You can sign in with your new password.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active sessions for the current user
 */
const getSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sessions = await getUserSessions(userId);
    
    res.json({
      message: 'Sessions retrieved successfully',
      sessions,
      totalActive: sessions.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout from current device
 */
const logout = async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-session-token'];
    
    if (!sessionToken) {
      return res.status(400).json({ error: 'Session token is required' });
    }
    
    const userId = req.user.id;
    
    // Find and revoke the session
    const sessions = await getUserSessions(userId);
    const currentSession = sessions.find(s => s.id === req.session?.id);
    
    if (currentSession) {
      await revokeSession(currentSession.id, userId);
    }
    
    res.json({
      message: 'Logged out successfully from this device'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout from a specific device/session
 */
const logoutDevice = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    const success = await revokeSession(parseInt(sessionId), userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Session not found or already revoked' });
    }
    
    res.json({
      message: 'Logged out from the selected device successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout from all other devices except current
 */
const logoutOtherDevices = async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-session-token'];
    
    if (!sessionToken) {
      return res.status(400).json({ error: 'Session token is required' });
    }
    
    const userId = req.user.id;
    const revokedCount = await revokeAllOtherSessions(userId, sessionToken);
    
    res.json({
      message: `Logged out from ${revokedCount} other device(s) successfully`,
      revokedCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout from all devices
 */
const logoutAllDevices = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const revokedCount = await revokeAllSessions(userId);
    
    res.json({
      message: `Logged out from all ${revokedCount} device(s) successfully`,
      revokedCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  register, 
  login, 
  refreshToken, 
  forgotPassword, 
  resetPassword,
  getSessions,
  logout,
  logoutDevice,
  logoutOtherDevices,
  logoutAllDevices
};
