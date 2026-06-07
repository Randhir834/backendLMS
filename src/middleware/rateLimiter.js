const rateLimit = require('express-rate-limit');

/** Limit brute-force on auth endpoints */
const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_MAX || 80),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

module.exports = { authLimiter };
