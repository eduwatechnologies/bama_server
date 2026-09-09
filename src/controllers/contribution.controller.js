const asyncHandler = require('../middleware/asyncHandler');
const { success } = require('../utils/apiResponse');
const contributionService = require('../services/contribution.service');
const audioService = require('../services/audio.service');
const { ValidationError } = require('../utils/errors');

// POST /api/v1/contributions
const create = asyncHandler(async (req, res) => {
  const contribution = await contributionService.createContribution(req.body);
  return success(res, contribution, 201);
});

// POST /api/v1/contributions/:id/audio
const uploadAudio = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('An "audio" file field is required');
  }

  const audioMeta = await audioService.storeContributionAudio(req.file, {
    contributionId: req.params.id,
    durationSeconds: req.query.duration,
  });

  const contribution = await contributionService.attachAudio(req.params.id, audioMeta);
  return success(res, contribution);
});

// GET /api/v1/contributions/:id
// Lets an anonymous submitter check on the status of their own
// contribution using the id they received when they submitted it.
const getById = asyncHandler(async (req, res) => {
  const contribution = await contributionService.getContributionById(req.params.id);
  return success(res, contribution);
});

module.exports = { create, uploadAudio, getById };
