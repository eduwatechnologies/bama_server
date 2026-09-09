const asyncHandler = require('../middleware/asyncHandler');
const { success } = require('../utils/apiResponse');
const Installation = require('../models/Installation');

// POST /api/v1/installations/register
const register = asyncHandler(async (req, res) => {
  const { installationId, appVersion, platform, deviceLanguage, contentVersion } = req.body;

  const installation = await Installation.findOneAndUpdate(
    { installationId },
    {
      $set: {
        appVersion,
        platform,
        deviceLanguage,
        ...(contentVersion !== undefined ? { contentVersion } : {}),
        lastSeenAt: new Date(),
      },
      $setOnInsert: { installationId, firstSeenAt: new Date() },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return success(res, installation, 200);
});

module.exports = { register };
