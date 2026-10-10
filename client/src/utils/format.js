/**
 * Format bytes to a human-readable string: 1.23 MB, 456 KB, etc.
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = Math.max(0, decimals);
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Truncate a filename for display, preserving the extension.
 */
export function truncateFilename(name, maxLen = 28) {
  if (!name || name.length <= maxLen) return name;
  const ext = name.lastIndexOf('.') > -1 ? name.slice(name.lastIndexOf('.')) : '';
  return name.slice(0, maxLen - ext.length - 3) + '…' + ext;
}
