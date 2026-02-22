const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

router.post('/', alertController.createAlert);
router.post('/check', alertController.checkNewAlerts);
router.post('/escape', alertController.createEscapeAlert);
router.get('/', alertController.getAlerts);
router.put('/:id/resolve', alertController.resolveAlert);
router.delete('/:id', alertController.deleteAlert);

module.exports = router;