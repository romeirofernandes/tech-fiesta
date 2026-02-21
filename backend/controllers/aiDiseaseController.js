const aiDiseaseService = require('../services/aiDiseaseService');

exports.analyzeDisease = async (req, res) => {
    try {
        const files = req.files || {};
        const imageFile = files['image'] ? files['image'][0] : null;
        const audioFile = files['audio'] ? files['audio'][0] : null;

        // At least one input needed
        if (!imageFile && !audioFile) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least an image or a voice description."
            });
        }

        // Parse optional animal data
        let animalData = null;
        if (req.body.animalData) {
            try { animalData = JSON.parse(req.body.animalData); } catch (e) { /* ignore */ }
        }

        const result = await aiDiseaseService.detectDisease(imageFile, audioFile, animalData);
        res.status(200).json(result);

    } catch (error) {
        console.error("AI Disease Controller Error:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Analysis failed. Please try again."
        });
    }
};
