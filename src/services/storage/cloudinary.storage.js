// Cloudinary storage driver — implements the same { upload, remove } shape
// as local.storage.js and s3.storage.js so it's a drop-in replacement via
// STORAGE_DRIVER=cloudinary.
//
// Cloudinary delivers audio via the `resource_type=video` endpoint because
// audio assets share the same delivery pipeline as video. URLs are always
// https (or http if CLOUDINARY_SECURE_DELIVERY=false). The Cloudinary
// `public_id` is stored as `storageKey` so we can remove the asset later —
// it includes the configured folder prefix to avoid name collisions across
// environments.
//
// Required env vars (validated when the driver boots):
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET
// Optional:
//   CLOUDINARY_FOLDER       default "hausabridge/audio"
//   CLOUDINARY_SECURE_DELIVERY  default true
//
// Install: npm install cloudinary

const crypto = require('crypto');
const env = require('../../config/env');

let cloudinary;

function getClient() {
  if (cloudinary) return cloudinary;
  const { cloudName, apiKey, apiSecret } = env.storage.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary driver selected but CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are not set.',
    );
  }
  // Lazy-required so this dependency is only loaded when STORAGE_DRIVER=cloudinary.
  // eslint-disable-next-line global-require
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: env.storage.cloudinary.secureDelivery,
  });
  return cloudinary;
}

const AUDIO_CODEC_BY_MIME = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
};

function extensionFor(mimeType) {
  return AUDIO_CODEC_BY_MIME[mimeType] || '';
}

function safePrefix(prefix) {
  return prefix.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9/_-]/g, '_');
}

/**
 * Builds the Cloudinary public_id. We intentionally do NOT append a file
 * extension here. Cloudinary appends the final <format> extension to the URL
 * itself based on the uploaded bytes. If we also appended our own extension we
 * would end up with a double extension like ".m4a.mp4" and get
 * Content-Type: video/mp4 on the response.
 */
function buildPublicId(prefix) {
  const folder = env.storage.cloudinary.folder;
  const cleanPrefix = safePrefix(prefix);
  const id = crypto.randomUUID();
  const path = cleanPrefix ? `${folder}/${cleanPrefix}` : folder;
  return `${path}/${id}`;
}

/**
 * Rewrites a raw Cloudinary secure_url so that it is delivered as an audio
 * container using the f_<format> delivery transformation.
 *
 * Cloudinary's audio pipeline stores assets under resource_type=video and
 * returns Content-Type: video/mp4 by default. Injecting f_m4a (or
 * f_mp3 for MPEG uploads) in the delivery URL forces the response to
 * the correct audio/* content-type that native audio players expect.
 */
function forceAudioDeliveryUrl(secureUrl, mimeType) {
  if (!secureUrl) return secureUrl;
  const ext = extensionFor(mimeType);
  const deliveryFormat = ext && (ext === 'mp3' || ext === 'wav' || ext === 'ogg' || ext === 'webm') ? ext : 'm4a';
  const audioTransform = `f_${deliveryFormat}`;
  const marker = '/upload/';
  const idx = secureUrl.indexOf(marker);
  if (idx === -1) return secureUrl;
  const insertAt = idx + marker.length;
  const after = secureUrl.slice(insertAt);
  const transformRegex = /^f_(mp3|m4a|wav|ogg|aac|webm)\//;
  if (transformRegex.test(after)) {
    return secureUrl;
  }
  return secureUrl.slice(0, insertAt) + audioTransform + '/' + after;
}

/**
 * @param {Buffer} buffer
 * @param {{ mimeType: string, prefix?: string }} opts
 * @returns {Promise<{ storageKey: string, url: string }>}
 */
async function upload(buffer, { mimeType, prefix = 'contributions' }) {
  const client = getClient();
  const publicId = buildPublicId(prefix);

  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        resource_type: 'video',
        public_id: publicId,
        overwrite: false,
        invalidate: false,
      },
      (err, result) => {
        if (err || !result) {
          reject(err || new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({
          storageKey: result.public_id,
          url: forceAudioDeliveryUrl(result.secure_url, mimeType),
        });
      },
    );
    stream.end(buffer);
  });
}

async function remove(storageKey) {
  if (!storageKey) return;
  const client = getClient();
  try {
    await client.uploader.destroy(storageKey, {
      resource_type: 'video',
      invalidate: false,
    });
  } catch (err) {
    // Cloudinary returns 404 when the asset is already gone; treat that as
    // success so the rest of the delete path can complete cleanly.
    if (err && (err.http_code === 404 || err.code === 'not_found')) {
      return;
    }
    throw err;
  }
}

module.exports = { upload, remove };
