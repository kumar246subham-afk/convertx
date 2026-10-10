const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

router.get('/health', systemController.getHealth);
router.get('/tools', systemController.getTools);
router.get('/status', systemController.getDetailedStatus);

module.exports = router;
