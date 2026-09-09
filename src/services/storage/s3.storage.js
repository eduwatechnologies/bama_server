// Production storage driver stub — implements the same interface as
// local.storage.js (upload/remove) so it's a drop-in replacement via
// STORAGE_DRIVER=s3. Wire this up when real bucket credentials exist.
//
// Requires the optional dependency: npm install @aws-sdk/client-s3
//
// Required env vars:
//   S3_BUCKET
//   S3_REGION
//   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (or an attached IAM role)
//   S3_PUBLIC_URL_BASE   e.g. https://cdn.hausabridge.app or the bucket's
//                        public/CloudFront URL

const crypto = require('crypto');

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

let s3Client;
function getClient() {
  if (s3Client) return s3Client;
  // Lazy-required so this dependency is only needed when STORAGE_DRIVER=s3.
  // eslint-disable-next-line global-require
  const { S3Client } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({ region: process.env.S3_REGION });
  return s3Client;
}

/**
 * @param {Buffer} buffer
 * @param {{ mimeType: string, prefix?: string }} opts
 * @returns {Promise<{ storageKey: string, url: string }>}
 */
async function upload(buffer, { mimeType, prefix = 'contributions' }) {
  // eslint-disable-next-line global-require
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const client = getClient();

  const key = `${prefix}/${crypto.randomUUID()}${extensionFor(mimeType)}`;

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return {
    storageKey: key,
    url: `${process.env.S3_PUBLIC_URL_BASE}/${key}`,
  };
}

async function remove(storageKey) {
  // eslint-disable-next-line global-require
  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: storageKey })
  );
}

module.exports = { upload, remove };
