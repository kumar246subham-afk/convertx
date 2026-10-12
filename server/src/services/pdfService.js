const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');
const { encryptPDF, decryptPDF } = require('cryptpdf');
const pdfParse = require('pdf-parse');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const { parsePageRanges } = require('../utils/validators');
const { ensureDir } = require('../utils/helpers');
const { AppError } = require('../utils/errors');

ensureDir(env.PROCESSED_DIR);

/**
 * Merge multiple PDF documents in specified order
 */
async function mergePdfs(files, customOrder = null) {
  if (!files || files.length < 2) {
    throw new AppError('Please upload at least 2 PDF files to merge.', 400);
  }

  // Order files if customOrder is provided
  let orderedFiles = [...files];
  if (Array.isArray(customOrder) && customOrder.length === files.length) {
    orderedFiles = customOrder.map((idx) => files[idx] || files[0]);
  }

  const mergedDoc = await PDFDocument.create();
  let totalPageCount = 0;

  for (const file of orderedFiles) {
    const fileBytes = fs.readFileSync(file.path);
    const doc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
    const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
    copiedPages.forEach((page) => mergedDoc.addPage(page));
    totalPageCount += doc.getPageCount();
  }

  const outputPath = path.join(env.PROCESSED_DIR, `merged-${uuidv4()}.pdf`);
  const mergedPdfBytes = await mergedDoc.save();
  fs.writeFileSync(outputPath, mergedPdfBytes);

  return {
    outputPath,
    filename: 'merged.pdf',
    pageCount: totalPageCount,
    size: mergedPdfBytes.length,
  };
}

/**
 * Split a PDF by page ranges or split every N pages
 */
