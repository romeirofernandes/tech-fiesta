const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');

// Health check
router.get('/health', iotController.healthCheck);

// Animal by RFID
router.get('/animals/by_rfid', iotController.getAnimalByRfid);

// Sensor readings
router.get('/sensors', iotController.getSensorReadings);
router.post('/sensors', iotController.createSensorReading);
router.get('/sensors/latest', iotController.getLatestReadings);
router.get('/sensors/by_animal', iotController.getReadingsByAnimal);
router.post('/sensors/bulk', iotController.bulkSensorData);

// RFID events
router.get('/rfid', iotController.getRfidEvents);
router.post('/rfid', iotController.createRfidEvent);

module.exports = router;
