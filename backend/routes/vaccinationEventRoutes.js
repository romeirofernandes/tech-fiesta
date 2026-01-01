const express = require('express');
const router = express.Router();
const vaccinationController = require('../controllers/vaccinationEventController');

router.post('/', vaccinationController.createVaccinationEvent);
router.get('/', vaccinationController.getVaccinationEvents);
router.put('/:id', vaccinationController.updateVaccinationEvent);
router.delete('/:id', vaccinationController.deleteVaccinationEvent);

module.exports = router;