async function splitPdf(file, options = {}) {
  const fileBytes = fs.readFileSync(file.path);
  const srcDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const { ranges, splitEvery } = options;

  // Mode 1: Split every N pages
  if (splitEvery && parseInt(splitEvery, 10) > 0) {
    const n = parseInt(splitEvery, 10);
    const outputZipPath = path.join(env.PROCESSED_DIR, `split-${uuidv4()}.zip`);
    const outputZip = fs.createWriteStream(outputZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(outputZip);

    let docIndex = 1;
    for (let i = 0; i < totalPages; i += n) {
      const chunkDoc = await PDFDocument.create();
      const pageIndices = [];
      for (let j = i; j < Math.min(i + n, totalPages); j++) {
        pageIndices.push(j);
      }
      const copied = await chunkDoc.copyPages(srcDoc, pageIndices);
      copied.forEach((p) => chunkDoc.addPage(p));
      const chunkBytes = await chunkDoc.save();
      archive.append(Buffer.from(chunkBytes), {
        name: `split-part-${docIndex}-pages-${i + 1}-to-${Math.min(i + n, totalPages)}.pdf`,
      });
      docIndex++;
    }

    await archive.finalize();
    await new Promise((resolve) => outputZip.on('close', resolve));

    return {
      outputPath: outputZipPath,
      filename: 'split-documents.zip',
      mimeType: 'application/zip',
      isZip: true,
      size: fs.statSync(outputZipPath).size,
    };
  }

  // Mode 2: Specific page range(s)
  if (!ranges || typeof ranges !== 'string' || ranges.trim() === '') {
    throw new AppError('Please provide page ranges to split (e.g. "1-3, 5, 8-10").', 400);
  }

  const validation = parsePageRanges(ranges, totalPages);
  if (!validation.valid) {
    throw new AppError(validation.error, 400);
  }

  const targetDoc = await PDFDocument.create();
  const copiedPages = await targetDoc.copyPages(srcDoc, validation.pages);
  copiedPages.forEach((p) => targetDoc.addPage(p));

  const splitBytes = await targetDoc.save();
  const outputPath = path.join(env.PROCESSED_DIR, `split-${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, splitBytes);

  return {
    outputPath,
    filename: `split-${path.basename(file.originalname, '.pdf')}.pdf`,
    pageCount: validation.pages.length,
    size: splitBytes.length,
  };
}

/**
 * Organize PDF: reorder pages and remove specified pages
 */
async function organizePdf(file, options = {}) {
  const { pageOrder, deletedPages = [] } = options;
  const fileBytes = fs.readFileSync(file.path);
  const srcDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const toNumberArray = (val) => {
    if (Array.isArray(val)) {
      return val.map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
    }
    if (typeof val === 'string' && val.trim() !== '') {
      return val
        .split(',')
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => !Number.isNaN(n));
    }
    return [];
  };

  const parsedOrder = toNumberArray(pageOrder);
  const order = parsedOrder.length > 0
    ? parsedOrder.map((n) => n - 1) // convert to 0-based
    : srcDoc.getPageIndices();

  const parsedDeleted = toNumberArray(deletedPages);
  const deletedSet = new Set(parsedDeleted.map((n) => n - 1));
  const finalIndices = order.filter((idx) => !deletedSet.has(idx) && idx >= 0 && idx < totalPages);

  if (finalIndices.length === 0) {
    throw new AppError('Cannot delete all pages from the document. At least one page must remain.', 400);
  }

  const organizedDoc = await PDFDocument.create();
  const copied = await organizedDoc.copyPages(srcDoc, finalIndices);
  copied.forEach((p) => organizedDoc.addPage(p));

  const outBytes = await organizedDoc.save();
  const outputPath = path.join(env.PROCESSED_DIR, `organized-${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, outBytes);

  return {
    outputPath,
    filename: `organized-${path.basename(file.originalname, '.pdf')}.pdf`,
    pageCount: finalIndices.length,
    size: outBytes.length,
  };
}

/**
 * Rotate selected or all pages by 90, 180, or 270 degrees
 */
async function rotatePdf(file, options = {}) {
  const { pages = 'all', angle = 90 } = options;
  const rotationAngle = parseInt(angle, 10);
  if (![90, 180, 270].includes(rotationAngle)) {
    throw new AppError('Rotation angle must be 90, 180, or 270 degrees.', 400);
  }

  const fileBytes = fs.readFileSync(file.path);
  const doc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  let targetIndices = [];
  if (pages === 'all' || !pages) {
    targetIndices = doc.getPageIndices();
  } else {
    const parsed = parsePageRanges(String(pages), totalPages);
    if (!parsed.valid) throw new AppError(parsed.error, 400);
    targetIndices = parsed.pages;
  }

  for (const idx of targetIndices) {
    const page = doc.getPage(idx);
    const currentAngle = page.getRotation().angle;
    page.setRotation(degrees((currentAngle + rotationAngle) % 360));
  }

  const outBytes = await doc.save();
  const outputPath = path.join(env.PROCESSED_DIR, `rotated-${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, outBytes);

  return {
    outputPath,
    filename: `rotated-${path.basename(file.originalname, '.pdf')}.pdf`,
    pageCount: totalPages,
    size: outBytes.length,
  };
}

/**
 * Extract selected pages into a new document
 */
async function extractPages(file, options = {}) {
  const { pages } = options;
  if (!pages || typeof pages !== 'string' || pages.trim() === '') {
    throw new AppError('Please select which pages to extract (e.g. "1, 3-5").', 400);
  }

  const fileBytes = fs.readFileSync(file.path);
  const srcDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  const parsed = parsePageRanges(pages, totalPages);
  if (!parsed.valid) throw new AppError(parsed.error, 400);

  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(srcDoc, parsed.pages);
  copied.forEach((p) => newDoc.addPage(p));

  const outBytes = await newDoc.save();
  const outputPath = path.join(env.PROCESSED_DIR, `extracted-${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, outBytes);

  return {
    outputPath,
    filename: `extracted-${path.basename(file.originalname, '.pdf')}.pdf`,
    pageCount: parsed.pages.length,
    size: outBytes.length,
  };
}

/**
 * Compress PDF: optimize stream storage and structure
 */
async function compressPdf(file) {
  const fileBytes = fs.readFileSync(file.path);
  const originalSize = fileBytes.length;

  const doc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  // Strip non-essential metadata and save with object stream compression
  doc.setTitle('');
  doc.setAuthor('');
  doc.setProducer('ConvertX Optimizer');
  doc.setCreator('ConvertX');

  const compressedBytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });

  const compressedSize = compressedBytes.length;
  const reduction = originalSize > compressedSize ? originalSize - compressedSize : 0;
  const reductionPercent = originalSize > 0 ? ((reduction / originalSize) * 100).toFixed(1) : '0';

  const outputPath = path.join(env.PROCESSED_DIR, `compressed-${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, compressedBytes);

  return {
    outputPath,
    filename: `compressed-${path.basename(file.originalname, '.pdf')}.pdf`,
    originalSize,
    compressedSize,
    reductionPercent: `${reductionPercent}%`,
    size: compressedSize,
  };
}

/**
 * Add configurable page numbers to all pages
 */
async function addPageNumbers(file, options = {}) {
  const {
    position = 'bottom-center',
    fontSize = 10,
    startNumber = 1,
    format = 'Page {n} of {total}',
  } = options;

  const fileBytes = fs.readFileSync(file.path);
  const doc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const totalPages = doc.getPageCount();
  const start = parseInt(startNumber, 10) || 1;
  const size = Math.min(Math.max(parseInt(fontSize, 10) || 10, 6), 24);

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const currentPageNum = start + i;

    let text = format
      .replace('{n}', currentPageNum)
      .replace('{total}', totalPages + start - 1);
    if (!format.includes('{n}')) {
      text = `${currentPageNum}`;
    }

    const textWidth = font.widthOfTextAtSize(text, size);
    const textHeight = font.heightAtSize(size);
    const margin = 24;

    let x = (width - textWidth) / 2; // default center
    let y = margin; // default bottom

    if (position === 'bottom-left') {
      x = margin;
      y = margin;
    } else if (position === 'bottom-right') {
      x = width - textWidth - margin;
      y = margin;
    } else if (position === 'top-center') {
      x = (width - textWidth) / 2;
      y = height - margin - textHeight;
    } else if (position === 'top-left') {
      x = margin;
      y = height - margin - textHeight;
    } else if (position === 'top-right') {
      x = width - textWidth - margin;
      y = height - margin - textHeight;
    }

    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  const outBytes = await doc.save();
  const outputPath = path.join(env.PROCESSED_DIR, `numbered-${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, outBytes);

  return {
    outputPath,
    filename: `numbered-${path.basename(file.originalname, '.pdf')}.pdf`,
    pageCount: totalPages,
    size: outBytes.length,
  };
}

/**
 * Add text watermark to all pages
 */
async function addWatermark(file, options = {}) {
  const {
    text = 'CONFIDENTIAL',
    opacity = 0.25,
    fontSize = 48,
    rotation = 45,
    color = '#7c3aed',
  } = options;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    throw new AppError('Watermark text cannot be empty.', 400);
  }

  const fileBytes = fs.readFileSync(file.path);
  const doc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const totalPages = doc.getPageCount();

  const size = Math.min(Math.max(parseInt(fontSize, 10) || 48, 12), 120);
  const op = Math.min(Math.max(parseFloat(opacity) || 0.25, 0.05), 1.0);
  const rot = parseInt(rotation, 10) || 45;

  // Hex to rgb
  let r = 0.48, g = 0.23, b = 0.93; // brand default
  if (color && /^#[0-9a-fA-F]{6}$/.test(color)) {
    r = parseInt(color.slice(1, 3), 16) / 255;
    g = parseInt(color.slice(3, 5), 16) / 255;
    b = parseInt(color.slice(5, 7), 16) / 255;
  }

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, size);
    const textHeight = font.heightAtSize(size);

    // Approximate center calculation with rotation
    const rad = (rot * Math.PI) / 180;
    const x = width / 2 - (textWidth / 2) * Math.cos(rad);
    const y = height / 2 - (textWidth / 2) * Math.sin(rad);

    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(r, g, b),
      opacity: op,
      rotate: degrees(rot),
    });
  }

  const outBytes = await doc.save();
  const outputPath = path.join(env.PROCESSED_DIR, `watermarked-${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, outBytes);

  return {
    outputPath,
    filename: `watermarked-${path.basename(file.originalname, '.pdf')}.pdf`,
    pageCount: totalPages,
    size: outBytes.length,
  };
}

/**
 * Protect PDF with password using real AES-256 encryption
 */
async function protectPdf(file, options = {}) {
  const { password } = options;
  if (!password || typeof password !== 'string' || password.length < 1) {
    throw new AppError('A password is required to protect the PDF document.', 400);
  }

  const fileBytes = fs.readFileSync(file.path);
  // Encrypt with cryptpdf
  const encryptedBytes = await encryptPDF(fileBytes, password, password);

  const outputPath = path.join(env.PROCESSED_DIR, `protected-${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, encryptedBytes);

  return {
    outputPath,
    filename: `protected-${path.basename(file.originalname, '.pdf')}.pdf`,
    size: encryptedBytes.length,
  };
}

