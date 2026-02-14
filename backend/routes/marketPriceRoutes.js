const express = require('express');
const router = express.Router();
const marketPriceController = require('../controllers/marketPriceController');

router.get('/', marketPriceController.list);
router.get('/:id', marketPriceController.getById);

router.post('/', marketPriceController.create);
router.put('/:id', marketPriceController.update);
router.delete('/:id', marketPriceController.remove);

router.post('/import', marketPriceController.importFromAgmarknet);
router.post('/import-all', marketPriceController.importAll);

module.exports = router;
