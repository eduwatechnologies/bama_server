const asyncHandler = require('../../middleware/asyncHandler');
const { success } = require('../../utils/apiResponse');
const contributionService = require('../../services/contribution.service');

// GET /api/v1/admin/contributions
const list = asyncHandler(async (req, res) => {
  const { status, type, page, limit } = req.query;
  const result = await contributionService.listContributions({ status, type, page, limit });
  return success(res, result, 200, { page, limit });
});

// GET /api/v1/admin/contributions/:id
const getById = asyncHandler(async (req, res) => {
  const contribution = await contributionService.getContributionById(req.params.id);
  return success(res, contribution);
});

// PATCH /api/v1/admin/contributions/:id/review
const markUnderReview = asyncHandler(async (req, res) => {
  const contribution = await contributionService.markUnderReview(req.params.id, req.admin._id);
  return success(res, contribution);
});

// PATCH /api/v1/admin/contributions/:id/approve
const approve = asyncHandler(async (req, res) => {
  const { contribution, resultDoc } = await contributionService.approveContribution(
    req.params.id,
    req.admin._id,
    req.body
  );
  return success(res, { contribution, content: resultDoc });
});

// PATCH /api/v1/admin/contributions/:id/reject
const reject = asyncHandler(async (req, res) => {
  const contribution = await contributionService.rejectContribution(
    req.params.id,
    req.admin._id,
    req.body.reviewNotes
  );
  return success(res, contribution);
});

module.exports = { list, getById, markUnderReview, approve, reject };
