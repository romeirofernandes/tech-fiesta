const express = require('express');
const router = express.Router();
const bizAuthController = require('../controllers/bizAuthController');

// Register new business owner (with GST verification)
router.post('/register', bizAuthController.register);

// Login business owner
router.post('/login', bizAuthController.login);

// Get current business owner profile
router.get('/me', bizAuthController.getMe);

// Get business owner dashboard
router.get('/dashboard', bizAuthController.getDashboard);

module.exports = router;
