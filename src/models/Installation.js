const mongoose = require('mongoose');

const PLATFORMS = ['android', 'ios', 'other'];

const installationSchema = new mongoose.Schema(
  {
    installationId: { type: String, required: true, unique: true, trim: true },
    appVersion: { type: String, trim: true, maxlength: 30 },
    platform: { type: String, enum: PLATFORMS, default: 'other' },
    deviceLanguage: { type: String, trim: true, maxlength: 20 },
    contentVersion: { type: Number, default: 0 },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    lastSyncAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Installation', installationSchema);
module.exports.PLATFORMS = PLATFORMS;
