const { z } = require('zod');

const versionRegex = /^\d+\.\d+\.\d+$/;

/**
 * Partial update of the app-update gate shown to the mobile app. Every field
 * is optional, but at least one must be present.
 */
const updateAppUpdateSchema = z
  .object({
    enabled: z.boolean().optional(),
    latestVersion: z
      .string()
      .trim()
      .regex(versionRegex, 'Use semantic versioning, e.g. 1.2.0.')
      .optional(),
    minVersion: z
      .string()
      .trim()
      .regex(versionRegex, 'Use semantic versioning, e.g. 1.0.0.')
      .optional(),
    storeUrl: z
      .string()
      .trim()
      .max(500)
      .refine((value) => value === '' || /^https?:\/\/\S+$/i.test(value), {
        message: 'Enter a valid http(s) URL.',
      })
      .optional(),
    message: z.string().trim().max(300).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided.',
  });

module.exports = { updateAppUpdateSchema };
