const { z } = require('zod');
const { objectId, paginationQuery } = require('./common');
const { AD_TYPES, AD_STATUSES, GOOGLE_AD_FORMATS } = require('../models/Ad');

const emptyToUndefined = (value) =>
  value === '' || value === null || value === undefined ? undefined : value;

const optionalDate = z
  .preprocess(
    emptyToUndefined,
    z.coerce.date()
  )
  .optional();

const optionalUrl = z
  .preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .url('Must be a valid URL')
      .max(2000)
      .refine((value) => /^https?:\/\//i.test(value), 'URL must use http or https')
  )
  .optional();

const imageUrl = z
  .string()
  .trim()
  .url('Must be a valid URL')
  .max(2000)
  .refine((value) => /^https?:\/\//i.test(value), 'URL must use http or https');

// Carousel creatives. Kept alongside the legacy single `imageUrl` so existing
// ads keep working; clients should send both with imageUrl as the first entry.
const imageUrls = z
  .preprocess(
    emptyToUndefined,
    z.array(imageUrl).max(10, 'A personal ad can carry up to 10 images')
  )
  .optional();

const placementSchema = z
  .string()
  .trim()
  .min(1, 'Placement is required')
  .max(80)
  .transform((value) => value.toUpperCase());

const commonCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  placement: placementSchema,
  status: z.enum(AD_STATUSES).default('DRAFT'),
  priority: z.coerce.number().int().min(0).max(1000).default(0),
  startsAt: optionalDate,
  endsAt: optionalDate,
});

const googleAdSchema = z.object({
  adUnitId: z.string().trim().min(1, 'Google ad unit ID is required').max(100),
  format: z.enum(GOOGLE_AD_FORMATS),
  testMode: z.boolean().default(false),
});

const personalAdSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100),
  body: z.string().trim().min(1, 'Body is required').max(500),
  imageUrl: optionalUrl,
  imageUrls,
  targetUrl: optionalUrl,
  ctaText: z.preprocess(emptyToUndefined, z.string().trim().max(30)).optional(),
});

const createAdSchema = z.discriminatedUnion('type', [
  commonCreateSchema.extend({
    type: z.literal('GOOGLE'),
    google: googleAdSchema,
  }),
  commonCreateSchema.extend({
    type: z.literal('PERSONAL'),
    personal: personalAdSchema,
  }),
]);

const commonUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100).optional(),
  placement: placementSchema.optional(),
  status: z.enum(AD_STATUSES).optional(),
  priority: z.coerce.number().int().min(0).max(1000).optional(),
  startsAt: optionalDate,
  endsAt: optionalDate,
});

const updateAdSchema = z
  .object({
    type: z.enum(AD_TYPES).optional(),
    ...commonUpdateSchema.shape,
    google: googleAdSchema.partial().optional(),
    personal: personalAdSchema.partial().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.google && value.personal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Only one ad provider payload is allowed',
        path: ['google'],
      });
    }
    if (value.type === 'GOOGLE' && value.personal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Personal ad content is not allowed for Google ads',
        path: ['personal'],
      });
    }
    if (value.type === 'PERSONAL' && value.google) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Google ad content is not allowed for personal ads',
        path: ['google'],
      });
    }
    if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endsAt must be later than startsAt',
        path: ['endsAt'],
      });
    }
  });

const idParamSchema = z.object({ id: objectId('id') });

const listAdsQuerySchema = paginationQuery.extend({
  type: z.enum(AD_TYPES).optional(),
  status: z.enum(AD_STATUSES).optional(),
  placement: placementSchema.optional(),
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100)).optional(),
});

const publicAdsQuerySchema = z.object({
  type: z.enum(AD_TYPES).optional(),
  placement: placementSchema.optional(),
  limit: z.coerce.number().int().min(1).max(20).default(20),
});

module.exports = {
  createAdSchema,
  updateAdSchema,
  idParamSchema,
  listAdsQuerySchema,
  publicAdsQuerySchema,
};
