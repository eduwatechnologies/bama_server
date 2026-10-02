const Contribution = require('../models/Contribution');
const Word = require('../models/Word');
const Phrase = require('../models/Phrase');
const Category = require('../models/Category');
const contentService = require('./content.service');
const { NotFoundError, ValidationError } = require('../utils/errors');

const { isActionable } = Contribution;

const MODEL_BY_TYPE = { word: Word, phrase: Phrase };

async function assertReferencedContentExists(contentType, contentId) {
  const Model = MODEL_BY_TYPE[contentType];
  const doc = await Model.findById(contentId);
  if (!doc) {
    throw new ValidationError(`contentId does not reference an existing ${contentType}`);
  }
  return doc;
}

/**
 * Works out which report mode produced this payload when the client did not
 * say, so older builds of the app still land in a filterable bucket.
 */
function deriveReportKind(data) {
  if (data.reportKind) return data.reportKind;
  if (data.type === 'AUDIO') return 'PRONUNCIATION';
  if (data.type !== 'CORRECTION') return undefined;
  if (data.suggestedHausa && !data.suggestedEnglish) return 'TRANSLATION';
  if (data.suggestedEnglish && !data.suggestedHausa) return 'ENGLISH';
  if (!data.suggestedEnglish && !data.suggestedHausa) return 'PROBLEM';
  return undefined; // both halves proposed — not one of the sheet's modes
}

/**
 * Creates a contribution. Cross-field requirements (e.g. CORRECTION needs
 * contentId + contentType) are enforced by the Zod discriminated union in
 * the validator layer; this only does DB-dependent checks.
 */
async function createContribution(data) {
  if (data.categoryId) {
    const category = await Category.findById(data.categoryId);
    if (!category) throw new ValidationError('categoryId does not reference an existing category');
  }

  const payload = { ...data };
  const reportKind = deriveReportKind(payload);
  if (reportKind) payload.reportKind = reportKind;
  if (reportKind === 'PROBLEM' && !payload.issueCategory) payload.issueCategory = 'OTHER';
  if (reportKind !== 'PROBLEM') delete payload.issueCategory;

  if (payload.contentType && payload.contentId) {
    const referenced = await assertReferencedContentExists(payload.contentType, payload.contentId);
    payload.contentSnapshot = {
      english: referenced.english,
      hausa: referenced.hausa,
      status: referenced.status,
      categoryId: referenced.categoryId,
    };
  }

  return Contribution.create(payload);
}

async function getContributionById(id) {
  const contribution = await Contribution.findById(id);
  if (!contribution) throw new NotFoundError('Contribution not found');
  return contribution;
}

async function attachAudio(contributionId, audioMeta) {
  const contribution = await getContributionById(contributionId);

  if (contribution.type !== 'AUDIO') {
    throw new ValidationError('Audio can only be attached to AUDIO-type contributions');
  }
  if (contribution.status !== 'PENDING' && contribution.status !== 'UNDER_REVIEW') {
    throw new ValidationError('Cannot attach audio to a contribution that has already been reviewed');
  }

  contribution.audio = audioMeta;
  await contribution.save();
  return contribution;
}

/**
 * Mongo-side equivalent of the `actionable` virtual, so the queue can be
 * filtered to "publishable" or "needs a moderator decision" in one query.
 */
function actionableFilter(actionable) {
  const filled = { $nin: [null, ''] };

  if (actionable) {
    return {
      $or: [
        { type: { $in: ['WORD', 'PHRASE', 'TRANSLATION'] } },
        { type: 'CORRECTION', $or: [{ suggestedEnglish: filled }, { suggestedHausa: filled }] },
        { type: 'AUDIO', 'audio.storageKey': filled },
      ],
    };
  }

  return {
    type: { $nin: ['WORD', 'PHRASE', 'TRANSLATION'] },
    $or: [
      {
        type: 'CORRECTION',
        suggestedEnglish: { $in: [null, ''] },
        suggestedHausa: { $in: [null, ''] },
      },
      { type: 'AUDIO', 'audio.storageKey': { $in: [null, ''] } },
    ],
  };
}

async function listContributions({ status, type, reportKind, issueCategory, actionable, page, limit }) {
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (reportKind) filter.reportKind = reportKind;
  if (issueCategory) filter.issueCategory = issueCategory;
  if (actionable !== undefined) Object.assign(filter, actionableFilter(actionable));

  const [items, total] = await Promise.all([
    Contribution.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Contribution.countDocuments(filter),
  ]);
  return { items, total };
}

async function markUnderReview(id, adminId) {
  const contribution = await getContributionById(id);
  if (contribution.status !== 'PENDING') {
    throw new ValidationError('Only PENDING contributions can be moved to UNDER_REVIEW');
  }
  contribution.status = 'UNDER_REVIEW';
  contribution.reviewedBy = adminId;
  await contribution.save();
  return contribution;
}

async function rejectContribution(id, adminId, reviewNotes) {
  const contribution = await getContributionById(id);
  if (contribution.status === 'APPROVED') {
    throw new ValidationError('An already-approved contribution cannot be rejected');
  }
  if (contribution.status === 'RESOLVED') {
    throw new ValidationError('A resolved contribution cannot be rejected');
  }
  contribution.status = 'REJECTED';
  contribution.reviewedBy = adminId;
  contribution.reviewedAt = new Date();
  contribution.reviewNotes = reviewNotes;
  await contribution.save();
  return contribution;
}

