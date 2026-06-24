const jwt = require('jsonwebtoken');
const { validateSession } = require('../services/sessionService');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[Auth] Missing or invalid authorization header:', { 
      path: req.path, 
      method: req.method,
      hasAuthHeader: !!authHeader 
    });
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
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
        console.error('[Auth] Invalid or expired session:', { 
          userId: decoded.id, 
          sessionExists: !!session,
          sessionUserId: session?.user_id 
        });
        return res.status(401).json({ 
          error: 'Your session has expired. Please log in again.'
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
    console.error('[Auth] Token verification failed:', { 
      errorName: error.name, 
      errorMessage: error.message,
      path: req.path
    });
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Your session has expired. Please log in again.'
      });
    }
    return res.status(401).json({ 
      error: 'Your session has expired. Please log in again.'
    });
  }
};

module.exports = { authenticate };
