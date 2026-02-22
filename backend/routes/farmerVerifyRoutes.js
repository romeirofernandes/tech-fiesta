const express = require('express');
const router = express.Router();
const farmerVerifyController = require('../controllers/farmerVerifyController');

// Verify Aadhaar number
router.post('/aadhaar', farmerVerifyController.verifyAadhaar);

// Get verification status
router.get('/status/:farmerId', farmerVerifyController.getVerificationStatus);

module.exports = router;
