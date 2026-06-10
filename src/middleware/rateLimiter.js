const rateLimit = require('express-rate-limit');

/** Limit brute-force on auth endpoints */
const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429, // Explicitly set status code to 429 (Too Many Requests) instead of 403
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

module.exports = { authLimiter };
