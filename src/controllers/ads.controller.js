const asyncHandler = require('../middleware/asyncHandler');
const { success } = require('../utils/apiResponse');
const adService = require('../services/ad.service');

const list = asyncHandler(async (req, res) => {
  const ads = await adService.listPublicAds(req.query);
  return success(res, ads);
});

module.exports = { list };
