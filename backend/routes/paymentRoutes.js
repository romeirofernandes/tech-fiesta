const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);
router.post('/admin/release', paymentController.releaseFunds);
router.get('/my-orders', paymentController.getMyOrders);
router.get('/my-sales', paymentController.getMySales);
router.get('/admin/all', paymentController.getAllTransactions);

module.exports = router;
