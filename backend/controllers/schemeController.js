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
        console.log(`[Controller] Fetching details for slug: ${slug}`);
        const scheme = await schemeService.fetchSchemeDetails(slug);
        console.log(`[Controller] Result for ${slug}:`, scheme ? 'Found' : 'NULL');

        if (!scheme) {
            return res.status(404).json({ message: 'Scheme not found', slug });
        }
        res.status(200).json(scheme);
    } catch (error) {
        res.status(404).json({ message: 'Scheme not found or failed to fetch', error: error.message });
    }
};
