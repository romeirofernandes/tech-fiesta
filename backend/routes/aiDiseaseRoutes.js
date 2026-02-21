const express = require('express');
const router = express.Router();
const aiDiseaseController = require('../controllers/aiDiseaseController');
const multer = require('multer');

// Configure multer to store files in memory so they can be processed immediately
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit per file
    }
});

// Using upload.fields to allow capturing specifically an image and an audio file
router.post('/analyze', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
]), aiDiseaseController.analyzeDisease);

module.exports = router;
