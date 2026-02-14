const express = require('express');
const router = express.Router();
const biController = require('../controllers/biController');

router.get('/farm-summary', biController.farmSummary);
router.get('/animal-performance', biController.animalPerformance);
router.get('/timeseries', biController.timeseries);
router.get('/insights', biController.insights);

module.exports = router;
