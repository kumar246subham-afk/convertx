const fs = require('fs');
const path = require('path');

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function sanitizeFilename(originalName, fallback = 'document.pdf') {
  if (!originalName || typeof originalName !== 'string') return fallback;
  // Strip paths, special shell chars, null bytes
  const base = path.basename(originalName);
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return clean || fallback;
}

function safeDelete(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete temporary file ${filePath}:`, err.message);
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

module.exports = {
  formatBytes,
  sanitizeFilename,
  safeDelete,
  ensureDir,
};
