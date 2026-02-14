const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');

router.post('/', productionController.create);
router.get('/', productionController.list);
router.get('/:id', productionController.getById);
router.put('/:id', productionController.update);
router.delete('/:id', productionController.remove);

module.exports = router;
