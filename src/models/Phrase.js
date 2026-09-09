const mongoose = require('mongoose');
const { CONTENT_STATUSES } = require('./Word');

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

const phraseSchema = new mongoose.Schema(
  {
    english: { type: String, required: true, trim: true, maxlength: 500 },
    hausa: { type: String, required: true, trim: true, maxlength: 500 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    audio: { type: audioSchema, default: undefined },
    status: { type: String, enum: CONTENT_STATUSES, default: 'DRAFT' },
    version: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

phraseSchema.index({ english: 'text', hausa: 'text' });
phraseSchema.index({ status: 1, version: 1 });
phraseSchema.index({ categoryId: 1, status: 1 });

module.exports = mongoose.model('Phrase', phraseSchema);
