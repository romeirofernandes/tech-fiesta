require('dotenv').config();
const mongoose = require('mongoose');
const Scheme = require('../models/Scheme');

const checkSchemeDetails = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        const schemes = await Scheme.find({}).lean();

        if (schemes.length === 0) {
            console.log('No schemes in database!');
        } else {
            schemes.forEach((s, i) => {
                console.log(`\n========== SCHEME ${i + 1} ==========`);
                console.log(`Title: ${s.title}`);
                console.log(`Slug: ${s.slug}`);
                console.log(`\nDescription: ${s.description}`);
                console.log(`\nBenefits (${s.benefits?.length || 0}):`);
                s.benefits?.forEach((b, idx) => console.log(`  ${idx + 1}. ${b}`));
                console.log(`\nFinancial Aid: ${s.financial_aid}`);
                console.log(`Duration: ${s.duration}`);
                console.log(`How to Apply: ${s.how_to_apply}`);
                console.log(`Official Link: ${s.official_link}`);
                console.log(`\nApplication Process (${s.applicationProcess?.length || 0}):`);
                s.applicationProcess?.forEach((step, idx) => console.log(`  ${idx + 1}. ${step}`));
                console.log(`\nSource: ${s.source}`);
                console.log('================================\n');
            });
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

checkSchemeDetails();
