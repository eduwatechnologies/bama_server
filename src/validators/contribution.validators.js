const { z } = require('zod');
const { objectId, paginationQuery } = require('./common');
const { CONTRIBUTION_TYPES, CONTRIBUTION_STATUSES, CONTENT_TYPES } = require('../models/Contribution');

const installationId = z.string().trim().min(8).max(100);

const wordOrPhraseContribution = z.object({
  type: z.enum(['WORD', 'PHRASE']),
  english: z.string().trim().min(1, 'English text is required').max(500),
  hausa: z.string().trim().min(1, 'Hausa translation is required').max(500),
  categoryId: objectId('categoryId'),
  notes: z.string().trim().max(1000).optional(),
  installationId,
});

const translationContribution = z.object({
  type: z.literal('TRANSLATION'),
  contentType: z.enum(CONTENT_TYPES),
  contentId: objectId('contentId'),
  hausa: z.string().trim().min(1, 'Hausa translation is required').max(500),
  notes: z.string().trim().max(1000).optional(),
  installationId,
});

const correctionContribution = z.object({
  type: z.literal('CORRECTION'),
  contentType: z.enum(CONTENT_TYPES),
  contentId: objectId('contentId'),
  suggestedEnglish: z.string().trim().max(500).optional(),
  suggestedHausa: z.string().trim().max(500).optional(),
  reason: z.string().trim().min(1, 'A reason for the correction is required').max(1000),
  installationId,
});

const audioContribution = z.object({
  type: z.literal('AUDIO'),
  contentType: z.enum(CONTENT_TYPES),
  contentId: objectId('contentId'),
  notes: z.string().trim().max(1000).optional(),
  installationId,
});

const createContributionSchema = z
  .discriminatedUnion('type', [
    wordOrPhraseContribution.extend({ type: z.literal('WORD') }),
    wordOrPhraseContribution.extend({ type: z.literal('PHRASE') }),
    translationContribution,
    correctionContribution,
    audioContribution,
  ])
  .superRefine((data, ctx) => {
    if (data.type === 'CORRECTION' && !data.suggestedEnglish && !data.suggestedHausa) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one of suggestedEnglish or suggestedHausa is required',
        path: ['suggestedEnglish'],
      });
    }
  });

const idParamSchema = z.object({ id: objectId('id') });

const listContributionsQuerySchema = paginationQuery.extend({
  status: z.enum(CONTRIBUTION_STATUSES).optional(),
  type: z.enum(CONTRIBUTION_TYPES).optional(),
});

const rejectContributionSchema = z.object({
  reviewNotes: z.string().trim().min(1, 'reviewNotes is required when rejecting').max(1000),
});

const approveContributionSchema = z.object({
  english: z.string().trim().max(500).optional(),
  hausa: z.string().trim().max(500).optional(),
  categoryId: objectId('categoryId').optional(),
});

const uploadAudioParamsSchema = z.object({
  id: objectId('id'),
});

const uploadAudioQuerySchema = z.object({
  duration: z.coerce.number().nonnegative().optional(),
});

module.exports = {
  createContributionSchema,
  idParamSchema,
  listContributionsQuerySchema,
  rejectContributionSchema,
  approveContributionSchema,
  uploadAudioParamsSchema,
  uploadAudioQuerySchema,
};
