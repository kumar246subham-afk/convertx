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
const { convertDocxToPdf } = require('docx-to-pdf-lite');
const env = require('../config/env');
const { ensureDir } = require('../utils/helpers');

ensureDir(env.PROCESSED_DIR);

/**
 * Detect Microsoft Word COM automation on Windows
 */
let cachedWordAvailable = null;
function detectMsWord() {
  if (process.platform !== 'win32') return false;
  if (cachedWordAvailable !== null) return cachedWordAvailable;
  try {
    const { execSync } = require('child_process');
    const checkScript =
      '$w = $null; try { $w = New-Object -ComObject Word.Application; $v = $w.Version; Write-Host $v } finally { if ($w -ne $null) { $w.Quit(); [System.Runtime.InteropServices.Marshal]::ReleaseComObject($w) | Out-Null } }';
    const encoded = Buffer.from(checkScript, 'utf16le').toString('base64');
    const out = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`, {
      timeout: 5000,
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    cachedWordAvailable = Boolean(out && out.trim());
  } catch (e) {
    cachedWordAvailable = false;
  }
  return cachedWordAvailable;
}

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
  // Clear any legacy pdfjsWorker set by pdfjs-dist v3 so pdf-to-png-converter (v6) uses its own worker
  if (globalThis.pdfjsWorker) {
    delete globalThis.pdfjsWorker;
  }
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
    currentPage.drawText(`Sheet: ${sanitizeForWinAnsi(sheetName)}`, {
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
        const rawVal = sanitizeForWinAnsi(row[c] !== undefined ? String(row[c]) : '');
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
 * Execute Microsoft Word COM conversion on Windows
 */
function convertWithMsWord(inputPath, outputPath) {
  if (process.platform !== 'win32') {
    return Promise.reject(new Error('Microsoft Word COM automation is only available on Windows.'));
  }

  return new Promise((resolve, reject) => {
    const psScript = `
$ErrorActionPreference = 'Stop'
$word = $null
$document = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $document = $word.Documents.Open('${inputPath.replace(/'/g, "''")}', $false, $true)
  $document.ExportAsFixedFormat('${outputPath.replace(/'/g, "''")}', 17)
}
finally {
  if ($document -ne $null) {
    $document.Close($false)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null
  }
  if ($word -ne $null) {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
`;
    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { windowsHide: true, timeout: 60000 },
      (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`Microsoft Word conversion failed: ${error.message} (stderr: ${stderr})`));
        }
        resolve();
      }
    );
  });
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
 * Sanitize text for standard PDF WinAnsi font encoding (Helvetica, Times, Courier)
 * Replaces tab characters, Word symbol bullets (e.g. 0xF0AE), smart quotes, and unencodable chars.
 */
function sanitizeForWinAnsi(str) {
  if (!str) return '';
  // 1. Expand tab characters
  let text = str.replace(/\t/g, '    ');
  // 2. Word private-use symbol bullets (e.g. Wingdings/Symbol 0xF000 - 0xF0FF including 0xF0AE)
  text = text.replace(/[\uF000-\uF0FF]/g, '- ');
  // 3. Smart punctuation & typographic symbols
  text = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '* ')
    .replace(/\u00A0/g, ' ');

  // 4. Filter characters strictly against valid WinAnsi range (Windows-1252)
  let result = '';
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code === 10 || code === 13 || (code >= 32 && code <= 126) || (code >= 160 && code <= 255)) {
      result += ch;
    } else {
      result += '?';
    }
  }
  return result;
}

/**
 * Fallback converter using Mammoth text extraction and pdf-lib with WinAnsi sanitization
 */
async function convertWithMammothPdfLib(file, outputPath) {
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
  const docTitle = sanitizeForWinAnsi(path.basename(file.originalname, path.extname(file.originalname)));
  currentPage.drawText(docTitle, {
    x: margin,
    y: currentY - 18,
    size: 16,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.25),
  });
  currentY -= 40;

  for (const rawLine of lines) {
    const cleanLine = sanitizeForWinAnsi(rawLine);
    const trimmed = cleanLine.trim();
    if (!trimmed) {
      currentY -= lineHeight * 0.75;
      continue;
    }

    const words = trimmed.split(' ');
    let currentLineText = '';

    for (const word of words) {
      const candidate = currentLineText ? `${currentLineText} ${word}` : word;
      const textWidth = font.widthOfTextAtSize(candidate, fontSize);

      if (textWidth < maxWidth) {
        currentLineText = candidate;
      } else {
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
  fs.writeFileSync(outputPath, pdfBytes);
}

/**
 * Convert Word (DOCX / DOC) document to styled PDF
 * Uses a resilient multi-tier engine:
 * 1. docx-to-pdf-lite (tries Word on Windows, LibreOffice, then PlutoPrint/docx-preview in pure Node.js)
 * 2. Direct MS Word COM automation (native Word on Windows)
 * 3. LibreOffice headless conversion
 * 4. Mammoth text extraction + WinAnsi-safe pdf-lib rendering
 */
async function wordToPdf(file) {
  if (!file || !file.path) {
    throw new Error('Please upload a valid Word document.');
  }

  const ext = path.extname(file.originalname || file.path).toLowerCase();
  const baseName = path.basename(file.originalname || 'document', ext);
  const outputPdfName = `word-to-pdf-${uuidv4()}.pdf`;
  const outputPath = path.join(env.PROCESSED_DIR, outputPdfName);

  let converted = false;
  let lastError = null;

  // Engine 1: For .docx files, use docx-to-pdf-lite (which handles MS Word, LibreOffice, and pure-JS PlutoPrint)
  if (ext === '.docx') {
    try {
      await convertDocxToPdf(file.path, outputPath, { format: 'A4' });
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        converted = true;
      }
    } catch (err) {
      console.warn('[wordToPdf] docx-to-pdf-lite attempt failed:', err.message);
      lastError = err;
    }
  }

  // Engine 2: For Windows environments or .doc files, try direct Word COM
  if (!converted && process.platform === 'win32') {
    try {
      await convertWithMsWord(file.path, outputPath);
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        converted = true;
      }
    } catch (err) {
      console.warn('[wordToPdf] Direct MS Word COM attempt failed:', err.message);
      lastError = err;
    }
  }

  // Engine 3: Try LibreOffice if available
  if (!converted && cachedLibreOfficePath) {
    try {
      const outDir = env.PROCESSED_DIR;
      await convertWithLibreOffice(file.path, outDir);
      const generatedPdfName = `${path.basename(file.path, path.extname(file.path))}.pdf`;
      const generatedPdfPath = path.join(outDir, generatedPdfName);
      if (fs.existsSync(generatedPdfPath)) {
        fs.renameSync(generatedPdfPath, outputPath);
        converted = true;
      }
    } catch (err) {
      console.warn('[wordToPdf] LibreOffice attempt failed:', err.message);
      lastError = err;
    }
  }

  // Engine 4: Fallback to Mammoth + WinAnsi-safe pdf-lib rendering
  if (!converted) {
    try {
      await convertWithMammothPdfLib(file, outputPath);
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        converted = true;
      }
    } catch (err) {
      console.error('[wordToPdf] Fallback parser failed:', err.message);
      throw new Error(
        `Failed to convert Word document to PDF: ${lastError ? lastError.message : err.message}`
      );
    }
  }

  if (!converted || !fs.existsSync(outputPath)) {
    throw new Error('Failed to generate PDF from the uploaded Word document.');
  }

  // Determine page count
  let pageCount = 1;
  try {
    const pdfBytes = fs.readFileSync(outputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    pageCount = pdfDoc.getPageCount();
  } catch (e) {
    // Non-fatal if page count inspection fails
  }

  return {
    outputPath,
    filename: `${baseName}.pdf`,
    pageCount,
    size: fs.statSync(outputPath).size,
  };
}

/**
 * Convert PowerPoint (PPTX) presentation to PDF
 */
async function powerpointToPdf(file) {
  const baseName = path.basename(file.originalname || 'presentation', path.extname(file.originalname || ''));
  const outputPath = path.join(env.PROCESSED_DIR, `ppt-to-pdf-${uuidv4()}.pdf`);

  if (cachedLibreOfficePath) {
    try {
      const outDir = env.PROCESSED_DIR;
      await convertWithLibreOffice(file.path, outDir);
      const generatedPdfName = `${path.basename(file.path, path.extname(file.path))}.pdf`;
      const generatedPdfPath = path.join(outDir, generatedPdfName);
      if (fs.existsSync(generatedPdfPath)) {
        fs.renameSync(generatedPdfPath, outputPath);
        return {
          outputPath,
          filename: `${baseName}.pdf`,
          size: fs.statSync(outputPath).size,
        };
      }
    } catch (e) {
      console.warn('LibreOffice PPTX conversion failed:', e.message);
    }
  }

  // On Windows, try Microsoft PowerPoint COM automation (32 = ppSaveAsPDF)
  if (process.platform === 'win32') {
    try {
      await new Promise((resolve, reject) => {
        const psScript = `
$ErrorActionPreference = 'Stop'
$ppt = $null
$pres = $null
try {
  $ppt = New-Object -ComObject PowerPoint.Application
  $pres = $ppt.Presentations.Open('${file.path.replace(/'/g, "''")}', $true, $false, $false)
  $pres.SaveAs('${outputPath.replace(/'/g, "''")}', 32)
}
finally {
  if ($pres -ne $null) {
    $pres.Close()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($pres) | Out-Null
  }
  if ($ppt -ne $null) {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
  }
}
`;
        const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
        execFile(
          'powershell.exe',
          ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
          { windowsHide: true, timeout: 60000 },
          (err) => (err ? reject(err) : resolve())
        );
      });
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        return {
          outputPath,
          filename: `${baseName}.pdf`,
          size: fs.statSync(outputPath).size,
        };
      }
    } catch (e) {
      console.warn('MS PowerPoint COM conversion failed:', e.message);
    }
  }

  // If neither LibreOffice nor PowerPoint is installed, provide clean 400 error
  const err = new Error(
    'PowerPoint conversion requires LibreOffice or Microsoft PowerPoint to be installed on the server.'
  );
  err.status = 400;
  throw err;
}

/**
 * Check system utilities status (Word, LibreOffice, etc.)
 */
function getSystemStatus() {
  return {
    libreOfficeInstalled: Boolean(cachedLibreOfficePath),
    libreOfficePath: cachedLibreOfficePath,
    wordInstalled: detectMsWord(),
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
