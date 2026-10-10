const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const sharp = require('sharp');
const { pdfToPng } = require('pdf-to-png-converter');
const xlsx = require('xlsx');
const mammoth = require('mammoth');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const { ensureDir } = require('../utils/helpers');

ensureDir(env.PROCESSED_DIR);

/**
 * Locate LibreOffice executable if installed
 */
function findLibreOfficePath() {
  const commonPaths = [
    'soffice',
    'libreoffice',
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  ];

  for (const p of commonPaths) {
    if (p === 'soffice' || p === 'libreoffice') {
      // Will test via PATH later
      continue;
    }
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

let cachedLibreOfficePath = findLibreOfficePath();

/**
 * Converts multiple images (JPG, PNG, WebP) into a single PDF
 */
async function imagesToPdf(files, options = {}) {
  if (!files || files.length === 0) {
    throw new Error('Please upload at least one image file.');
  }

  const { fit = 'contain', margin = 20 } = options;
  const pageMargin = Math.max(0, parseInt(margin, 10) || 0);

  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    // Normalize and orient image using sharp
    const sharpInstance = sharp(file.path).rotate();
    const metadata = await sharpInstance.metadata();

    // Standard A4 dimensions in points: 595.28 x 841.89
    const isLandscape = (metadata.width || 800) > (metadata.height || 600);
    const pageWidth = isLandscape ? 841.89 : 595.28;
    const pageHeight = isLandscape ? 595.28 : 841.89;

    const availableWidth = pageWidth - pageMargin * 2;
    const availableHeight = pageHeight - pageMargin * 2;

    // Convert image buffer to JPEG or PNG for pdf-lib embedding
    const pngBuffer = await sharpInstance.png().toBuffer();
    const embeddedImage = await pdfDoc.embedPng(pngBuffer);

    const imgDims = embeddedImage.scale(1);
    let renderWidth = imgDims.width;
    let renderHeight = imgDims.height;

    if (fit === 'contain') {
      const scaleW = availableWidth / imgDims.width;
      const scaleH = availableHeight / imgDims.height;
      const scale = Math.min(scaleW, scaleH, 1.0);
      renderWidth = imgDims.width * scale;
      renderHeight = imgDims.height * scale;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const x = pageMargin + (availableWidth - renderWidth) / 2;
    const y = pageMargin + (availableHeight - renderHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: renderWidth,
      height: renderHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(env.PROCESSED_DIR, `images-to-pdf-${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, pdfBytes);

  return {
    outputPath,
    filename: 'converted-images.pdf',
    pageCount: files.length,
    size: pdfBytes.length,
  };
}

/**
 * Render PDF pages to high-resolution PNG or JPG images
 */
async function pdfToImages(file, options = {}) {
  const { format = 'png', dpi = 150 } = options;
  const isJpeg = format.toLowerCase() === 'jpeg' || format.toLowerCase() === 'jpg';

  const fileBytes = fs.readFileSync(file.path);
  const pages = await pdfToPng(fileBytes, {
    viewportScale: Math.max(1, (parseInt(dpi, 10) || 150) / 72),
  });

  if (!pages || pages.length === 0) {
    throw new Error('Could not render pages from the provided PDF document.');
  }

  // Single page result
  if (pages.length === 1) {
    let outBuffer = pages[0].content;
    const ext = isJpeg ? 'jpg' : 'png';
    const mime = isJpeg ? 'image/jpeg' : 'image/png';

    if (isJpeg) {
      outBuffer = await sharp(outBuffer).jpeg({ quality: 90 }).toBuffer();
    }

    const outputPath = path.join(env.PROCESSED_DIR, `page-1-${uuidv4()}.${ext}`);
    fs.writeFileSync(outputPath, outBuffer);

    return {
      outputPath,
      filename: `${path.basename(file.originalname, '.pdf')}-page-1.${ext}`,
      mimeType: mime,
      isZip: false,
      size: outBuffer.length,
    };
  }

  // Multiple pages: package into a ZIP archive
  const zipPath = path.join(env.PROCESSED_DIR, `pdf-images-${uuidv4()}.zip`);
  const outputZip = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(outputZip);

  for (let i = 0; i < pages.length; i++) {
    let pageBuffer = pages[i].content;
    const ext = isJpeg ? 'jpg' : 'png';
    if (isJpeg) {
      pageBuffer = await sharp(pageBuffer).jpeg({ quality: 90 }).toBuffer();
    }
    archive.append(pageBuffer, {
      name: `page-${i + 1}.${ext}`,
    });
  }

  await archive.finalize();
  await new Promise((resolve) => outputZip.on('close', resolve));

  return {
    outputPath: zipPath,
    filename: `${path.basename(file.originalname, '.pdf')}-images.zip`,
    mimeType: 'application/zip',
    isZip: true,
    pageCount: pages.length,
    size: fs.statSync(zipPath).size,
  };
}

/**
 * Convert Excel (XLSX, XLS) to clean, structured, paginated PDF
 */
async function excelToPdf(file) {
  const workbook = xlsx.readFile(file.path);
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throw new Error('The uploaded Excel spreadsheet contains no visible sheets.');
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Landscape A4 for wide table presentation
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const rowHeight = 22;
  const headerHeight = 26;

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!data || data.length === 0) continue;

    // Filter empty rows
    const rows = data.filter((row) => Array.isArray(row) && row.some((cell) => cell !== ''));
    if (rows.length === 0) continue;

    const columnCount = Math.min(Math.max(...rows.map((r) => r.length)), 10); // cap to 10 cols for layout
    const colWidth = contentWidth / columnCount;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    // Draw Sheet Title
    currentPage.drawText(`Sheet: ${sheetName}`, {
      x: margin,
      y: currentY - 14,
      size: 14,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    currentY -= 36;

    rows.forEach((row, rowIndex) => {
      // Check pagination
      if (currentY - rowHeight < margin) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin - 20;
      }

      const isHeader = rowIndex === 0;
      const currentFont = isHeader ? fontBold : font;
      const currentFontSize = isHeader ? 10 : 9;

      // Background shading for headers and alternating rows
      if (isHeader) {
        currentPage.drawRectangle({
          x: margin,
          y: currentY - headerHeight + 6,
          width: contentWidth,
          height: headerHeight,
          color: rgb(0.93, 0.93, 0.98), // light brand tint
        });
      } else if (rowIndex % 2 === 1) {
        currentPage.drawRectangle({
          x: margin,
          y: currentY - rowHeight + 6,
          width: contentWidth,
          height: rowHeight,
          color: rgb(0.98, 0.98, 0.99),
        });
      }

      // Draw cells
      for (let c = 0; c < columnCount; c++) {
        const rawVal = row[c] !== undefined ? String(row[c]) : '';
        // Truncate cell text if exceeding column width
        const maxChars = Math.floor(colWidth / 6);
        const cellText = rawVal.length > maxChars ? `${rawVal.slice(0, maxChars - 2)}..` : rawVal;
        const cellX = margin + c * colWidth + 6;
        const cellY = currentY - (isHeader ? 12 : 8);

        currentPage.drawText(cellText, {
          x: cellX,
          y: cellY,
          size: currentFontSize,
          font: currentFont,
          color: isHeader ? rgb(0.2, 0.1, 0.5) : rgb(0.2, 0.2, 0.2),
        });
      }

      currentY -= isHeader ? headerHeight : rowHeight;
    });
  }

  if (pdfDoc.getPageCount() === 0) {
    // Add empty placeholder page if all sheets were blank
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawText('Spreadsheet contained no readable data.', {
      x: margin,
      y: pageHeight - 100,
      size: 12,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(env.PROCESSED_DIR, `excel-to-pdf-${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, pdfBytes);

  return {
    outputPath,
    filename: `${path.basename(file.originalname, path.extname(file.originalname))}.pdf`,
    pageCount: pdfDoc.getPageCount(),
    size: pdfBytes.length,
  };
}

/**
 * Execute LibreOffice headless conversion
 */
function convertWithLibreOffice(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    const sofficeBin = cachedLibreOfficePath || 'soffice';
    execFile(
      sofficeBin,
      ['--headless', '--convert-to', 'pdf', '--outdir', outputDir, inputPath],
      { timeout: 30000 },
      (error, stdout, stderr) => {
        if (error) {
          return reject(
            new Error(`LibreOffice conversion failed: ${error.message} (stderr: ${stderr})`)
          );
        }
        resolve(stdout);
      }
    );
  });
}

/**
 * Convert Word (DOCX) document to styled PDF
 */
async function wordToPdf(file) {
  // Option 1: Native LibreOffice conversion if installed
  if (cachedLibreOfficePath) {
    try {
      const outDir = env.PROCESSED_DIR;
      await convertWithLibreOffice(file.path, outDir);
      const generatedPdfName = `${path.basename(file.path, path.extname(file.path))}.pdf`;
      const generatedPdfPath = path.join(outDir, generatedPdfName);
      if (fs.existsSync(generatedPdfPath)) {
        return {
          outputPath: generatedPdfPath,
          filename: `${path.basename(file.originalname, path.extname(file.originalname))}.pdf`,
          size: fs.statSync(generatedPdfPath).size,
        };
      }
    } catch (e) {
      console.warn('LibreOffice conversion attempt failed, falling back to built-in converter:', e.message);
    }
  }

  // Option 2: High-fidelity structured parsing using Mammoth + pdf-lib
  const result = await mammoth.extractRawText({ path: file.path });
  const rawText = result.value || '';

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 54; // 0.75 in
  const maxWidth = pageWidth - margin * 2;
  const fontSize = 11;
  const lineHeight = 16;

  const lines = rawText.split(/\r?\n/);
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  // Document Title Header
  currentPage.drawText(path.basename(file.originalname, path.extname(file.originalname)), {
    x: margin,
    y: currentY - 18,
    size: 16,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.25),
  });
  currentY -= 40;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      currentY -= lineHeight * 0.75;
      continue;
    }

    // Word wrap line to fit maxWidth
    const words = trimmed.split(' ');
    let currentLineText = '';

    for (const word of words) {
      const candidate = currentLineText ? `${currentLineText} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(candidate, fontSize);

      if (textWidth < maxWidth) {
        currentLineText = candidate;
      } else {
        // Render full line
        if (currentY - lineHeight < margin) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin - 20;
        }

        currentPage.drawText(currentLineText, {
          x: margin,
          y: currentY,
          size: fontSize,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        currentY -= lineHeight;
        currentLineText = word;
      }
    }

    if (currentLineText) {
      if (currentY - lineHeight < margin) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin - 20;
      }

      currentPage.drawText(currentLineText, {
        x: margin,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= lineHeight;
    }
  }

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(env.PROCESSED_DIR, `word-to-pdf-${uuidv4()}.pdf`);
  fs.writeFileSync(outputPath, pdfBytes);

  return {
    outputPath,
    filename: `${path.basename(file.originalname, path.extname(file.originalname))}.pdf`,
    pageCount: pdfDoc.getPageCount(),
    size: pdfBytes.length,
  };
}

/**
 * Convert PowerPoint (PPTX) presentation to PDF
 */
async function powerpointToPdf(file) {
  if (cachedLibreOfficePath) {
    try {
      const outDir = env.PROCESSED_DIR;
      await convertWithLibreOffice(file.path, outDir);
      const generatedPdfName = `${path.basename(file.path, path.extname(file.path))}.pdf`;
      const generatedPdfPath = path.join(outDir, generatedPdfName);
      if (fs.existsSync(generatedPdfPath)) {
        return {
          outputPath: generatedPdfPath,
          filename: `${path.basename(file.originalname, path.extname(file.originalname))}.pdf`,
          size: fs.statSync(generatedPdfPath).size,
        };
      }
    } catch (e) {
      console.warn('LibreOffice PPTX conversion failed:', e.message);
    }
  }

  // If LibreOffice is not installed, provide clean, actionable requirement details
  throw new Error(
    'PowerPoint conversion requires LibreOffice to be installed on the host machine. Please install LibreOffice or set up the LibreOffice path in server configuration.'
  );
}

/**
 * Check system utilities status (LibreOffice, etc.)
 */
function getSystemStatus() {
  return {
    libreOfficeInstalled: Boolean(cachedLibreOfficePath),
    libreOfficePath: cachedLibreOfficePath,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
  };
}

module.exports = {
  imagesToPdf,
  pdfToImages,
  excelToPdf,
  wordToPdf,
  powerpointToPdf,
  getSystemStatus,
};
