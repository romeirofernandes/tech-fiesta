require('dotenv').config();
const mongoose = require('mongoose');
const schemeService = require('../services/schemeService');
const Scheme = require('../models/Scheme');

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const slug = 'Pradhan_Mantri_Kisan_Samman_Nidhi'; // Known featured scheme slug

        // Clean up previous test
        await Scheme.deleteOne({ slug });
        console.log(`Cleared ${slug} from DB`);

        // 1. First Fetch - Should Scrape
        console.log('--- 1. First Fetch (Should Scrape) ---');
        const start1 = Date.now();
        const data1 = await schemeService.fetchSchemeDetails(slug);
        const duration1 = Date.now() - start1;
        console.log(`Fetched Data 1: ${data1 ? 'Success' : 'Failed'}`);
        console.log(`Duration 1: ${duration1}ms`);

        // 2. Check DB
        const dbRecord = await Scheme.findOne({ slug });
        console.log(`DB Record Exists: ${!!dbRecord}`);
        if (dbRecord) {
            console.log(`DB Source: ${dbRecord.source}`);
        }

        // 3. Second Fetch - Should be from DB (Fast)
        console.log('--- 2. Second Fetch (Should come from DB) ---');
        const start2 = Date.now();
        const data2 = await schemeService.fetchSchemeDetails(slug);
        const duration2 = Date.now() - start2;
        console.log(`Fetched Data 2: ${data2 ? 'Success' : 'Failed'}`);
        console.log(`Duration 2: ${duration2}ms`);

        if (duration2 < 100) {
            console.log('PASS: Second fetch was instant (Cached in DB)');
        } else {
            console.log('WARN: Second fetch took time, might not be cached?');
        }

        mongoose.connection.close();
    } catch (err) {
        console.error('Verification Failed:', err);
        if (mongoose.connection.readyState === 1) {
            mongoose.connection.close();
        }
    }
};

verify();
