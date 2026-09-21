const asyncHandler = require('../../middleware/asyncHandler');
const { success } = require('../../utils/apiResponse');
const adService = require('../../services/ad.service');

const list = asyncHandler(async (req, res) => {
  const result = await adService.listAds(req.query);
  return success(res, result, 200, { page: req.query.page, limit: req.query.limit });
});

const get = asyncHandler(async (req, res) => {
  const ad = await adService.getAd(req.params.id);
  return success(res, ad);
});

const create = asyncHandler(async (req, res) => {
  const ad = await adService.createAd(req.body, req.admin._id);
  return success(res, ad, 201);
});

const update = asyncHandler(async (req, res) => {
  const ad = await adService.updateAd(req.params.id, req.body, req.admin._id);
  return success(res, ad);
});

const archive = asyncHandler(async (req, res) => {
  const ad = await adService.archiveAd(req.params.id, req.admin._id);
  return success(res, ad);
});

module.exports = { list, get, create, update, archive };
