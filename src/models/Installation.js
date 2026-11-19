const mongoose = require('mongoose');

const PLATFORMS = ['android', 'ios', 'other'];

// Optional, anonymous learning-path progress backup. The device remains the
// source of truth (the app works fully offline); this is only a restore point.
const progressSchema = new mongoose.Schema(
  {
    learnedWordIds: { type: [String], default: [] },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastLearnedDate: { type: String, default: null, maxlength: 10 },
    dailyGoal: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const installationSchema = new mongoose.Schema(
  {
    installationId: { type: String, required: true, unique: true, trim: true },
    appVersion: { type: String, trim: true, maxlength: 30 },
    platform: { type: String, enum: PLATFORMS, default: 'other' },
    deviceLanguage: { type: String, trim: true, maxlength: 20 },
    contentVersion: { type: Number, default: 0 },
    progress: { type: progressSchema, default: () => ({}) },
    progressUpdatedAt: { type: Date },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    lastSyncAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Installation', installationSchema);
module.exports.PLATFORMS = PLATFORMS;
