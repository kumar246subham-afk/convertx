/**
 * Validates and parses human page range strings such as "1-3, 5, 8-10"
 * Returns an array of 0-based page indices.
 * @param {string} rangeStr
 * @param {number} totalPages
 * @returns {{ valid: boolean, pages: number[], error?: string }}
 */
function parsePageRanges(rangeStr, totalPages) {
  if (!rangeStr || typeof rangeStr !== 'string' || rangeStr.trim() === '') {
    return { valid: false, pages: [], error: 'Page range cannot be empty.' };
  }

  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { valid: false, pages: [], error: 'Invalid page range format.' };
  }

  const selectedPagesSet = new Set();

  for (const part of parts) {
    if (part.includes('-')) {
      const bounds = part.split('-').map((b) => b.trim());
      if (bounds.length !== 2) {
        return { valid: false, pages: [], error: `Invalid range format: "${part}"` };
      }
      const start = parseInt(bounds[0], 10);
      const end = parseInt(bounds[1], 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
        return { valid: false, pages: [], error: `Invalid range bounds: "${part}". Must be positive and start <= end.` };
      }

      if (end > totalPages) {
        return {
          valid: false,
          pages: [],
          error: `Page range "${part}" exceeds document page count of ${totalPages}.`,
        };
      }

      for (let i = start; i <= end; i++) {
        selectedPagesSet.add(i - 1); // convert to 0-based
      }
    } else {
      const single = parseInt(part, 10);
      if (isNaN(single) || single < 1) {
        return { valid: false, pages: [], error: `Invalid page number: "${part}". Must be >= 1.` };
      }
      if (single > totalPages) {
        return {
          valid: false,
          pages: [],
          error: `Page ${single} exceeds document page count of ${totalPages}.`,
        };
      }
      selectedPagesSet.add(single - 1);
    }
  }

  const pages = Array.from(selectedPagesSet).sort((a, b) => a - b);
  if (pages.length === 0) {
    return { valid: false, pages: [], error: 'No valid pages found in range.' };
  }

  return { valid: true, pages };
}

/**
 * Checks magic bytes of a buffer to verify PDF header
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isPdfBuffer(buffer) {
  if (!buffer || buffer.length < 5) return false;
  // %PDF-
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
}

module.exports = {
  parsePageRanges,
  isPdfBuffer,
};
