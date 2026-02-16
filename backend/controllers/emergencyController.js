const axios = require('axios');

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

exports.geocode = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ error: "Query parameter is required" });
        }
        const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?key=${TOMTOM_API_KEY}&limit=1`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error("Geocoding failed:", error.message);
        res.status(500).json({ error: "Geocoding failed" });
    }
};

exports.findVet = async (req, res) => {
    try {
        const { lat, lon, radius = 100000, limit = 5 } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ error: "Latitude and longitude are required" });
        }
        
        // Try Category Search first
        const searchUrl = `https://api.tomtom.com/search/2/categorySearch/Veterinarian.json?key=${TOMTOM_API_KEY}&lat=${lat}&lon=${lon}&radius=${radius}&limit=${limit}`;
        let response = await axios.get(searchUrl);
        let results = response.data?.results;

        // Fallback to General Search
        if (!results || results.length === 0) {
            const fallbackUrl = `https://api.tomtom.com/search/2/search/Veterinarian.json?key=${TOMTOM_API_KEY}&lat=${lat}&lon=${lon}&radius=${radius}&limit=${limit}`;
            const fallbackRes = await axios.get(fallbackUrl);
            results = fallbackRes.data?.results;
        }
        
        res.json({ results: results || [] });
    } catch (error) {
        console.error("Find Vet failed:", error.message);
        res.status(500).json({ error: "Find Vet failed" });
    }
};

exports.getRoute = async (req, res) => {
    try {
        const { start, end } = req.query; // Expecting "lat,lon" strings
        if (!start || !end) {
            return res.status(400).json({ error: "Start and end coordinates are required" });
        }
        
        const url = `https://api.tomtom.com/routing/1/calculateRoute/${start}:${end}/json?key=${TOMTOM_API_KEY}&travelMode=car`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error("Route calculation failed:", error.message);
        res.status(500).json({ error: "Route calculation failed" });
    }
};
