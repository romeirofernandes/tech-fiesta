const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');

// GST Verification
router.post('/verify-gst', businessController.verifyGST);

// Business Profile
router.get('/profile/:farmerId', businessController.getBusinessProfile);

// Filing Details
router.get('/filing-details', businessController.getFilingDetails);

// Business Dashboard
router.get('/dashboard/:farmerId', businessController.getBusinessDashboard);

// Wallet
router.post('/wallet/credit', businessController.creditWallet);

module.exports = router;
