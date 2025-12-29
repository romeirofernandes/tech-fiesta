const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

router.post('/', sensorController.createSensorEvent);
router.get('/', sensorController.getSensorEvents);

module.exports = router;