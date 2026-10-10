const convertService = require('../services/convertService');
const fileService = require('../services/fileService');
const { safeDelete } = require('../utils/helpers');

async function imagesToPdf(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Please upload at least one image.' });
    }

    const result = await convertService.imagesToPdf(req.files, {
      fit: req.body.fit || 'contain',
      margin: req.body.margin !== undefined ? req.body.margin : 20,
    });

    const registered = fileService.registerFile(result.outputPath, result.filename, 'application/pdf');
    req.files.forEach((f) => safeDelete(f.path));

    res.json({
      success: true,
      data: {
        downloadId: registered.id,
        filename: registered.originalName,
        size: registered.size,
        sizeFormatted: registered.sizeFormatted,
        pageCount: result.pageCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function pdfToImages(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document.' });
    }

    const result = await convertService.pdfToImages(req.file, {
      format: req.body.format || 'png',
      dpi: req.body.dpi || 150,
    });

    const registered = fileService.registerFile(
      result.outputPath,
      result.filename,
      result.mimeType
    );
    safeDelete(req.file.path);

    res.json({
      success: true,
      data: {
        downloadId: registered.id,
        filename: registered.originalName,
        size: registered.size,
        sizeFormatted: registered.sizeFormatted,
        isZip: result.isZip || false,
        pageCount: result.pageCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function wordToPdf(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a Word document (.docx).' });
    }

    const result = await convertService.wordToPdf(req.file);
    const registered = fileService.registerFile(result.outputPath, result.filename, 'application/pdf');
    safeDelete(req.file.path);

    res.json({
      success: true,
      data: {
        downloadId: registered.id,
        filename: registered.originalName,
        size: registered.size,
        sizeFormatted: registered.sizeFormatted,
        pageCount: result.pageCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function excelToPdf(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload an Excel document (.xlsx).' });
    }

    const result = await convertService.excelToPdf(req.file);
    const registered = fileService.registerFile(result.outputPath, result.filename, 'application/pdf');
    safeDelete(req.file.path);

    res.json({
      success: true,
      data: {
        downloadId: registered.id,
        filename: registered.originalName,
        size: registered.size,
        sizeFormatted: registered.sizeFormatted,
        pageCount: result.pageCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function powerpointToPdf(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PowerPoint document (.pptx).' });
    }

    const result = await convertService.powerpointToPdf(req.file);
    const registered = fileService.registerFile(result.outputPath, result.filename, 'application/pdf');
    safeDelete(req.file.path);

    res.json({
      success: true,
      data: {
        downloadId: registered.id,
        filename: registered.originalName,
        size: registered.size,
        sizeFormatted: registered.sizeFormatted,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  imagesToPdf,
  pdfToImages,
  wordToPdf,
  excelToPdf,
  powerpointToPdf,
};
