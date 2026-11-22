const mongoose = require('mongoose');
const env = require('../config/env');

// Persisted, dashboard-editable app-wide settings. A single document (keyed by
// `key = 'app'`) holds the in-app update gate that the mobile app reads from
// GET /api/v1/app/version. Defaults are seeded from the environment on first
// access, so the existing APP_* variables keep working as the initial values.
const SINGLETON_KEY = 'app';

const appUpdateSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    latestVersion: { type: String, trim: true, default: '0.0.0' },
    minVersion: { type: String, trim: true, default: '0.0.0' },
    storeUrl: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const appSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: SINGLETON_KEY },
    appUpdate: { type: appUpdateSchema, default: () => ({}) },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

const AppSettings = mongoose.model('AppSettings', appSettingsSchema);

function defaultAppUpdate() {
  const { enabled, latestVersion, minVersion, storeUrl, message } = env.appUpdate;
  return { enabled, latestVersion, minVersion, storeUrl, message: message || '' };
}

async function getAppSettings() {
  const existing = await AppSettings.findOne({ key: SINGLETON_KEY });
  if (existing) return existing;
  try {
    return await AppSettings.create({ key: SINGLETON_KEY, appUpdate: defaultAppUpdate() });
  } catch (err) {
    // Concurrent first reads can race on the unique key; fall back to the
    // document the other request just created.
    if (err.code === 11000) return AppSettings.findOne({ key: SINGLETON_KEY });
    throw err;
  }
}

async function updateAppUpdate(patch, adminId) {
  const settings = await getAppSettings();
  Object.entries(patch).forEach(([field, value]) => {
    if (value !== undefined) settings.appUpdate[field] = value;
  });
  if (adminId) settings.updatedBy = adminId;
  await settings.save();
  return settings;
}

module.exports = { AppSettings, getAppSettings, updateAppUpdate, SINGLETON_KEY };
