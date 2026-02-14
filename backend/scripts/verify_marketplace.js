const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:8000/api';

async function verifyMarketplace() {
    console.log("🛠️  Verifying Marketplace Backend...");

    try {
        // 1. Create Equipment Item
        console.log("1. Creating Test Equipment...");
        const equipment = await axios.post(`${BASE_URL}/marketplace`, {
            type: 'equipment',
            name: 'Test Tractor 5000',
            description: 'Powerful tractor for verifying backend',
            price: 500,
            priceUnit: 'per hour',
            location: 'Backend Village',
            contact: '9999999999'
        });
        console.log("   ✅ Created Item ID:", equipment.data._id);

        // 2. Fetch Items
        console.log("2. Fetching All Items...");
        const items = await axios.get(`${BASE_URL}/marketplace`);
        if (items.data.length > 0) {
            console.log("   ✅ Fetched " + items.data.length + " items.");
        } else {
            console.error("   ❌ Fetch returned 0 items.");
        }

        // 3. Filter by Location
        console.log("3. Filtering by Location 'Backend'...");
        const filtered = await axios.get(`${BASE_URL}/marketplace?location=Backend`);
        if (filtered.data.length > 0 && filtered.data[0].location.includes('Backend')) {
            console.log("   ✅ Filter works.");
        } else {
            console.error("   ❌ Filter failed.");
        }

        console.log("🎉 Marketplace Verification Complete!");

    } catch (error) {
        console.error("❌ Verification Failed:", error.message);
        if (error.response) console.error("   Response Data:", error.response.data);
    }
}

verifyMarketplace();
