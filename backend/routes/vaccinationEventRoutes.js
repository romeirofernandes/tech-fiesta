const express = require('express');
const router = express.Router();
const vaccinationController = require('../controllers/vaccinationEventController');
const upload = require('../config/multer');

// Certificate extraction (upload image → Cloudinary + Gemini)
router.post('/extract-certificate', upload.single('certificate'), vaccinationController.extractCertificate);

// Blockchain records
router.get('/blockchain-status', vaccinationController.getBlockchainStatus);
router.get('/blockchain-records', vaccinationController.getAllBlockchainRecords);
router.get('/blockchain/:rfid', vaccinationController.getBlockchainRecords);

router.post('/', vaccinationController.createVaccinationEvent);
router.get('/', vaccinationController.getVaccinationEvents);
router.put('/:id/resolve', vaccinationController.resolveVaccinationEvent);
router.put('/:id', vaccinationController.updateVaccinationEvent);
// DELETE route intentionally removed — vaccination records are immutable
// (backed by blockchain, cannot be deleted)

module.exports = router;