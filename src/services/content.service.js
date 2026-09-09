const Word = require('../models/Word');
const Phrase = require('../models/Phrase');
const Category = require('../models/Category');
const { getNextValue, getCurrentValue } = require('../models/Counter');
const { NotFoundError, ValidationError } = require('../utils/errors');

const CONTENT_VERSION_COUNTER = 'contentVersion';
const MODEL_BY_TYPE = { word: Word, phrase: Phrase };

function modelFor(type) {
  const Model = MODEL_BY_TYPE[type];
  if (!Model) throw new ValidationError(`Unsupported content type: ${type}`);
  return Model;
}

async function getCurrentContentVersion() {
  return getCurrentValue(CONTENT_VERSION_COUNTER);
}

async function assertCategoryExists(categoryId) {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ValidationError('categoryId does not reference an existing category');
  }
  return category;
}

/**
 * Creates a word/phrase. If created with status PUBLISHED, it is stamped
 * with a new global content version immediately.
 */
async function createContent(type, data, adminId) {
  const Model = modelFor(type);
  if (data.categoryId) await assertCategoryExists(data.categoryId);

  const payload = { ...data, createdBy: adminId, updatedBy: adminId };
  if (payload.status === 'PUBLISHED') {
    payload.version = await getNextValue(CONTENT_VERSION_COUNTER);
  }
  return Model.create(payload);
}

async function getContentById(type, id) {
  const Model = modelFor(type);
  const doc = await Model.findById(id).populate('categoryId', 'name slug');
  if (!doc) throw new NotFoundError(`${type} not found`);
  return doc;
}

/**
 * Updates a word/phrase. Any update that leaves the record PUBLISHED
 * (or transitions it to/from PUBLISHED/ARCHIVED) bumps the global
 * content version so the change is picked up on next sync.
 */
async function updateContent(type, id, data, adminId) {
  const Model = modelFor(type);
  const doc = await Model.findById(id);
  if (!doc) throw new NotFoundError(`${type} not found`);

  if (data.categoryId) await assertCategoryExists(data.categoryId);

  const willBePublished = (data.status || doc.status) === 'PUBLISHED';
  const statusChanging = data.status && data.status !== doc.status;

  Object.assign(doc, data, { updatedBy: adminId });

  if (willBePublished && (statusChanging || doc.isModified())) {
    doc.version = await getNextValue(CONTENT_VERSION_COUNTER);
  }

  await doc.save();
  return doc;
}

/**
 * Soft-deletes by archiving. Sync treats ARCHIVED items newer than the
 * client's version as deletions, so mobile clients remove them locally.
 */
async function archiveContent(type, id, adminId) {
  const Model = modelFor(type);
  const doc = await Model.findById(id);
  if (!doc) throw new NotFoundError(`${type} not found`);

  doc.status = 'ARCHIVED';
  doc.updatedBy = adminId;
  doc.version = await getNextValue(CONTENT_VERSION_COUNTER);
  await doc.save();
  return doc;
}

async function listContent({ type, category, status, page, limit }) {
  const results = {};
  const types = type ? [type] : ['word', 'phrase'];

  for (const t of types) {
    const Model = modelFor(t);
    const filter = {};
    if (status) filter.status = status;
    else filter.status = 'PUBLISHED'; // public listing defaults to published-only

    if (category) {
      const cat = await Category.findOne({ slug: category });
      filter.categoryId = cat ? cat._id : null;
    }

    const [items, total] = await Promise.all([
      Model.find(filter)
        .populate('categoryId', 'name slug')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Model.countDocuments(filter),
    ]);

    results[t] = { items, total };
  }

  return results;
}

async function searchContent({ q, type, category, page, limit }) {
  const types = type ? [type] : ['word', 'phrase'];
  const results = {};

  let categoryId;
  if (category) {
    const cat = await Category.findOne({ slug: category });
    categoryId = cat ? cat._id : null;
  }

  for (const t of types) {
    const Model = modelFor(t);
    const filter = {
      status: 'PUBLISHED',
      $text: { $search: q },
    };
    if (categoryId !== undefined) filter.categoryId = categoryId;

    const [items, total] = await Promise.all([
      Model.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('categoryId', 'name slug'),
      Model.countDocuments(filter),
    ]);

    results[t] = { items, total };
  }

  return results;
}

module.exports = {
  CONTENT_VERSION_COUNTER,
  getCurrentContentVersion,
  createContent,
  getContentById,
  updateContent,
  archiveContent,
  listContent,
  searchContent,
};
