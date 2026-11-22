const asyncHandler = require('../middleware/asyncHandler');
const { success } = require('../utils/apiResponse');
const { getAppSettings } = require('../models/AppSettings');

/**
 * Public app-update policy. The mobile app compares its own version against
 * these values to decide whether to prompt (latest) or force (min) an update.
 * Values are managed from the dashboard and persisted in AppSettings.
 */
const getAppVersion = asyncHandler(async (req, res) => {
  const { appUpdate } = await getAppSettings();
  const { enabled, latestVersion, minVersion, storeUrl, message } = appUpdate;
  return success(res, {
    enabled,
    latestVersion,
    minVersion,
    storeUrl,
    message: message || null,
  });
});

module.exports = { getAppVersion };
