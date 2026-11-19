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

// POST /api/v1/installations/progress
//
// Merge-only backup of the learning path. The device is authoritative, so this
// never wipes data: learned ids are unioned, streaks/dates only move up, and
// the goal is the one field that takes the client's latest value.
const updateProgress = asyncHandler(async (req, res) => {
  const { installationId, learnedWordIds, currentStreak, longestStreak, lastLearnedDate, dailyGoal } =
    req.body;

  const set = { progressUpdatedAt: new Date(), lastSeenAt: new Date() };
  const max = {};
  const addToSet = {};

  if (Array.isArray(learnedWordIds) && learnedWordIds.length > 0) {
    addToSet['progress.learnedWordIds'] = { $each: learnedWordIds };
  }
  if (typeof currentStreak === 'number') max['progress.currentStreak'] = currentStreak;
  if (typeof longestStreak === 'number') max['progress.longestStreak'] = longestStreak;
  if (typeof lastLearnedDate === 'string') max['progress.lastLearnedDate'] = lastLearnedDate;
  if (typeof dailyGoal === 'number') set['progress.dailyGoal'] = dailyGoal;

  const update = {
    $set: set,
    $setOnInsert: { installationId, firstSeenAt: new Date() },
  };
  if (Object.keys(max).length > 0) update.$max = max;
  if (Object.keys(addToSet).length > 0) update.$addToSet = addToSet;

  const installation = await Installation.findOneAndUpdate({ installationId }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  return success(res, {
    progress: installation.progress,
    progressUpdatedAt: installation.progressUpdatedAt,
  });
});

// GET /api/v1/installations/progress?installationId=...
const getProgress = asyncHandler(async (req, res) => {
  const installation = await Installation.findOne({ installationId: req.query.installationId })
    .select('progress progressUpdatedAt')
    .lean();

  if (!installation) return success(res, null);

  return success(res, {
    progress: installation.progress ?? {},
    progressUpdatedAt: installation.progressUpdatedAt ?? null,
  });
});

module.exports = { register, updateProgress, getProgress };
