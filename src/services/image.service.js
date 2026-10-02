const storage = require('./storage');
const { AppError, ValidationError } = require('../utils/errors');

// Images are stored under an explicit scope so ad creatives and future
// image fields (categories, contributions) never share a prefix.
const IMAGE_SCOPES = new Set(['ads']);

async function storeImage(file, { scope = 'ads' } = {}) {
  if (!file || !file.buffer) {
    throw new ValidationError('No image file was provided');
  }
  if (!IMAGE_SCOPES.has(scope)) {
    throw new ValidationError(`Unsupported image scope: ${scope}`);
  }

  let stored;
  try {
    stored = await storage.upload(file.buffer, {
      mimeType: file.mimetype,
      prefix: scope,
      kind: 'image',
    });
  } catch (err) {
    // Surface the storage backend's reason (quota, format, network) instead of
    // a generic 500 — the admin client shows this message in an alert.
    throw new AppError(
      `The image could not be stored: ${err && err.message ? err.message : 'unknown storage error'}`,
      502,
      'STORAGE_ERROR'
    );
  }

  const { storageKey, url } = stored;

  return {
    url,
    storageKey,
    mimeType: file.mimetype,
    size: file.size,
  };
}

async function deleteImage(storageKey) {
  if (!storageKey) return;
  await storage.remove(storageKey, 'image');
}

module.exports = { storeImage, deleteImage, IMAGE_SCOPES };
