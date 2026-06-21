const jwt = require('jsonwebtoken');
const { validateSession } = require('../services/sessionService');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session tracking is enabled (for backward compatibility)
    const sessionToken = req.headers['x-session-token'];
    
    if (sessionToken) {
      // Validate session if session token is provided
      const session = await validateSession(sessionToken);
      
      if (!session || session.user_id !== decoded.id) {
        return res.status(401).json({ 
          error: 'Session expired or invalid. Please login again.',
          code: 'SESSION_INVALID'
        });
      }
      
      req.session = {
        id: session.id,
        token: sessionToken
      };
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ 
      error: 'Invalid token.',
      code: 'TOKEN_INVALID'
    });
  }
};

module.exports = { authenticate };
