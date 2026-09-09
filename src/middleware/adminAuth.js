const { verifyAccessToken } = require('../utils/jwt');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const Admin = require('../models/Admin');
const asyncHandler = require('./asyncHandler');

// Verifies the admin's access token and attaches req.admin.
const requireAdminAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AuthenticationError('Missing or malformed Authorization header');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AuthenticationError('Invalid or expired token');
  }

  if (payload.type !== 'access') {
    throw new AuthenticationError('Invalid token type');
  }

  const admin = await Admin.findById(payload.sub);
  if (!admin || !admin.isActive) {
    throw new AuthenticationError('Account is no longer active');
  }

  req.admin = admin;
  next();
});

// Restricts a route to specific roles, e.g. requireRole('SUPER_ADMIN')
function requireRole(...allowedRoles) {
  return function checkRole(req, res, next) {
    if (!req.admin) {
      throw new AuthenticationError();
    }
    if (!allowedRoles.includes(req.admin.role)) {
      throw new AuthorizationError(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      );
    }
    next();
  };
}

module.exports = { requireAdminAuth, requireRole };
