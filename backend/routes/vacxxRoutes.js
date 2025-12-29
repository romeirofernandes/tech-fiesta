const express = require('express');
const router = express.Router();
const { createVacxx, getVacxx } = require('../controllers/vacxxController');

router.post('/', createVacxx);
router.get('/', getVacxx);

module.exports = router;
