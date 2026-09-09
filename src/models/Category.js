const mongoose = require('mongoose');

const CATEGORY_STATUSES = ['ACTIVE', 'INACTIVE'];

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'],
    },
    description: { type: String, trim: true, maxlength: 500 },
    icon: { type: String, trim: true },
    status: { type: String, enum: CATEGORY_STATUSES, default: 'ACTIVE' },
  },
  { timestamps: true }
);

categorySchema.index({ status: 1 });

module.exports = mongoose.model('Category', categorySchema);
module.exports.CATEGORY_STATUSES = CATEGORY_STATUSES;
