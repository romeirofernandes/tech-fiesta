const express = require('express');
const router = express.Router();
const schemeController = require('../controllers/schemeController');

router.get('/', schemeController.getAllSchemes);
router.get('/:slug', schemeController.getSchemeDetails);

module.exports = router;