/**
 * Unlock PDF with password
 */
async function unlockPdf(file, options = {}) {
  const { password } = options;
  if (!password || typeof password !== 'string') {
    throw new AppError('Password is required to unlock this document.', 400);
  }

  const fileBytes = fs.readFileSync(file.path);
  let decryptedBytes;
  try {
    decryptedBytes = await decryptPDF(fileBytes, password);
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('wrong password')) {
      throw new AppError('Incorrect password. Please verify your password and try again.', 400);
    }
    if (err.message && err.message.toLowerCase().includes('not encrypted')) {
      throw new AppError('The uploaded document is not password-protected.', 400);
    }
    throw new AppError(`Failed to decrypt document: ${err.message}`, 400);
  }

  const outputPath = path.join(env.PROCESSED_DIR, `unlocked-${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, decryptedBytes);

  return {
    outputPath,
    filename: `unlocked-${path.basename(file.originalname, '.pdf')}.pdf`,
    size: decryptedBytes.length,
  };
}

/**
 * Extract plain text from PDF
 */
async function extractText(file) {
  const fileBytes = fs.readFileSync(file.path);
  let text = '';
  let numpages = 1;

  try {
    const data = await pdfParse(fileBytes);
    text = data.text || '';
    numpages = data.numpages || 1;
  } catch (parseErr) {
    try {
      globalThis.pdfjsWorker = require('pdfjs-dist/legacy/build/pdf.worker.js');
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(fileBytes) }).promise;
      numpages = pdf.numPages;
      const pageTexts = [];
      for (let i = 1; i <= numpages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pageTexts.push(content.items.map((item) => item.str).join(' '));
      }
      text = pageTexts.join('\n\n');
      delete globalThis.pdfjsWorker;
    } catch (fallbackErr) {
      delete globalThis.pdfjsWorker;
      throw new AppError('Unable to extract text from this PDF document.', 400);
    }
  }

  const outputPath = path.join(env.PROCESSED_DIR, `text-${uuidv4()}.txt`);
  fs.writeFileSync(outputPath, text);

  return {
    outputPath,
    filename: `${path.basename(file.originalname, '.pdf')}-extracted.txt`,
    mimeType: 'text/plain',
    text,
    numpages,
    size: Buffer.byteLength(text, 'utf8'),
  };
}

/**
 * Get PDF metadata and page count
 */
async function getPdfMetadata(file) {
  const fileBytes = fs.readFileSync(file.path);
  const doc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });

  return {
    title: doc.getTitle() || '',
    author: doc.getAuthor() || '',
    subject: doc.getSubject() || '',
    keywords: (doc.getKeywords() || '').split(';').map((k) => k.trim()).filter(Boolean),
    producer: doc.getProducer() || '',
    creator: doc.getCreator() || '',
    creationDate: doc.getCreationDate() || null,
    modificationDate: doc.getModificationDate() || null,
    pageCount: doc.getPageCount(),
    fileSize: fileBytes.length,
  };
}

/**
 * Update PDF metadata
 */
async function updatePdfMetadata(file, metadata = {}) {
  const fileBytes = fs.readFileSync(file.path);
  const doc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });

  if (metadata.title !== undefined) doc.setTitle(String(metadata.title));
  if (metadata.author !== undefined) doc.setAuthor(String(metadata.author));
  if (metadata.subject !== undefined) doc.setSubject(String(metadata.subject));
  if (metadata.keywords !== undefined) {
    const kw = Array.isArray(metadata.keywords)
      ? metadata.keywords.join('; ')
      : String(metadata.keywords);
    doc.setKeywords([kw]);
  }
  if (metadata.creator !== undefined) doc.setCreator(String(metadata.creator));
  if (metadata.producer !== undefined) doc.setProducer(String(metadata.producer));

  const outBytes = await doc.save();
  const outputPath = path.join(env.PROCESSED_DIR, `metadata-${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, outBytes);

  return {
    outputPath,
    filename: `updated-${path.basename(file.originalname, '.pdf')}.pdf`,
    pageCount: doc.getPageCount(),
    size: outBytes.length,
  };
}

module.exports = {
  mergePdfs,
  splitPdf,
  organizePdf,
  rotatePdf,
  extractPages,
  compressPdf,
  addPageNumbers,
  addWatermark,
  protectPdf,
  unlockPdf,
  extractText,
  getPdfMetadata,
  updatePdfMetadata,
};
