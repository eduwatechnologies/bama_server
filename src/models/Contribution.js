const mongoose = require('mongoose');

const CONTRIBUTION_TYPES = ['WORD', 'PHRASE', 'TRANSLATION', 'CORRECTION', 'AUDIO'];
const CONTRIBUTION_STATUSES = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
const CONTENT_TYPES = ['word', 'phrase'];

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

const contributionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: CONTRIBUTION_TYPES, required: true },

    // New WORD / PHRASE suggestions, and the proposed translation half of
    // a TRANSLATION suggestion.
    english: { type: String, trim: true, maxlength: 500 },
    hausa: { type: String, trim: true, maxlength: 500 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },

    // TRANSLATION / CORRECTION / AUDIO reference an existing piece of
    // official content.
    contentType: { type: String, enum: CONTENT_TYPES },
    contentId: { type: mongoose.Schema.Types.ObjectId, refPath: 'contentTypeModel' },

    // CORRECTION specifics — what the submitter thinks it should say, and why.
    suggestedEnglish: { type: String, trim: true, maxlength: 500 },
    suggestedHausa: { type: String, trim: true, maxlength: 500 },
    reason: { type: String, trim: true, maxlength: 1000 },

    // AUDIO — populated by a separate upload call after the contribution
    // is created. Never auto-published; only used once an admin approves.
    audio: { type: audioSchema, default: undefined },

    notes: { type: String, trim: true, maxlength: 1000 },

    installationId: { type: String, trim: true, required: true },

    status: { type: String, enum: CONTRIBUTION_STATUSES, default: 'PENDING' },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reviewedAt: { type: Date },
    reviewNotes: { type: String, trim: true, maxlength: 1000 },

    // Set once approved: the Word/Phrase that was created or updated.
    resultContentId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

// Virtual so refPath above can resolve 'word' -> 'Word', 'phrase' -> 'Phrase'.
contributionSchema.virtual('contentTypeModel').get(function contentTypeModel() {
  if (this.contentType === 'word') return 'Word';
  if (this.contentType === 'phrase') return 'Phrase';
  return undefined;
});

contributionSchema.index({ status: 1, type: 1, createdAt: -1 });
contributionSchema.index({ installationId: 1 });

module.exports = mongoose.model('Contribution', contributionSchema);
module.exports.CONTRIBUTION_TYPES = CONTRIBUTION_TYPES;
module.exports.CONTRIBUTION_STATUSES = CONTRIBUTION_STATUSES;
module.exports.CONTENT_TYPES = CONTENT_TYPES;
