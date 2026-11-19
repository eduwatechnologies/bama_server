const mongoose = require('mongoose');

const AD_EVENT_TYPES = ['IMPRESSION', 'CLICK'];

const adEventSchema = new mongoose.Schema(
  {
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
    type: { type: String, required: true, enum: AD_EVENT_TYPES },
    placement: { type: String, trim: true, uppercase: true, maxlength: 80 },
    installationId: { type: String, trim: true, maxlength: 100 },
    platform: { type: String, trim: true, maxlength: 20 },
    appVersion: { type: String, trim: true, maxlength: 30 },
    targetUrl: { type: String, trim: true, maxlength: 2000 },
    // When the interaction happened on the device. Kept separate from
    // createdAt (ingest time) because queued offline events arrive later.
    occurredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

adEventSchema.index({ adId: 1, type: 1, occurredAt: -1 });
adEventSchema.index({ placement: 1, occurredAt: -1 });

const AdEvent = mongoose.model('AdEvent', adEventSchema);

module.exports = AdEvent;
module.exports.AD_EVENT_TYPES = AD_EVENT_TYPES;
