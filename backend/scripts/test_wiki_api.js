const axios = require('axios');

const testWikiAPI = async (slug) => {
    try {
        console.log(`Testing API for: ${slug}`);
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`;
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'TechFiesta-Hackathon/1.0 (some@email.com)' // Wikipedia API requires a User Agent
            }
        });

        console.log('--- API Response ---');
        console.log('Title:', data.title);
        console.log('Extract:', data.extract);
        console.log('Description:', data.description);
        console.log('Thumbnail:', data.thumbnail ? data.thumbnail.source : 'No Image');

        return data;
    } catch (error) {
        console.error(`API Failed: ${error.message}`);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
};

const run = async () => {
    await testWikiAPI('Pradhan_Mantri_Kisan_Samman_Nidhi');
    await testWikiAPI('Pradhan_Mantri_Fasal_Bima_Yojana');
    // Test a "bad" one if known
    await testWikiAPI('undefined');
};

run();
