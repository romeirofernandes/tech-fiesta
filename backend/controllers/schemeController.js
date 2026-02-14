const schemeService = require('../services/schemeService');

exports.getAllSchemes = async (req, res) => {
    try {
        const schemes = await schemeService.fetchSchemes();
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch schemes', error: error.message });
    }
};

exports.getSchemeDetails = async (req, res) => {
    try {
        const { slug } = req.params;
        const scheme = await schemeService.fetchSchemeDetails(slug);
        res.status(200).json(scheme);
    } catch (error) {
        res.status(404).json({ message: 'Scheme not found or failed to fetch', error: error.message });
    }
};
