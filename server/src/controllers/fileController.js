const fs = require('fs');
const fileService = require('../services/fileService');

function download(req, res) {
  const { id } = req.params;
  const fileRecord = fileService.getFile(id);

  if (!fileRecord) {
    return res.status(404).json({
      success: false,
      error: 'File not found or the download link has expired.',
      code: 'FILE_EXPIRED_OR_NOT_FOUND',
    });
  }

  fileService.incrementDownloadCount(id);

  res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(fileRecord.originalName)}"`
  );
  res.setHeader('Content-Length', fileRecord.size);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const stream = fs.createReadStream(fileRecord.filePath);
  stream.on('error', (err) => {
    console.error('File stream error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to stream the requested file.' });
    }
  });

  stream.pipe(res);
}

function preview(req, res) {
  const { id } = req.params;
  const fileRecord = fileService.getFile(id);

  if (!fileRecord) {
    return res.status(404).json({
      success: false,
      error: 'File not found or the preview link has expired.',
      code: 'FILE_EXPIRED_OR_NOT_FOUND',
    });
  }

  res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(fileRecord.originalName)}"`
  );
  res.setHeader('Content-Length', fileRecord.size);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const stream = fs.createReadStream(fileRecord.filePath);
  stream.pipe(res);
}

function getInfo(req, res) {
  const { id } = req.params;
  const fileRecord = fileService.getFile(id);

  if (!fileRecord) {
    return res.status(404).json({
      success: false,
      error: 'File not found or expired.',
    });
  }

  res.json({
    success: true,
    data: {
      id: fileRecord.id,
      filename: fileRecord.originalName,
      size: fileRecord.size,
      sizeFormatted: fileRecord.sizeFormatted,
      mimeType: fileRecord.mimeType,
      expiresAt: fileRecord.expiresAt,
    },
  });
}

module.exports = {
  download,
  preview,
  getInfo,
};
