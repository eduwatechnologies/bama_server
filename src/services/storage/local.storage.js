const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../../config/env');

// Dev/testing storage driver: writes audio and image files to disk under
// UPLOAD_DIR and serves them via the /uploads static routes mounted in app.js.
//
// This is NOT meant for production — a real deployment should swap in a
// driver backed by S3, GCS, or Azure Blob (see storage/s3.storage.js for
// the interface to implement). Object storage was called for explicitly
// in the spec (section 13) precisely so raw audio never ends up inside
// MongoDB documents; this driver honors that by only ever storing a
// storageKey + url in Mongo, never the bytes themselves.

const UPLOAD_DIR =
  env.storage.local.audioDir || path.join(process.cwd(), 'uploads', 'audio');
const IMAGE_UPLOAD_DIR =
  env.storage.local.imageDir || path.join(process.cwd(), 'uploads', 'images');
const PUBLIC_BASE_URL = env.storage.local.audioPublicUrl || 'http://localhost:4000/uploads/audio';
const IMAGE_PUBLIC_BASE_URL =
  env.storage.local.imagePublicUrl || 'http://localhost:4000/uploads/images';

const DIRS = {
  audio: { dir: UPLOAD_DIR, publicBaseUrl: PUBLIC_BASE_URL },
  image: { dir: IMAGE_UPLOAD_DIR, publicBaseUrl: IMAGE_PUBLIC_BASE_URL },
};

function ensureDir() {
  Object.values(DIRS).forEach(({ dir }) => fs.mkdirSync(dir, { recursive: true }));
}

function resolveTarget(kind) {
  return DIRS[kind] || DIRS.audio;
}

const EXTENSIONS = {
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/m4a': '.m4a',
  'audio/aac': '.aac',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

function extensionFor(mimeType) {
  return EXTENSIONS[mimeType] || '';
}

/**
 * @param {Buffer} buffer
 * @param {{ mimeType: string, prefix?: string, kind?: 'audio' | 'image' }} opts
 * @returns {Promise<{ storageKey: string, url: string }>}
 */
async function upload(buffer, { mimeType, prefix = 'contributions', kind = 'audio' }) {
  ensureDir();
  const target = resolveTarget(kind);
  const filename = `${prefix}/${crypto.randomUUID()}${extensionFor(mimeType)}`;
  const fullPath = path.join(target.dir, filename);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, buffer);

  return {
    storageKey: filename,
    url: `${target.publicBaseUrl}/${filename}`,
  };
}

async function remove(storageKey, kind = 'audio') {
  const fullPath = path.join(resolveTarget(kind).dir, storageKey);
  await fs.promises.rm(fullPath, { force: true });
}

module.exports = { upload, remove, UPLOAD_DIR, IMAGE_UPLOAD_DIR };
