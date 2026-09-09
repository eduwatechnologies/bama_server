const storage = require('./storage');
const { ValidationError } = require('../utils/errors');

/**
 * Uploads a contribution's audio recording via the active storage driver
 * and returns the metadata shape stored on Contribution.audio / Word.audio
 * / Phrase.audio. The raw bytes never touch MongoDB (spec section 13).
 */
async function storeContributionAudio(file, { contributionId, durationSeconds }) {
  if (!file || !file.buffer) {
    throw new ValidationError('No audio file was provided');
  }

  const { storageKey, url } = await storage.upload(file.buffer, {
    mimeType: file.mimetype,
    prefix: `contributions/${contributionId}`,
  });

  return {
    url,
    storageKey,
    mimeType: file.mimetype,
    size: file.size,
    duration: durationSeconds,
  };
}

async function deleteAudio(storageKey) {
  if (!storageKey) return;
  await storage.remove(storageKey);
}

module.exports = { storeContributionAudio, deleteAudio };
