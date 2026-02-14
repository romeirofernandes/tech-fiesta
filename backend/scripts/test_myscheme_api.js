
const axios = require('axios');

async function testMySchemeAPI() {
    try {
        // Attempting to hit the search/filter API used by the frontend
        // This is a common pattern for SPAs
        const url = 'https://www.myscheme.gov.in/api/v1/search/schemes';

        // Payload to filter for Agriculture
        const payload = {
            "filters": {
                "schemeCategory": ["Agriculture"]
            },
            "page": 0,
            "size": 20
        };

        console.log(`POSTing to ${url}...`);
        const { data } = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        console.log('Response Status:', 200); // Axios throws on error
        console.log('Data Preview:', JSON.stringify(data, null, 2).substring(0, 500));

    } catch (error) {
        if (error.response) {
            console.error(`Error ${error.response.status}:`, error.response.data);
        } else {
            console.error('Error:', error.message);
        }

        // Fallback: Try a GET request to a potential schemes list endpoint
        try {
            const url2 = 'https://www.myscheme.gov.in/_next/data/schemes/agriculture.json'; // Guessing Next.js data route
            console.log(`\nTypring GET to ${url2}...`);
            const res = await axios.get(url2);
            console.log('GET Success!');
        } catch (err2) {
            console.log('GET failed too');
        }
    }
}

testMySchemeAPI();
