const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthSnapshotController');

router.post('/', healthController.createHealthSnapshot);
router.get('/', healthController.getHealthSnapshots);
router.get('/latest/:animalId', healthController.getLatestHealthSnapshot);

module.exports = router;