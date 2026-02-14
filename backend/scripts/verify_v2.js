
const axios = require('axios');

async function verifyAPI() {
    try {
        const url = 'http://localhost:8000/api/schemes/Pradhan_Mantri_Kisan_Samman_Nidhi';
        console.log(`Fetching ${url}...`);
        const { data } = await axios.get(url);

        console.log('--- API Response V2 ---');
        console.log('Financial Aid:', data.financial_aid);
        console.log('Duration:', data.duration);
        console.log('Mode:', data.application_mode);
        console.log('Mermaid Chart Length:', data.mermaidChart ? data.mermaidChart.length : 0);
        console.log('Mermaid Preview:', data.mermaidChart);

    } catch (error) {
        console.error('Verification Failed:', error.message);
    }
}

verifyAPI();
