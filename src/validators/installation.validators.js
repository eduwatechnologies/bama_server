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

module.exports = { registerInstallationSchema, syncQuerySchema };
