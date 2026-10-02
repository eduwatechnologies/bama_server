const mongoose = require('mongoose');

const CONTRIBUTION_TYPES = ['WORD', 'PHRASE', 'TRANSLATION', 'CORRECTION', 'AUDIO'];
const CONTRIBUTION_STATUSES = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED'];
const CONTENT_TYPES = ['word', 'phrase'];

// Mirrors the report modes the mobile "Suggest a change" sheet offers for
// existing content. WORD/PHRASE submissions (new entries) have no report
// kind, so the field stays unset for them.
const REPORT_KINDS = ['PRONUNCIATION', 'TRANSLATION', 'ENGLISH', 'PROBLEM'];

// What a PROBLEM report is about, so moderators can triage without reading
// every reason. The labels match the sheet's own wording.
const ISSUE_CATEGORIES = [
  'DUPLICATE',
  'WRONG_CATEGORY',
  'OFFENSIVE',
  'INACCURATE',
  'BROKEN_AUDIO',
  'OTHER',
];

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

const contentSnapshotSchema = new mongoose.Schema(
  {
    english: { type: String, trim: true },
    hausa: { type: String, trim: true },
    status: { type: String, trim: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
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

    // The referenced content as it looked when the report was filed, so the
    // queue stays meaningful after that content is edited or archived.
    contentSnapshot: { type: contentSnapshotSchema, default: undefined },

    // CORRECTION specifics — what the submitter thinks it should say, and why.
    suggestedEnglish: { type: String, trim: true, maxlength: 500 },
    suggestedHausa: { type: String, trim: true, maxlength: 500 },
    reason: { type: String, trim: true, maxlength: 1000 },

    // Which report mode was used, and for PROBLEM reports what the problem
    // is about. Derived from the payload when a client omits it.
    reportKind: { type: String, enum: REPORT_KINDS },
    issueCategory: { type: String, enum: ISSUE_CATEGORIES },

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
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        // contentTypeModel only exists to resolve refPath; it is not API data.
        delete ret.contentTypeModel;
        return ret;
      },
    },
  }
);

// Virtual so refPath above can resolve 'word' -> 'Word', 'phrase' -> 'Phrase'.
contributionSchema.virtual('contentTypeModel').get(function contentTypeModel() {
  if (this.contentType === 'word') return 'Word';
  if (this.contentType === 'phrase') return 'Phrase';
  return undefined;
});

/**
 * True when approving this contribution would actually change published
 * content. A reason-only "Report a problem" submission is not actionable:
 * it describes a fault, and the moderator has to decide what the fix is.
 */
contributionSchema.virtual('actionable').get(function actionable() {
  return isActionable(this);
});

contributionSchema.index({ status: 1, type: 1, createdAt: -1 });
contributionSchema.index({ reportKind: 1, issueCategory: 1, status: 1, createdAt: -1 });
contributionSchema.index({ installationId: 1 });

function isActionable(contribution) {
  switch (contribution.type) {
    case 'WORD':
    case 'PHRASE':
    case 'TRANSLATION':
      return true;
    case 'CORRECTION':
      return Boolean(contribution.suggestedEnglish || contribution.suggestedHausa);
    case 'AUDIO':
      return Boolean(contribution.audio && contribution.audio.storageKey);
    default:
      return false;
  }
}

module.exports = mongoose.model('Contribution', contributionSchema);
module.exports.CONTRIBUTION_TYPES = CONTRIBUTION_TYPES;
module.exports.CONTRIBUTION_STATUSES = CONTRIBUTION_STATUSES;
module.exports.CONTENT_TYPES = CONTENT_TYPES;
module.exports.REPORT_KINDS = REPORT_KINDS;
module.exports.ISSUE_CATEGORIES = ISSUE_CATEGORIES;
module.exports.isActionable = isActionable;
