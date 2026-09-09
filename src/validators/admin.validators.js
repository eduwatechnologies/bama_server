const { z } = require('zod');
const { ADMIN_ROLES } = require('../models/Admin');

const loginSchema = z.object({
  email: z.string().trim().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

const createAdminSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(ADMIN_ROLES).default('EDITOR'),
});

module.exports = { loginSchema, refreshSchema, createAdminSchema };