/**
 * Closes a contribution without publishing the submitter's wording. Used for
 * reports that describe a fault instead of proposing text — the moderator
 * decides the fix, and any content fix is applied here in the same action so
 * the queue item and the content stay in step.
 */
async function resolveContribution(id, adminId, { reviewNotes, english, hausa, categoryId } = {}) {
  const contribution = await getContributionById(id);
  if (contribution.status === 'APPROVED') {
    throw new ValidationError('An already-approved contribution cannot be resolved');
  }
  if (contribution.status === 'REJECTED') {
    throw new ValidationError('A rejected contribution cannot be resolved');
  }
  if (contribution.status === 'RESOLVED') {
    throw new ValidationError('This contribution has already been resolved');
  }

  const update = {};
  if (english) update.english = english;
  if (hausa) update.hausa = hausa;
  if (categoryId) update.categoryId = categoryId;

  let resultDoc;
  if (Object.keys(update).length > 0) {
    requireContentReference(contribution);
    resultDoc = await contentService.updateContent(
      contribution.contentType,
      contribution.contentId,
      update,
      adminId
    );
  }

  contribution.status = 'RESOLVED';
  contribution.reviewedBy = adminId;
  contribution.reviewedAt = new Date();
  contribution.reviewNotes = reviewNotes;
  if (resultDoc) contribution.resultContentId = resultDoc._id;
  await contribution.save();

  return { contribution, resultDoc };
}

/**
 * Approves a contribution and applies it to official content:
 *   WORD/PHRASE  -> creates a new, published Word/Phrase
 *   TRANSLATION  -> sets hausa translation on the referenced content
 *   CORRECTION   -> applies suggestedEnglish/suggestedHausa (and any
 *                    categoryId override) to the referenced content
 *   AUDIO        -> sets the referenced content's audio to the approved recording
 *
 * A report with nothing to publish (a reason-only "Report a problem" entry)
 * has to be resolved or rejected instead.
 *
 * `overrides` lets the reviewing admin adjust fields (e.g. fix casing,
 * pick a different category) before publishing, without editing the
 * original submitter's contribution record.
 */
async function approveContribution(id, adminId, overrides = {}) {
  const contribution = await getContributionById(id);

  if (contribution.status === 'APPROVED') {
    throw new ValidationError('This contribution has already been approved');
  }
  if (contribution.status === 'REJECTED') {
    throw new ValidationError('A rejected contribution cannot be approved');
  }
  if (contribution.status === 'RESOLVED') {
    throw new ValidationError('A resolved contribution cannot be approved');
  }
  if (!isActionable(contribution)) {
    throw new ValidationError(
      'This report describes a problem instead of proposing a change — resolve or reject it'
    );
  }

  let resultDoc;

  switch (contribution.type) {
    case 'WORD':
    case 'PHRASE': {
      const type = contribution.type.toLowerCase();
      resultDoc = await contentService.createContent(
        type,
        {
          english: overrides.english ?? contribution.english,
          hausa: overrides.hausa ?? contribution.hausa,
          categoryId: overrides.categoryId ?? contribution.categoryId,
          status: 'PUBLISHED',
        },
        adminId
      );
      break;
    }

    case 'TRANSLATION': {
      requireContentReference(contribution);
      resultDoc = await contentService.updateContent(
        contribution.contentType,
        contribution.contentId,
        { hausa: overrides.hausa ?? contribution.hausa },
        adminId
      );
      break;
    }

    case 'CORRECTION': {
      requireContentReference(contribution);
      const update = {};
      const english = overrides.english ?? contribution.suggestedEnglish;
      const hausa = overrides.hausa ?? contribution.suggestedHausa;
      if (english) update.english = english;
      if (hausa) update.hausa = hausa;
      if (overrides.categoryId) update.categoryId = overrides.categoryId;
      if (Object.keys(update).length === 0) {
        throw new ValidationError('Correction has no suggested changes to apply');
      }
      resultDoc = await contentService.updateContent(
        contribution.contentType,
        contribution.contentId,
        update,
        adminId
      );
      break;
    }

    case 'AUDIO': {
      requireContentReference(contribution);
      if (!contribution.audio || !contribution.audio.storageKey) {
        throw new ValidationError('This contribution has no uploaded audio to approve');
      }
      resultDoc = await contentService.updateContent(
        contribution.contentType,
        contribution.contentId,
        { audio: contribution.audio },
        adminId
      );
      break;
    }

    default:
      throw new ValidationError(`Unsupported contribution type: ${contribution.type}`);
  }

  contribution.status = 'APPROVED';
  contribution.reviewedBy = adminId;
  contribution.reviewedAt = new Date();
  contribution.resultContentId = resultDoc._id;
  await contribution.save();

  return { contribution, resultDoc };
}

function requireContentReference(contribution) {
  if (!contribution.contentId || !contribution.contentType) {
    throw new ValidationError(
      `${contribution.type} contributions must reference existing content (contentId/contentType)`
    );
  }
}

module.exports = {
  createContribution,
  getContributionById,
  attachAudio,
  listContributions,
  markUnderReview,
  rejectContribution,
  resolveContribution,
  approveContribution,
};
