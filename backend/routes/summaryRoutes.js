const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summaryController');

// GET /api/summary/:farmerId — full summary for logged-in farmer
router.get('/:farmerId', summaryController.getFarmerSummary);

module.exports = router;
