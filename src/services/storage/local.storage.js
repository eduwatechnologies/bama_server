const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Dev/testing storage driver: writes audio files to disk under UPLOAD_DIR
// and serves them via the /uploads static route mounted in app.js.
//
// This is NOT meant for production — a real deployment should swap in a
// driver backed by S3, GCS, or Azure Blob (see storage/s3.storage.js for
// the interface to implement). Object storage was called for explicitly
// in the spec (section 13) precisely so raw audio never ends up inside
// MongoDB documents; this driver honors that by only ever storing a
// storageKey + url in Mongo, never the bytes themselves.

const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'audio');
const PUBLIC_BASE_URL = process.env.LOCAL_UPLOAD_PUBLIC_URL || 'http://localhost:4000/uploads/audio';

function ensureDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function extensionFor(mimeType) {
  const map = {
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/x-m4a': '.m4a',
    'audio/m4a': '.m4a',
    'audio/aac': '.aac',
  };
  return map[mimeType] || '';
}

/**
 * @param {Buffer} buffer
 * @param {{ mimeType: string, prefix?: string }} opts
 * @returns {Promise<{ storageKey: string, url: string }>}
 */
async function upload(buffer, { mimeType, prefix = 'contributions' }) {
  ensureDir();
  const filename = `${prefix}/${crypto.randomUUID()}${extensionFor(mimeType)}`;
  const fullPath = path.join(UPLOAD_DIR, filename);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, buffer);

  return {
    storageKey: filename,
    url: `${PUBLIC_BASE_URL}/${filename}`,
  };
}

async function remove(storageKey) {
  const fullPath = path.join(UPLOAD_DIR, storageKey);
  await fs.promises.rm(fullPath, { force: true });
}

module.exports = { upload, remove, UPLOAD_DIR };
