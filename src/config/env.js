require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  mongodbUri: required('MONGODB_URI', 'mongodb://localhost:27017/hausabridge'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  corsOrigin: process.env.CORS_ORIGIN || '*',

  isProd: (process.env.NODE_ENV || 'development') === 'production',

  // In-app update gate seed values, used only to create the AppSettings
  // document on first access. After that the dashboard is the source of truth:
  //   latestVersion — shows a dismissible "update available" prompt when the
  //     installed version is older than this.
  //   minVersion — blocks the app when the installed version is older.
  // Defaults are safe: latest = current release version, min = 0.0.0, so no
  // prompt appears until the values are raised.
  appUpdate: {
    enabled: (process.env.APP_UPDATE_ENABLED || 'true') !== 'false',
    latestVersion: process.env.APP_LATEST_VERSION || '1.0.0',
    minVersion: process.env.APP_MIN_VERSION || '0.0.0',
    storeUrl:
      process.env.APP_STORE_URL ||
      'https://play.google.com/store/apps/details?id=com.sodiqabdulazeez.hausabridge',
    message: process.env.APP_UPDATE_MESSAGE || '',
  },

  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    local: {
      audioDir: process.env.LOCAL_UPLOAD_DIR || '',
      audioPublicUrl: process.env.LOCAL_UPLOAD_PUBLIC_URL || '',
      imageDir: process.env.LOCAL_IMAGE_UPLOAD_DIR || '',
      imagePublicUrl: process.env.LOCAL_IMAGE_UPLOAD_PUBLIC_URL || '',
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
      folder: process.env.CLOUDINARY_FOLDER || 'hausabridge/audio',
      imageFolder:
        process.env.CLOUDINARY_IMAGE_FOLDER ||
        (process.env.CLOUDINARY_FOLDER || 'hausabridge/audio').replace(/\/audio$/, '/images'),
      secureDelivery: (process.env.CLOUDINARY_SECURE_DELIVERY || 'true') !== 'false',
    },
  },
};

module.exports = env;
