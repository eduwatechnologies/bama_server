const asyncHandler = require('../../middleware/asyncHandler');
const { success } = require('../../utils/apiResponse');
const Language = require('../../models/Language');
const { NotFoundError, ValidationError } = require('../../utils/errors');

// GET /api/v1/admin/languages
const listLanguages = asyncHandler(async (req, res) => {
  const languages = await Language.find().sort({ order: 1, code: 1 });
  return success(res, languages);
});

// POST /api/v1/admin/languages
const createLanguage = asyncHandler(async (req, res) => {
  const { code, name, nativeName, isRTL, flag, isActive, order } = req.body;

  if (!code || !name || !nativeName) {
    throw new ValidationError('code, name, and nativeName are required');
  }

  const existing = await Language.findOne({ code: code.toLowerCase() });
  if (existing) {
    throw new ValidationError('Language with this code already exists');
  }

  const language = await Language.create({
    code: code.toLowerCase(),
    name,
    nativeName,
    isRTL: isRTL ?? false,
    flag: flag ?? '',
    isActive: isActive ?? false,
    order: order ?? 0,
    createdBy: req.admin._id,
    updatedBy: req.admin._id,
  });

  return success(res, language, 201);
});

// GET /api/v1/admin/languages/:code
const getLanguage = asyncHandler(async (req, res) => {
  const language = await Language.findOne({ code: req.params.code.toLowerCase() });
  if (!language) throw new NotFoundError('Language not found');
  return success(res, language);
});

// PATCH /api/v1/admin/languages/:code
const updateLanguage = asyncHandler(async (req, res) => {
  const { name, nativeName, isRTL, flag, isActive, order } = req.body;

  const language = await Language.findOne({ code: req.params.code.toLowerCase() });
  if (!language) throw new NotFoundError('Language not found');

  // Prevent deactivating English (base language)
  if (language.code === 'en' && isActive === false) {
    throw new ValidationError('Cannot deactivate the base language (English)');
  }

  if (name !== undefined) language.name = name;
  if (nativeName !== undefined) language.nativeName = nativeName;
  if (isRTL !== undefined) language.isRTL = isRTL;
  if (flag !== undefined) language.flag = flag;
  if (isActive !== undefined) language.isActive = isActive;
  if (order !== undefined) language.order = order;

  language.updatedBy = req.admin._id;
  await language.save();

  return success(res, language);
});

// DELETE /api/v1/admin/languages/:code
const deleteLanguage = asyncHandler(async (req, res) => {
  const language = await Language.findOne({ code: req.params.code.toLowerCase() });
  if (!language) throw new NotFoundError('Language not found');

  // Prevent deleting English (base language)
  if (language.code === 'en') {
    throw new ValidationError('Cannot delete the base language (English)');
  }

  await language.deleteOne();
  return success(res, { message: 'Language deleted' });
});

module.exports = { listLanguages, createLanguage, getLanguage, updateLanguage, deleteLanguage };