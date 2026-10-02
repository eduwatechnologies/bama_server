const { z } = require('zod');
const { objectId, paginationQuery } = require('./common');
const {
  CONTRIBUTION_TYPES,
  CONTRIBUTION_STATUSES,
  CONTENT_TYPES,
  REPORT_KINDS,
  ISSUE_CATEGORIES,
} = require('../models/Contribution');

const installationId = z.string().trim().min(8).max(100);

// Which report mode the submitter used, plus the triage category a PROBLEM
// report belongs to. Both optional: clients that predate these fields still
// validate, and the service derives the kind from the payload shape.
const reportFields = {
  reportKind: z.enum(REPORT_KINDS).optional(),
  issueCategory: z.enum(ISSUE_CATEGORIES).optional(),
};

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
  ...reportFields,
});

const audioContribution = z.object({
  type: z.literal('AUDIO'),
  contentType: z.enum(CONTENT_TYPES),
  contentId: objectId('contentId'),
  notes: z.string().trim().max(1000).optional(),
  installationId,
  ...reportFields,
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
    // Only CORRECTION and AUDIO carry report fields; Zod strips them from the
    // other shapes, so these rules never see a WORD/PHRASE/TRANSLATION entry.
    if (data.reportKind === 'TRANSLATION' && !data.suggestedHausa) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A TRANSLATION report must include suggestedHausa',
        path: ['suggestedHausa'],
      });
    }
    if (data.reportKind === 'ENGLISH' && !data.suggestedEnglish) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'An ENGLISH report must include suggestedEnglish',
        path: ['suggestedEnglish'],
      });
    }
    if (data.reportKind === 'PROBLEM' && !data.issueCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A PROBLEM report must include an issueCategory',
        path: ['issueCategory'],
      });
    }
    if (data.issueCategory && data.reportKind !== 'PROBLEM') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'issueCategory is only valid on a PROBLEM report',
        path: ['issueCategory'],
      });
    }
  });

const idParamSchema = z.object({ id: objectId('id') });

const listContributionsQuerySchema = paginationQuery.extend({
  status: z.enum(CONTRIBUTION_STATUSES).optional(),
  type: z.enum(CONTRIBUTION_TYPES).optional(),
  reportKind: z.enum(REPORT_KINDS).optional(),
  issueCategory: z.enum(ISSUE_CATEGORIES).optional(),
  actionable: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

const rejectContributionSchema = z.object({
  reviewNotes: z.string().trim().min(1, 'reviewNotes is required when rejecting').max(1000),
});

const approveContributionSchema = z.object({
  english: z.string().trim().max(500).optional(),
  hausa: z.string().trim().max(500).optional(),
  categoryId: objectId('categoryId').optional(),
});

/**
 * Closes a contribution without publishing the submitter's wording — used
 * for reports that describe a fault (e.g. a duplicate or a bad category) the
 * moderator has to fix themselves. The optional content fields let that fix
 * be applied in the same action.
 */
const resolveContributionSchema = z.object({
  reviewNotes: z.string().trim().min(1, 'reviewNotes is required when resolving').max(1000),
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
  resolveContributionSchema,
  uploadAudioParamsSchema,
  uploadAudioQuerySchema,
};
