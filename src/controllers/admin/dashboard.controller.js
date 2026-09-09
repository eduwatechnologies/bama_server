const asyncHandler = require('../../middleware/asyncHandler');
const { success } = require('../../utils/apiResponse');
const Word = require('../../models/Word');
const Phrase = require('../../models/Phrase');
const Category = require('../../models/Category');
const Installation = require('../../models/Installation');
const { getCurrentContentVersion } = require('../../services/content.service');

// GET /api/v1/admin/dashboard
// A lightweight snapshot for Phase 1. Full analytics (search trends,
// audio play counts, sync success rates, etc.) land in a later phase.
const getDashboard = asyncHandler(async (req, res) => {
  const [
    totalWords,
    totalPhrases,
    totalCategories,
    totalInstallations,
    contentVersion,
  ] = await Promise.all([
    Word.countDocuments({ status: 'PUBLISHED' }),
    Phrase.countDocuments({ status: 'PUBLISHED' }),
    Category.countDocuments({ status: 'ACTIVE' }),
    Installation.countDocuments(),
    getCurrentContentVersion(),
  ]);

  return success(res, {
    totalWords,
    totalPhrases,
    totalCategories,
    totalInstallations,
    contentVersion,
  });
});

// GET /api/v1/admin/installations
const listInstallations = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const [items, total] = await Promise.all([
    Installation.find()
      .sort({ lastSeenAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Installation.countDocuments(),
  ]);
  return success(res, { items, total }, 200, { page, limit });
});

module.exports = { getDashboard, listInstallations };
