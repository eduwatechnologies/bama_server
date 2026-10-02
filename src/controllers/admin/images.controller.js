const asyncHandler = require('../../middleware/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { ValidationError } = require('../../utils/errors');
const imageService = require('../../services/image.service');

// POST /api/v1/admin/images/upload
// Authenticated admin route. Expects multipart form with a single "image"
// file and an optional ?scope= (defaults to "ads"). Returns the stored
// image metadata: { url, storageKey, mimeType, size }
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('An "image" file field is required');
  }

  const meta = await imageService.storeImage(req.file, {
    scope: req.query.scope || 'ads',
  });

  return success(res, meta, 201);
});

module.exports = { uploadImage };
