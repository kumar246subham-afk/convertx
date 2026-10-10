const multer = require('multer');
const env = require('../config/env');
const { safeDelete } = require('../utils/helpers');

function errorHandler(err, req, res, next) {
  // Always clean up any uploaded files if the request resulted in an error
  if (req.file && req.file.path) {
    safeDelete(req.file.path);
  }
  if (req.files && Array.isArray(req.files)) {
    req.files.forEach((f) => safeDelete(f.path));
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).flat().forEach((f) => safeDelete(f.path));
  }

  // Multer-specific error codes
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: `File size exceeds the maximum allowed limit of ${env.MAX_FILE_SIZE_MB}MB.`,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files uploaded in a single request.',
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`,
    });
  }

  // Custom client error
  const statusCode = err.status || err.statusCode || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;

  // Log server errors internally without exposing to client
  if (!isClientError) {
    console.error(`[Server Error] [${req.method} ${req.originalUrl}]`, err.message || err);
  }

  const message = isClientError
    ? err.message
    : 'An unexpected error occurred while processing your document. Please verify your file and try again.';

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(env.NODE_ENV === 'development' && !isClientError ? { devDetails: err.message } : {}),
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
