const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

router.post('/', saleController.create);
router.get('/', saleController.list);
router.get('/:id', saleController.getById);
router.put('/:id', saleController.update);
router.delete('/:id', saleController.remove);

module.exports = router;
