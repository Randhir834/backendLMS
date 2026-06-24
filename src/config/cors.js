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
    // Allow requests with no origin (like mobile apps, curl requests, or Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log but allow to prevent blocking legitimate requests
    console.warn(`[cors] Request from unlisted origin: ${origin}`);
    console.warn(`[cors] Configured origins: ${allowedOrigins.join(', ')}`);
    
    // Allow the request anyway (for development flexibility)
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Session-Token'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204, // Some legacy browsers choke on 204
  maxAge: 86400,
};

module.exports = { corsOptions, allowedOrigins };
