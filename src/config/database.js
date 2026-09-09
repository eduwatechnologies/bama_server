const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

async function connectDatabase() {
  try {
    await mongoose.connect(env.mongodbUri);
    logger.info('MongoDB connected successfully!!!');
  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed');
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });
}

function maskUri(uri) {
  // Avoid logging credentials if present in the connection string.
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}

module.exports = connectDatabase;
