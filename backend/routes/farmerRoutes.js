const express = require('express');
const router = express.Router();
const farmerController = require('../controllers/farmerController');

router.post('/auth', farmerController.authFarmer);

module.exports = router;
