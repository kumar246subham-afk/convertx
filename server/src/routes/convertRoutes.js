const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const convertController = require('../controllers/convertController');

// Category C: Conversions
router.post('/images-to-pdf', upload.array('files', 20), convertController.imagesToPdf);
router.post('/pdf-to-images', upload.single('file'), convertController.pdfToImages);
router.post('/word-to-pdf', upload.single('file'), convertController.wordToPdf);
router.post('/excel-to-pdf', upload.single('file'), convertController.excelToPdf);
router.post('/powerpoint-to-pdf', upload.single('file'), convertController.powerpointToPdf);

module.exports = router;
