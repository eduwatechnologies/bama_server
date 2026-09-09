const asyncHandler = require('../../middleware/asyncHandler');
const { success } = require('../../utils/apiResponse');
const authService = require('../../services/adminAuth.service');

// POST /api/v1/admin/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { admin, accessToken, refreshToken } = await authService.login(email, password);
  return success(res, { admin, accessToken, refreshToken });
});

// POST /api/v1/admin/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refresh(refreshToken);
  return success(res, {
    admin: result.admin,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

// POST /api/v1/admin/auth/logout
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(req.admin._id, refreshToken);
  return success(res, { loggedOut: true });
});

module.exports = { login, refresh, logout };
