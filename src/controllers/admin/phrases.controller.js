const asyncHandler = require('../../middleware/asyncHandler');
const { success } = require('../../utils/apiResponse');
const Phrase = require('../../models/Phrase');
const contentService = require('../../services/content.service');

// GET /api/v1/admin/phrases
const listPhrases = asyncHandler(async (req, res) => {
  const { page, limit, status, category } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.categoryId = category;

  const [items, total] = await Promise.all([
    Phrase.find(filter)
      .populate('categoryId', 'name slug')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Phrase.countDocuments(filter),
  ]);

  return success(res, { items, total }, 200, { page, limit });
});

// POST /api/v1/admin/phrases
const createPhrase = asyncHandler(async (req, res) => {
  const phrase = await contentService.createContent('phrase', req.body, req.admin._id);
  return success(res, phrase, 201);
});

// GET /api/v1/admin/phrases/:id
const getPhrase = asyncHandler(async (req, res) => {
  const phrase = await contentService.getContentById('phrase', req.params.id);
  return success(res, phrase);
});

// PATCH /api/v1/admin/phrases/:id
const updatePhrase = asyncHandler(async (req, res) => {
  const phrase = await contentService.updateContent(
    'phrase',
    req.params.id,
    req.body,
    req.admin._id
  );
  return success(res, phrase);
});

// DELETE /api/v1/admin/phrases/:id  (soft delete / archive)
const deletePhrase = asyncHandler(async (req, res) => {
  const phrase = await contentService.archiveContent('phrase', req.params.id, req.admin._id);
  return success(res, phrase);
});

module.exports = { listPhrases, createPhrase, getPhrase, updatePhrase, deletePhrase };
