const asyncHandler = require('../../middleware/asyncHandler');
const { success } = require('../../utils/apiResponse');
const Category = require('../../models/Category');
const { NotFoundError } = require('../../utils/errors');

// GET /api/v1/admin/categories
const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  return success(res, categories);
});

// POST /api/v1/admin/categories
const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  return success(res, category, 201);
});

// PATCH /api/v1/admin/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!category) throw new NotFoundError('Category not found');
  return success(res, category);
});

module.exports = { listCategories, createCategory, updateCategory };
