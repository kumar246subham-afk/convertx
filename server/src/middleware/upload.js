const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const { ensureDir } = require('../utils/helpers');

// Ensure uploads dir exists
ensureDir(env.UPLOADS_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const maxBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;

// General file upload middleware
const upload = multer({
  storage,
  limits: {
    fileSize: maxBytes,
    files: 20, // Allow up to 20 files for merge or images-to-pdf
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.docx',
      '.doc',
      '.xlsx',
      '.xls',
      '.pptx',
      '.ppt',
      '.txt',
      '.html',
    ];

    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type "${ext}". Supported types: ${allowedExtensions.join(', ')}`));
    }
  },
});

module.exports = upload;
