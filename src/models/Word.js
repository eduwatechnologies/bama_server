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
    en: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: false, strict: false }
);

/**
 * Example sentences per language.
 * Using strict: false to allow dynamic language fields.
 */
const exampleSentenceSchema = new mongoose.Schema({}, { _id: false, strict: false });

const wordSchema = new mongoose.Schema(
  {
    /** Translations keyed by language code (e.g., { en: 'Water', ha: 'Ruwa', yo: 'Omi' }) */
    translations: { type: translationsSchema, required: true },
    description: { type: String, trim: true, maxlength: 1000 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    exampleSentence: { type: exampleSentenceSchema, default: undefined },
    /** Audio URLs keyed by language code (e.g., { en: null, ha: 'url', yo: 'url' }) */
    audio: { type: audioMapSchema, default: {} },
    status: { type: String, enum: CONTENT_STATUSES, default: 'DRAFT' },
    // Global content version this record was last touched at. Used by
    // the sync endpoint to compute incremental changes.
    version: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

// Text index on all translation fields - we index the 'en' field for now
// Additional languages can be added to the index as needed
wordSchema.index({ 'translations.en': 'text', description: 'text' });
wordSchema.index({ status: 1, version: 1 });
wordSchema.index({ categoryId: 1, status: 1 });

// Virtual for backward compatibility - returns English translation
wordSchema.virtual('english').get(function () {
  return this.translations?.en ?? '';
});

// Virtual for backward compatibility - returns Hausa translation
wordSchema.virtual('hausa').get(function () {
  return this.translations?.ha ?? '';
});

// Ensure virtuals are included in JSON output
wordSchema.set('toJSON', { virtuals: true });
wordSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Word', wordSchema);
module.exports.CONTENT_STATUSES = CONTENT_STATUSES;
