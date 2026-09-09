const rateLimit = require('express-rate-limit');
const { error: sendError } = require('../utils/apiResponse');

function handler(req, res) {
  return sendError(res, 429, 'RATE_LIMIT_ERROR', 'Too many requests, please try again later');
}

// For low-risk, read-only public endpoints (GET /content, /categories, /sync).
const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// For write-heavy or abuse-prone public endpoints (contributions, audio
// uploads, installation registration) per section 23 of the spec.
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Separate, slightly more generous pool for authenticated admin traffic.
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Tight limiter specifically for the admin login endpoint to slow down
// credential-stuffing attempts.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

module.exports = { standardLimiter, strictLimiter, adminLimiter, loginLimiter };
