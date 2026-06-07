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
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[cors] Blocked origin: ${origin}`);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = { corsOptions, allowedOrigins };
