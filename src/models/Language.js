const mongoose = require('mongoose');

const languageSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z]{2,3}(-[A-Z]{2})?$/, 'Invalid language code format (e.g., en, ha, zh-CN)'],
    },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    nativeName: { type: String, required: true, trim: true, maxlength: 50 },
    isRTL: { type: Boolean, default: false },
    flag: { type: String, trim: true, maxlength: 10 },
    isBase: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

languageSchema.index({ isActive: 1, order: 1 });
languageSchema.index({ code: 1 }, { unique: true });

languageSchema.pre('save', async function (next) {
  if (this.code === 'en') {
    this.isBase = true;
    this.isActive = true;
    this.order = 0;
  }
  next();
});

const Language = mongoose.model('Language', languageSchema);

module.exports = Language;