const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

// Auth endpoints
router.post('/generate-otp', whatsappController.generateOtp);
router.get('/status', whatsappController.getStatus);
router.post('/unlink', whatsappController.unlinkWhatsapp);

// Twilio webhook (receives incoming WhatsApp messages)
router.post('/webhook', whatsappController.webhook);

module.exports = router;
