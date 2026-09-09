// Picks the active storage driver based on STORAGE_DRIVER. All drivers
// implement the same { upload(buffer, opts), remove(storageKey) } shape,
// so callers (audio.service.js) never need to know which one is active.
const driverName = process.env.STORAGE_DRIVER || 'local';

const drivers = {
  local: () => require('./local.storage'),
  s3: () => require('./s3.storage'),
  cloudinary: () => require('./cloudinary.storage'),
};

if (!drivers[driverName]) {
  throw new Error(
    `Unknown STORAGE_DRIVER "${driverName}". Expected one of: ${Object.keys(drivers).join(', ')}`
  );
}

module.exports = drivers[driverName]();
module.exports.driverName = driverName;
