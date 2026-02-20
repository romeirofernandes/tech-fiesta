const express = require('express');
const router = express.Router();
const herdWatchController = require('../controllers/herdWatchController');

// GET /api/herd-watch/farms?farmerId=...
router.get('/farms', herdWatchController.getFarmsForHerdWatch);

// GET /api/herd-watch/:farmId/paths?farmerId=...
router.get('/:farmId/paths', herdWatchController.getAnimalPaths);

module.exports = router;
