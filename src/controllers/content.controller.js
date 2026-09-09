const asyncHandler = require('../middleware/asyncHandler');
const { success } = require('../utils/apiResponse');
const Category = require('../models/Category');
const contentService = require('../services/content.service');
const { NotFoundError } = require('../utils/errors');

// GET /api/v1/content
const listContent = asyncHandler(async (req, res) => {
  const { type, category, page, limit } = req.query;
  const results = await contentService.listContent({ type, category, page, limit });
  return success(res, results, 200, { page, limit });
});

// GET /api/v1/content/:id
// Type is inferred by checking Word first, then Phrase, since public
// content is addressed by a single id space in the routes.
const getContentById = asyncHandler(async (req, res) => {
  const Word = require('../models/Word');
  const Phrase = require('../models/Phrase');

  let doc = await Word.findOne({ _id: req.params.id, status: 'PUBLISHED' }).populate(
    'categoryId',
    'name slug'
  );
  let type = 'word';

  if (!doc) {
    doc = await Phrase.findOne({ _id: req.params.id, status: 'PUBLISHED' }).populate(
      'categoryId',
      'name slug'
    );
    type = 'phrase';
  }

  if (!doc) throw new NotFoundError('Content not found');
  return success(res, { type, ...doc.toObject() });
});

// GET /api/v1/content/search
const searchContent = asyncHandler(async (req, res) => {
  const { q, type, category, page, limit } = req.query;
  const results = await contentService.searchContent({ q, type, category, page, limit });
  return success(res, results, 200, { page, limit, query: q });
});

// GET /api/v1/categories
const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ status: 'ACTIVE' }).sort({ name: 1 });
  return success(res, categories);
});

// GET /api/v1/categories/:id/content
const getCategoryContent = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new NotFoundError('Category not found');

  const { page, limit } = req.query;
  const results = await contentService.listContent({
    category: category.slug,
    page,
    limit,
  });
  return success(res, { category, ...results }, 200, { page, limit });
});

module.exports = {
  listContent,
  getContentById,
  searchContent,
  listCategories,
  getCategoryContent,
};
