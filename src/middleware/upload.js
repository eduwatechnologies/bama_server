const multer = require('multer');
const { ValidationError } = require('../utils/errors');

// Spec section 13 recommends MP3 or AAC/M4A, kept compressed since the
// app targets low-bandwidth environments. Section 24 says to reject
// unsupported audio formats and oversized files.
const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg', // .mp3
  'audio/mp4', // .m4a (some browsers/devices report this)
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/webm', // .webm — accepted so the backend can forward it to Cloudinary
]);

const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5MB — generous for a short pronunciation clip

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new ValidationError(`Unsupported audio format: ${file.mimetype}. Use MP3, AAC, or M4A.`)
      );
    }
    return cb(null, true);
  },
});

// Single audio file expected under the "audio" field name.
const audioUpload = upload.single('audio');

// Images are used for personal ad creatives. Raster formats only, and kept
// small because the mobile client downloads them with the ad payload.
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB

const imageUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new ValidationError(
          `Unsupported image format: ${file.mimetype}. Use JPEG, PNG, WebP, GIF, or AVIF.`
        )
      );
    }
    return cb(null, true);
  },
});

// Single image file expected under the "image" field name.
const imageUpload = imageUploader.single('image');

module.exports = {
  audioUpload,
  imageUpload,
  ALLOWED_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
};
