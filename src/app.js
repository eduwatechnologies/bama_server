const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const pinoHttp = require('pino-http');

const env = require('./config/env');
const logger = require('./utils/logger');
const { success } = require('./utils/apiResponse');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const contentRoutes = require('./routes/content.routes');
const syncRoutes = require('./routes/sync.routes');
const installationRoutes = require('./routes/installation.routes');
const contributionRoutes = require('./routes/contribution.routes');
const adminRoutes = require('./routes/admin.routes');
const storage = require('./services/storage');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','),
  })
);

// Request size limits (per spec section 25) — content is short text plus
// audio metadata; actual audio bytes are uploaded via multipart separately.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Strip any keys starting with '$' or containing '.' from user input to
// prevent MongoDB operator injection.
app.use(mongoSanitize());

app.use(
  pinoHttp({
    logger,
    redact: ['req.headers.authorization'],
    autoLogging: {
      ignore: (req) => req.url === '/health',
    },
  })
);

app.get('/health', (req, res) => success(res, { status: 'ok', uptime: process.uptime() }));

// Dev-only: serves audio saved by the local storage driver. When
// STORAGE_DRIVER=s3 or STORAGE_DRIVER=cloudinary, files are served
// directly from the bucket/CDN and this route is simply unused.
if (storage.driverName === 'local') {
  app.use('/uploads/audio', express.static(storage.UPLOAD_DIR));
}

app.use('/api/v1', contentRoutes);
app.use('/api/v1', syncRoutes);
app.use('/api/v1', installationRoutes);
app.use('/api/v1', contributionRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
