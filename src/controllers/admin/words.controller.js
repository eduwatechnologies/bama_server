const asyncHandler = require('../../middleware/asyncHandler');
const { success } = require('../../utils/apiResponse');
const Word = require('../../models/Word');
const contentService = require('../../services/content.service');

// GET /api/v1/admin/words
const listWords = asyncHandler(async (req, res) => {
  const { page, limit, status, category } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.categoryId = category;

  const [items, total] = await Promise.all([
    Word.find(filter)
      .populate('categoryId', 'name slug')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Word.countDocuments(filter),
  ]);

  return success(res, { items, total }, 200, { page, limit });
});

// POST /api/v1/admin/words
const createWord = asyncHandler(async (req, res) => {
  const word = await contentService.createContent('word', req.body, req.admin._id);
  return success(res, word, 201);
});

// GET /api/v1/admin/words/:id
const getWord = asyncHandler(async (req, res) => {
  const word = await contentService.getContentById('word', req.params.id);
  return success(res, word);
});

// PATCH /api/v1/admin/words/:id
const updateWord = asyncHandler(async (req, res) => {
  const word = await contentService.updateContent('word', req.params.id, req.body, req.admin._id);
  return success(res, word);
});

// DELETE /api/v1/admin/words/:id  (soft delete / archive)
const deleteWord = asyncHandler(async (req, res) => {
  const word = await contentService.archiveContent('word', req.params.id, req.admin._id);
  return success(res, word);
});

module.exports = { listWords, createWord, getWord, updateWord, deleteWord };
