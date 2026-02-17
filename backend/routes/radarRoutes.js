const express = require('express');
const router = express.Router();
const radarController = require('../controllers/radarController');

// Connection status
router.get('/status', (req, res) => {
  res.json(radarController.getRadarStatus());
});
router.post('/heartbeat', radarController.heartbeat);

// Radar readings
router.post('/reading', radarController.createReading);
router.post('/reading/bulk', radarController.bulkCreateReadings);
router.get('/latest', radarController.getLatestReadings);
router.get('/readings', radarController.getReadings);

// Movement alerts
router.post('/alert', radarController.createAlert);
router.get('/alerts', radarController.getAlerts);
router.patch('/alerts/:id/resolve', radarController.resolveAlert);

// Statistics
router.get('/stats', radarController.getStats);

module.exports = router;
