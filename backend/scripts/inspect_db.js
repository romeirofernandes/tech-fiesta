require('dotenv').config();
const mongoose = require('mongoose');
const Scheme = require('../models/Scheme');

const inspectDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        const schemes = await Scheme.find({}).lean();
        console.log(`Total schemes: ${schemes.length}\n`);

        if (schemes.length === 0) {
            console.log('❌ DATABASE IS EMPTY - No schemes found!');
            console.log('The deletion script worked but population failed.');
        } else {
            console.log('Schemes in database:\n');
            schemes.forEach((s, i) => {
                console.log(`${i + 1}. Title: ${s.title}`);
                console.log(`   Slug: "${s.slug}"`);
                console.log(`   ID: ${s._id}`);
                console.log(`   Benefits: ${s.benefits?.length || 0}`);
                console.log(`   Financial Aid: ${s.financial_aid}`);
                console.log('');
            });
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

inspectDatabase();
