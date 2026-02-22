const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');

// Parse voice transcript into structured data
router.post('/parse', voiceController.parseVoice);

module.exports = router;
