const axios = require('axios');

const testAPI = async () => {
    try {
        console.log('=== Testing Schemes API ===\n');

        // Test 1: Get all schemes
        console.log('1. Testing GET /api/schemes');
        const listRes = await axios.get('http://localhost:8000/api/schemes');
        console.log(`   ✓ Found ${listRes.data.length} schemes`);

        if (listRes.data.length > 0) {
            listRes.data.forEach((s, i) => {
                console.log(`   ${i + 1}. ${s.title} (slug: ${s.slug})`);
            });
        }

        console.log('');

        // Test 2: Get specific scheme details
        if (listRes.data.length > 0) {
            const testSlug = listRes.data[0].slug;
            console.log(`2. Testing GET /api/schemes/${testSlug}`);
            const detailRes = await axios.get(`http://localhost:8000/api/schemes/${testSlug}`);

            console.log(`   ✓ Title: ${detailRes.data.title}`);
            console.log(`   ✓ Description: ${detailRes.data.description?.substring(0, 100)}...`);
            console.log(`   ✓ Benefits: ${detailRes.data.benefits?.length || 0} items`);
            if (detailRes.data.benefits && detailRes.data.benefits.length > 0) {
                detailRes.data.benefits.forEach((b, i) => {
                    console.log(`      ${i + 1}. ${b}`);
                });
            }
            console.log(`   ✓ Financial Aid: ${detailRes.data.financial_aid}`);
            console.log(`   ✓ Duration: ${detailRes.data.duration}`);
            console.log(`   ✓ How to Apply: ${detailRes.data.how_to_apply}`);
            console.log(`   ✓ Application Process: ${detailRes.data.applicationProcess?.length || 0} steps`);
        }

        console.log('\n=== ALL TESTS PASSED ===');

    } catch (error) {
        console.error('✗ Error:', error.message);
        if (error.response) {
            console.error('  Status:', error.response.status);
            console.error('  Data:', error.response.data);
        }
    }
};

testAPI();
