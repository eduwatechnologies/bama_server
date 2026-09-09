const { z } = require('zod');
const { objectId, paginationQuery } = require('./common');
const { CONTENT_STATUSES } = require('../models/Word');
const { CATEGORY_STATUSES } = require('../models/Category');

const exampleSentenceSchema = z
  .object({
    english: z.string().trim().max(500).optional(),
    hausa: z.string().trim().max(500).optional(),
  })
  .optional();

const audioSchema = z
  .object({
    url: z.string().trim().url().optional(),
    storageKey: z.string().trim().optional(),
    mimeType: z.string().trim().optional(),
    size: z.number().nonnegative().optional(),
    duration: z.number().nonnegative().optional(),
  })
  .optional();

const createWordSchema = z.object({
  english: z.string().trim().min(1, 'English text is required').max(200),
  hausa: z.string().trim().min(1, 'Hausa translation is required').max(200),
  description: z.string().trim().max(1000).optional(),
  categoryId: objectId('categoryId'),
  exampleSentence: exampleSentenceSchema,
  audio: audioSchema,
  status: z.enum(CONTENT_STATUSES).optional(),
});

const updateWordSchema = createWordSchema.partial();

const createPhraseSchema = z.object({
  english: z.string().trim().min(1, 'English text is required').max(500),
  hausa: z.string().trim().min(1, 'Hausa translation is required').max(500),
  categoryId: objectId('categoryId'),
  audio: audioSchema,
  status: z.enum(CONTENT_STATUSES).optional(),
});

const updatePhraseSchema = createPhraseSchema.partial();

const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().optional(),
  status: z.enum(CATEGORY_STATUSES).optional(),
});

const updateCategorySchema = createCategorySchema.partial();

const idParamSchema = z.object({ id: objectId('id') });

const listContentQuerySchema = paginationQuery.extend({
  type: z.enum(['word', 'phrase']).optional(),
  category: z.string().trim().optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
});

const searchQuerySchema = paginationQuery.extend({
  q: z.string().trim().min(1, 'Search query "q" is required').max(200),
  type: z.enum(['word', 'phrase']).optional(),
  category: z.string().trim().optional(),
});

module.exports = {
  createWordSchema,
  updateWordSchema,
  createPhraseSchema,
  updatePhraseSchema,
  createCategorySchema,
  updateCategorySchema,
  idParamSchema,
  listContentQuerySchema,
  searchQuerySchema,
};
