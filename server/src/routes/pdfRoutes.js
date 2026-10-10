const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const pdfController = require('../controllers/pdfController');

// Category A: PDF Organization
router.post('/merge', upload.array('files', 20), pdfController.merge);
router.post('/split', upload.single('file'), pdfController.split);
router.post('/organize', upload.single('file'), pdfController.organize);
router.post('/rotate', upload.single('file'), pdfController.rotate);
router.post('/extract-pages', upload.single('file'), pdfController.extractPages);

// Category B: PDF Optimization & Editing
router.post('/compress', upload.single('file'), pdfController.compress);
router.post('/page-numbers', upload.single('file'), pdfController.addPageNumbers);
router.post('/watermark', upload.single('file'), pdfController.addWatermark);
router.post('/protect', upload.single('file'), pdfController.protect);
router.post('/unlock', upload.single('file'), pdfController.unlock);

// Extra Tools
router.post('/to-text', upload.single('file'), pdfController.toText);
router.post('/metadata/get', upload.single('file'), pdfController.getMetadata);
router.post('/metadata/update', upload.single('file'), pdfController.updateMetadata);

module.exports = router;
