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

  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
      folder: process.env.CLOUDINARY_FOLDER || 'hausabridge/audio',
      secureDelivery: (process.env.CLOUDINARY_SECURE_DELIVERY || 'true') !== 'false',
    },
  },
};

module.exports = env;
