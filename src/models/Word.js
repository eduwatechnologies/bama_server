const mongoose = require('mongoose');

const CONTENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

const audioSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true },
    storageKey: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number },
    duration: { type: Number },
  },
  { _id: false }
);

const exampleSentenceSchema = new mongoose.Schema(
  {
    english: { type: String, trim: true, maxlength: 500 },
    hausa: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const wordSchema = new mongoose.Schema(
  {
    english: { type: String, required: true, trim: true, maxlength: 200 },
    hausa: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    exampleSentence: { type: exampleSentenceSchema, default: undefined },
    audio: { type: audioSchema, default: undefined },
    status: { type: String, enum: CONTENT_STATUSES, default: 'DRAFT' },
    // Global content version this record was last touched at. Used by
    // the sync endpoint to compute incremental changes.
    version: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

wordSchema.index({ english: 'text', hausa: 'text', description: 'text' });
wordSchema.index({ status: 1, version: 1 });
wordSchema.index({ categoryId: 1, status: 1 });

module.exports = mongoose.model('Word', wordSchema);
module.exports.CONTENT_STATUSES = CONTENT_STATUSES;
