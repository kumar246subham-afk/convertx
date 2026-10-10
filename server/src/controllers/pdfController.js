const pdfService = require('../services/pdfService');
const fileService = require('../services/fileService');
const { safeDelete } = require('../utils/helpers');

async function merge(req, res, next) {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Please upload at least 2 PDF documents to merge.',
      });
    }

    let customOrder = null;
    if (req.body.order) {
      try {
        customOrder = JSON.parse(req.body.order);
      } catch {
        // use default order
      }
    }

    const result = await pdfService.mergePdfs(req.files, customOrder);
    // Register output file for secure download
    const registered = fileService.registerFile(
      result.outputPath,
      result.filename,
      'application/pdf'
    );

    // Delete intermediate uploads
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

async function split(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document to split.' });
    }

    const result = await pdfService.splitPdf(req.file, {
      ranges: req.body.ranges,
      splitEvery: req.body.splitEvery,
    });

    const registered = fileService.registerFile(
      result.outputPath,
      result.filename,
      result.mimeType || 'application/pdf'
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

async function organize(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document.' });
    }

    let pageOrder = null;
    let deletedPages = [];

    if (req.body.pageOrder) {
      try {
        pageOrder = typeof req.body.pageOrder === 'string' ? JSON.parse(req.body.pageOrder) : req.body.pageOrder;
      } catch {
        // fallback
      }
    }

    if (req.body.deletedPages) {
      try {
        deletedPages = typeof req.body.deletedPages === 'string' ? JSON.parse(req.body.deletedPages) : req.body.deletedPages;
      } catch {
        // fallback
      }
    }

    const result = await pdfService.organizePdf(req.file, { pageOrder, deletedPages });
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

async function rotate(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document to rotate.' });
    }

    const result = await pdfService.rotatePdf(req.file, {
      pages: req.body.pages || 'all',
      angle: req.body.angle || 90,
    });

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

async function extractPages(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document.' });
    }

    const result = await pdfService.extractPages(req.file, {
      pages: req.body.pages,
    });

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

async function compress(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document to compress.' });
    }

    const result = await pdfService.compressPdf(req.file);
    const registered = fileService.registerFile(result.outputPath, result.filename, 'application/pdf');
    safeDelete(req.file.path);

    res.json({
      success: true,
      data: {
        downloadId: registered.id,
        filename: registered.originalName,
        size: registered.size,
        sizeFormatted: registered.sizeFormatted,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        reductionPercent: result.reductionPercent,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function addPageNumbers(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document.' });
    }

    const result = await pdfService.addPageNumbers(req.file, req.body);
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

async function addWatermark(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document.' });
    }

    const result = await pdfService.addWatermark(req.file, req.body);
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

async function protect(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document.' });
    }

    const result = await pdfService.protectPdf(req.file, {
      password: req.body.password,
    });

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

async function unlock(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document.' });
    }

    const result = await pdfService.unlockPdf(req.file, {
      password: req.body.password,
    });

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

async function toText(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document.' });
    }

    const result = await pdfService.extractText(req.file);
    const registered = fileService.registerFile(result.outputPath, result.filename, 'text/plain');
    safeDelete(req.file.path);

    res.json({
      success: true,
      data: {
        downloadId: registered.id,
        filename: registered.originalName,
        size: registered.size,
        sizeFormatted: registered.sizeFormatted,
        text: result.text,
        numpages: result.numpages,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getMetadata(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document.' });
    }

    const metadata = await pdfService.getPdfMetadata(req.file);
    safeDelete(req.file.path);

    res.json({
      success: true,
      data: metadata,
    });
  } catch (err) {
    next(err);
  }
}

async function updateMetadata(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF document.' });
    }

    const result = await pdfService.updatePdfMetadata(req.file, req.body);
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

module.exports = {
  merge,
  split,
  organize,
  rotate,
  extractPages,
  compress,
  addPageNumbers,
  addWatermark,
  protect,
  unlock,
  toText,
  getMetadata,
  updateMetadata,
};
