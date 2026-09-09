const asyncHandler = require('../../middleware/asyncHandler');
const { success, badRequest } = require('../../utils/apiResponse');
const { ValidationError } = require('../../utils/errors');
const audioService = require('../../services/audio.service');
const storage = require('../../services/storage');

// POST /api/v1/admin/audio/upload
// Authenticated admin route. Expects multipart form with a single "audio" file.
// Returns the stored audio metadata shape used by the rest of the app:
//   { url, storageKey, mimeType, size, duration }
const uploadAudio = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('An "audio" file field is required');
  }

  // durationSeconds is optional; default to 0 when the caller did not send it.
  const durationSeconds = req.query.duration ? Number(req.query.duration) : 0;
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    return badRequest(res, { message: 'duration must be a non-negative number' });
  }

  const meta = await audioService.storeContributionAudio(req.file, {
    contributionId: req.query.contributionId || 'admin-upload',
    durationSeconds,
  });

  return success(res, meta, 201);
});

module.exports = { uploadAudio };
