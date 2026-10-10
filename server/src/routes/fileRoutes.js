const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

router.get('/:id/download', fileController.download);
router.get('/:id/preview', fileController.preview);
router.get('/:id/info', fileController.getInfo);

module.exports = router;
