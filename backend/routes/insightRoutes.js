const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insightController');

router.get('/farm', insightController.getFarmInsights);

module.exports = router;
