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

/**
 * Per-language audio map. Keys are language codes (e.g., 'en', 'ha', 'yo').
 * Using strict: false to allow dynamic language fields.
 */
const audioMapSchema = new mongoose.Schema({}, { _id: false, strict: false });

/**
 * Translations map. Keys are language codes.
 * English ('en') is required as the base language.
 * Using strict: false to allow dynamic language fields.
 */
const translationsSchema = new mongoose.Schema(
  {
    en: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false, strict: false }
);

const phraseSchema = new mongoose.Schema(
  {
    /** Translations keyed by language code (e.g., { en: 'Good morning', ha: 'Ina kwana', yo: 'E kaaro' }) */
    translations: { type: translationsSchema, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    /** Audio URLs keyed by language code (e.g., { en: null, ha: 'url', yo: 'url' }) */
    audio: { type: audioMapSchema, default: {} },
    status: { type: String, enum: CONTENT_STATUSES, default: 'DRAFT' },
    version: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

// Text index on English translation field
phraseSchema.index({ 'translations.en': 'text' });
phraseSchema.index({ status: 1, version: 1 });
phraseSchema.index({ categoryId: 1, status: 1 });

// Virtual for backward compatibility - returns English translation
phraseSchema.virtual('english').get(function () {
  return this.translations?.en ?? '';
});

// Virtual for backward compatibility - returns Hausa translation
phraseSchema.virtual('hausa').get(function () {
  return this.translations?.ha ?? '';
});

// Ensure virtuals are included in JSON output
phraseSchema.set('toJSON', { virtuals: true });
phraseSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Phrase', phraseSchema);
