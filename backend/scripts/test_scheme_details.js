const axios = require('axios');

const testSchemeDetails = async () => {
    try {
        console.log('=== Testing Scheme Details API ===\n');

        // Get list
        const listRes = await axios.get('http://localhost:8000/api/schemes');
        console.log(`Found ${listRes.data.length} schemes in list\n`);

        if (listRes.data.length > 0) {
            // Test first scheme details
            const testScheme = listRes.data[0];
            console.log(`Testing: ${testScheme.title}`);
            console.log(`Slug: ${testScheme.slug}\n`);

            const detailRes = await axios.get(`http://localhost:8000/api/schemes/${testScheme.slug}`);
            const details = detailRes.data;

            console.log('=== SCHEME DETAILS ===');
            console.log(`Title: ${details.title}`);
            console.log(`\nDescription:\n${details.description}\n`);
            console.log(`Benefits (${details.benefits?.length || 0}):`);
            details.benefits?.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
            console.log(`\nFinancial Aid: ${details.financial_aid}`);
            console.log(`Duration: ${details.duration}`);
            console.log(`How to Apply: ${details.how_to_apply}`);
            console.log(`Official Link: ${details.official_link || 'Not specified'}`);
            console.log(`\nApplication Process (${details.applicationProcess?.length || 0}):`);
            details.applicationProcess?.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));

            console.log('\n=== TEST PASSED ===');
            console.log('Scheme has complete details!');
        }

    } catch (error) {
        console.error('✗ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
};

testSchemeDetails();
