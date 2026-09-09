// One-off script: creates (or updates) the first SUPER_ADMIN account from
// SEED_ADMIN_* environment variables. Run with: npm run seed:admin
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../config/env');
const Admin = require('../models/Admin');
const { hashPassword } = require('../services/adminAuth.service');
const logger = require('./logger');

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set');
  }
  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters');
  }

  await mongoose.connect(env.mongodbUri);

  const passwordHash = await hashPassword(password);
  const admin = await Admin.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $set: { name, passwordHash, role: 'SUPER_ADMIN', isActive: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  logger.info({ email: admin.email }, 'Seeded SUPER_ADMIN account');
  await mongoose.disconnect();
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, 'Failed to seed admin');
    process.exit(1);
  });
