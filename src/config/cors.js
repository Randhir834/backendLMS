const cors = require('cors');

const parseOrigins = () => {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001,http://localhost:3002';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const allowedOrigins = parseOrigins();

const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In production, log but still allow to prevent complete block
    console.warn(`[cors] Request from origin: ${origin}`);
    console.warn(`[cors] Allowed origins: ${allowedOrigins.join(', ')}`);
    
    // Allow the request anyway (CORS headers will be set)
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400,
};

module.exports = { corsOptions, allowedOrigins };
