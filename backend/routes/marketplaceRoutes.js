const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplaceController');

router.get('/', marketplaceController.getItems);
router.get('/:id', marketplaceController.getItemById);
router.post('/', marketplaceController.createItem);
router.patch('/:id/status', marketplaceController.updateStatus);

module.exports = router;
