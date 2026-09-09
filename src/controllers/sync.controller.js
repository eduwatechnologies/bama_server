const asyncHandler = require('../middleware/asyncHandler');
const { success } = require('../utils/apiResponse');
const syncService = require('../services/sync.service');
const Installation = require('../models/Installation');

// GET /api/v1/sync?version=25&installationId=...
const sync = asyncHandler(async (req, res) => {
  const { version, installationId } = req.query;

  const { serverVersion, requiresFullSync, changes } = await syncService.getChangesSince(version);

  if (installationId) {
    await Installation.findOneAndUpdate(
      { installationId },
      {
        $set: {
          lastSeenAt: new Date(),
          lastSyncAt: new Date(),
          ...(requiresFullSync ? {} : { contentVersion: serverVersion }),
        },
        $setOnInsert: { installationId, firstSeenAt: new Date() },
      },
      { upsert: true }
    );
  }

  return success(res, {
    serverVersion,
    clientVersion: version,
    requiresFullSync,
    changes,
  });
});

module.exports = { sync };
