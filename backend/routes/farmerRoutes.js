const express = require('express');
const router = express.Router();
const farmerController = require('../controllers/farmerController');

router.post('/auth', farmerController.authFarmer);
router.put('/:id', farmerController.updateFarmer);
router.get('/', farmerController.getAllFarmers);

module.exports = router;
