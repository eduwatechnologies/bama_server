const Word = require('../models/Word');
const Phrase = require('../models/Phrase');
const { getCurrentContentVersion } = require('./content.service');

// If the client is this many versions (or more) behind, we ask it to do a
// full sync instead of sending a potentially huge incremental change list.
const FULL_SYNC_THRESHOLD = 500;

function toChange(entity, doc) {
  const isDeleted = doc.status === 'ARCHIVED';
  const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt);
  const updatedAt = doc.updatedAt instanceof Date ? doc.updatedAt : new Date(doc.updatedAt);
  return {
    type: isDeleted ? 'DELETE' : createdAt.getTime() === updatedAt.getTime() ? 'CREATE' : 'UPDATE',
    entity,
    id: doc._id.toString(),
    data: isDeleted ? undefined : doc.toObject({ virtuals: false, getters: false }),
  };
}

/**
 * Returns the incremental change set between clientVersion (exclusive)
 * and the current server version (inclusive).
 */
async function getChangesSince(clientVersion) {
  const serverVersion = await getCurrentContentVersion();

  if (clientVersion > serverVersion) {
    return { serverVersion, requiresFullSync: true, changes: [] };
  }

  if (serverVersion - clientVersion >= FULL_SYNC_THRESHOLD) {
    return { serverVersion, requiresFullSync: true, changes: [] };
  }

  const versionFilter = { version: { $gt: clientVersion, $lte: serverVersion } };

  const [words, phrases] = await Promise.all([
    Word.find(versionFilter).sort({ version: 1 }),
    Phrase.find(versionFilter).sort({ version: 1 }),
  ]);

  const changes = [
    ...words.map((w) => toChange('word', w)),
    ...phrases.map((p) => toChange('phrase', p)),
  ];

  return { serverVersion, requiresFullSync: false, changes };
}

module.exports = { getChangesSince, FULL_SYNC_THRESHOLD };
