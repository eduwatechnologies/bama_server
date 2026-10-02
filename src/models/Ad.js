const mongoose = require('mongoose');

const AD_TYPES = ['GOOGLE', 'PERSONAL'];
const AD_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'];
const GOOGLE_AD_FORMATS = ['BANNER', 'INTERSTITIAL', 'REWARDED', 'NATIVE'];

const googleAdSchema = new mongoose.Schema(
  {
    adUnitId: { type: String, required: true, trim: true, maxlength: 100 },
    format: { type: String, required: true, enum: GOOGLE_AD_FORMATS },
    testMode: { type: Boolean, default: false },
  },
  { _id: false }
);

const personalAdSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    body: { type: String, required: true, trim: true, maxlength: 500 },
    imageUrl: { type: String, trim: true, maxlength: 2000 },
    imageUrls: { type: [String], default: undefined },
    targetUrl: { type: String, trim: true, maxlength: 2000 },
    ctaText: { type: String, trim: true, maxlength: 30 },
  },
  { _id: false }
);

const adSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, required: true, enum: AD_TYPES },
    placement: { type: String, required: true, trim: true, uppercase: true, maxlength: 80 },
    status: { type: String, enum: AD_STATUSES, default: 'DRAFT' },
    priority: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date },
    endsAt: { type: Date },
    google: {
      type: googleAdSchema,
      required: function () {
        return this.type === 'GOOGLE';
      },
      default: undefined,
    },
    personal: {
      type: personalAdSchema,
      required: function () {
        return this.type === 'PERSONAL';
      },
      default: undefined,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

adSchema.index({ type: 1, status: 1, placement: 1 });
adSchema.index({ status: 1, startsAt: 1, endsAt: 1, priority: -1 });
adSchema.index({ name: 'text', 'google.adUnitId': 'text', 'personal.title': 'text', 'personal.body': 'text' });

adSchema.pre('validate', function validateAd(next) {
  if (this.type === 'GOOGLE' && this.personal) {
    return next(new Error('Personal ad content is not allowed for Google ads'));
  }
  if (this.type === 'PERSONAL' && this.google) {
    return next(new Error('Google ad content is not allowed for personal ads'));
  }
  if (this.startsAt && this.endsAt && this.endsAt <= this.startsAt) {
    return next(new Error('endsAt must be later than startsAt'));
  }
  return next();
});

const Ad = mongoose.model('Ad', adSchema);

module.exports = Ad;
module.exports.AD_TYPES = AD_TYPES;
module.exports.AD_STATUSES = AD_STATUSES;
module.exports.GOOGLE_AD_FORMATS = GOOGLE_AD_FORMATS;
