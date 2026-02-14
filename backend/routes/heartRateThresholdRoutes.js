const express = require('express');
const router = express.Router();
const {
  getDefaults,
  getThresholds,
  getThreshold,
  upsertThreshold,
  deleteThreshold,
} = require('../controllers/heartRateThresholdController');

router.get('/defaults', getDefaults);
router.get('/', getThresholds);
router.get('/:animalId', getThreshold);
router.put('/:animalId', upsertThreshold);
router.delete('/:animalId', deleteThreshold);

module.exports = router;
