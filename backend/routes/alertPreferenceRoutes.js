const express = require('express');
const router = express.Router();
const alertPreferenceController = require('../controllers/alertPreferenceController');

router.get('/:farmerId', alertPreferenceController.getPreferences);
router.put('/:farmerId', alertPreferenceController.updatePreferences);

module.exports = router;
