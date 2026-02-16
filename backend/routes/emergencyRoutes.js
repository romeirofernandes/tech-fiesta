const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');

router.get('/geocode', emergencyController.geocode);
router.get('/find-vet', emergencyController.findVet);
router.get('/route', emergencyController.getRoute);

module.exports = router;
