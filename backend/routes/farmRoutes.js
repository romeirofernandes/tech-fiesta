const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const farmController = require('../controllers/farmController');

router.post('/', upload.single('image'), farmController.createFarm);
router.get('/', farmController.getFarms);
router.get('/:id', farmController.getFarmById);
router.put('/:id', upload.single('image'), farmController.updateFarm);
router.patch('/:id/herd-watch-radius', farmController.updateHerdWatchRadius);
router.delete('/:id', farmController.deleteFarm);

module.exports = router;