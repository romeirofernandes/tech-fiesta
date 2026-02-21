const { generateFarmInsights } = require('../services/insightService');

exports.getFarmInsights = async (req, res) => {
    try {
        const { farmerId } = req.query;

        if (!farmerId) {
            return res.status(400).json({ success: false, message: 'farmerId query parameter is required.' });
        }

        const result = await generateFarmInsights(farmerId);

        return res.status(200).json({
            success: true,
            data: result.insights,
            summary: result.raw_data_summary,
        });
    } catch (error) {
        console.error('Farm Insights Error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate insights.',
        });
    }
};
