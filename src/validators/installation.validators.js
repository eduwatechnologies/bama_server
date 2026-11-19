const { z } = require('zod');
const { PLATFORMS } = require('../models/Installation');

const registerInstallationSchema = z.object({
  installationId: z.string().trim().min(8).max(100),
  appVersion: z.string().trim().max(30).optional(),
  platform: z.enum(PLATFORMS).optional(),
  deviceLanguage: z.string().trim().max(20).optional(),
  contentVersion: z.coerce.number().int().min(0).optional(),
});

const syncQuerySchema = z.object({
  version: z.coerce.number().int().min(0).default(0),
  installationId: z.string().trim().min(8).max(100).optional(),
});

// Learning-path progress backup. Every field is optional so a client can push a
// partial snapshot; the server merges instead of overwriting.
const progressUpdateSchema = z.object({
  installationId: z.string().trim().min(8).max(100),
  learnedWordIds: z.array(z.string().trim().min(1).max(100)).max(10000).optional(),
  currentStreak: z.coerce.number().int().min(0).max(1000000).optional(),
  longestStreak: z.coerce.number().int().min(0).max(1000000).optional(),
  lastLearnedDate: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
      .optional()
  ),
  dailyGoal: z.coerce.number().int().min(1).max(100).optional(),
});

const progressQuerySchema = z.object({
  installationId: z.string().trim().min(8).max(100),
});

module.exports = {
  registerInstallationSchema,
  syncQuerySchema,
  progressUpdateSchema,
  progressQuerySchema,
};
