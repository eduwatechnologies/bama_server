const { z } = require('zod');

/**
 * Language code pattern: 2-3 lowercase letters, optionally followed by
 * a hyphen and 2 uppercase letters (e.g. 'en', 'ha', 'yo', 'zh-CN').
 */
const languageCodeRegex = /^[a-z]{2,3}(-[A-Z]{2})?$/;

/**
 * Language code parameter (e.g., 'en', 'ha', 'yo')
 */
const languageCodeParamSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(languageCodeRegex, 'Invalid language code format (e.g., en, ha, zh-CN)'),
});

/**
 * Schema for creating a new language
 */
const createLanguageSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(languageCodeRegex, 'Invalid language code format (e.g., en, ha, zh-CN)'),
  name: z.string().trim().min(1).max(50),
  nativeName: z.string().trim().min(1).max(50),
  isRTL: z.boolean().default(false),
  flag: z.string().trim().max(10).default(''),
  isActive: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
});

/**
 * Schema for updating a language (all fields optional, at least one required)
 */
const updateLanguageSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    nativeName: z.string().trim().min(1).max(50).optional(),
    isRTL: z.boolean().optional(),
    flag: z.string().trim().max(10).optional(),
    isActive: z.boolean().optional(),
    order: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

module.exports = {
  createLanguageSchema,
  updateLanguageSchema,
  languageCodeParamSchema,
};