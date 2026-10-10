const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const { safeDelete, formatBytes } = require('../utils/helpers');

// In-memory registry of processed files ready for download
// downloadId -> { id, filePath, originalName, mimeType, size, createdAt, expiresAt }
const fileRegistry = new Map();

/**
 * Registers a newly created output file into the secure download registry
 * @param {string} filePath Absolute path to the generated file in processed/
 * @param {string} originalName Human-friendly suggested download filename
 * @param {string} mimeType Content-Type for download
 * @returns {object} File record with unique downloadId
 */
function registerFile(filePath, originalName, mimeType = 'application/pdf') {
  const id = uuidv4();
  const stats = fs.statSync(filePath);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + env.FILE_RETENTION_MINUTES * 60 * 1000);

  const record = {
    id,
    filePath,
    originalName,
    mimeType,
    size: stats.size,
    sizeFormatted: formatBytes(stats.size),
    createdAt,
    expiresAt,
    downloadCount: 0,
  };

  fileRegistry.set(id, record);
  return record;
}

/**
 * Look up a registered file by download ID
 * Validates expiration and file existence
 * @param {string} id
 * @returns {object|null}
 */
function getFile(id) {
  if (!id || typeof id !== 'string') return null;
  const record = fileRegistry.get(id);
  if (!record) return null;

  // Check expiration
  if (new Date() > record.expiresAt) {
    // Expired - clean it up
    safeDelete(record.filePath);
    fileRegistry.delete(id);
    return null;
  }

  // Check physical file exists
  if (!fs.existsSync(record.filePath)) {
    fileRegistry.delete(id);
    return null;
  }

  return record;
}

/**
 * Increments download count
 * @param {string} id
 */
function incrementDownloadCount(id) {
  const record = fileRegistry.get(id);
  if (record) {
    record.downloadCount += 1;
  }
}

/**
 * Sweeps the registry and uploads/processed folders for stale files
 */
function cleanupExpired() {
  const now = new Date();
  let cleanedCount = 0;

  for (const [id, record] of fileRegistry.entries()) {
    if (now > record.expiresAt) {
      safeDelete(record.filePath);
      fileRegistry.delete(id);
      cleanedCount += 1;
    }
  }

  // Also sweep physical directories in case orphan files exist
  [env.UPLOADS_DIR, env.PROCESSED_DIR].forEach((dir) => {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
          if (file === '.gitkeep') return;
          const fullPath = path.join(dir, file);
          try {
            const stats = fs.statSync(fullPath);
            const ageMinutes = (now.getTime() - stats.mtimeMs) / (1000 * 60);
            if (ageMinutes > env.FILE_RETENTION_MINUTES) {
              safeDelete(fullPath);
              cleanedCount += 1;
            }
          } catch {
            // file might have been unlinked
          }
        });
      } catch (err) {
        console.error(`Error sweeping directory ${dir}:`, err.message);
      }
    }
  });

  return cleanedCount;
}

module.exports = {
  registerFile,
  getFile,
  incrementDownloadCount,
  cleanupExpired,
  fileRegistry,
};
