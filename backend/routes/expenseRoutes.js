const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');

router.post('/', expenseController.create);
router.get('/', expenseController.list);
router.get('/:id', expenseController.getById);
router.put('/:id', expenseController.update);
router.delete('/:id', expenseController.remove);

module.exports = router;
