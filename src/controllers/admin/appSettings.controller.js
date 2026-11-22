const asyncHandler = require('../../middleware/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { getAppSettings, updateAppUpdate } = require('../../models/AppSettings');

// GET /api/v1/admin/app-settings
const getSettings = asyncHandler(async (req, res) => {
  const settings = await getAppSettings();
  return success(res, settings);
});

// PATCH /api/v1/admin/app-settings/app-update
const updateAppUpdateSettings = asyncHandler(async (req, res) => {
  const settings = await updateAppUpdate(req.body, req.admin._id);
  return success(res, settings);
});

module.exports = { getSettings, updateAppUpdate: updateAppUpdateSettings };
