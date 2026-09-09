const logger = require('../utils/logger');
const { error: sendError } = require('../utils/apiResponse');
const { AppError } = require('../utils/errors');

// 404 handler for unmatched routes — mount after all routes.
function notFoundHandler(req, res) {
  return sendError(res, 404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`);
}

// Centralized error handler — mount last, after notFoundHandler.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Known, operational errors we threw on purpose.
  if (err instanceof AppError) {
    if (!err.isClientSafeLog) {
      logger.warn({ err, code: err.code, path: req.originalUrl }, err.message);
    }
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    logger.warn({ err, path: req.originalUrl }, 'Mongoose validation error');
    return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request', details);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    logger.warn({ err, path: req.originalUrl }, 'Mongoose cast error');
    return sendError(res, 400, 'VALIDATION_ERROR', `Invalid identifier: ${err.value}`);
  }

  // Mongo duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    logger.warn({ err, path: req.originalUrl }, 'Duplicate key error');
    return sendError(
      res,
      409,
      'DUPLICATE_KEY_ERROR',
      field ? `A record with this ${field} already exists` : 'Duplicate record'
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    logger.warn({ err: err.name, path: req.originalUrl }, 'JWT error');
    return sendError(res, 401, 'AUTHENTICATION_ERROR', 'Invalid or expired token');
  }

  // Multer / file upload errors
  if (err.name === 'MulterError') {
    logger.warn({ err, path: req.originalUrl }, 'File upload error');
    return sendError(res, 400, 'FILE_UPLOAD_ERROR', err.message);
  }

  // Payload too large
  if (err.type === 'entity.too.large') {
    return sendError(res, 413, 'VALIDATION_ERROR', 'Request payload is too large');
  }

  // Fallback: never leak internal/raw errors to the client.
  logger.error({ err, path: req.originalUrl }, 'Unhandled error');
  return sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}

module.exports = { notFoundHandler, errorHandler };
