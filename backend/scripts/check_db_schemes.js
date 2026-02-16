require('dotenv').config();
const mongoose = require('mongoose');
const Scheme = require('../models/Scheme');

const checkSchemes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        const schemes = await Scheme.find({});
        console.log(`Total schemes in database: ${schemes.length}\n`);

        if (schemes.length === 0) {
            console.log('No schemes found in database!');
        } else {
            schemes.forEach((scheme, index) => {
                console.log(`${index + 1}. ${scheme.title}`);
                console.log(`   Slug: ${scheme.slug}`);
                console.log(`   Benefits: ${scheme.benefits?.length || 0}`);
                console.log(`   Financial Aid: ${scheme.financial_aid}`);
                console.log(`   Description: ${scheme.description?.substring(0, 100)}...`);
                console.log('');
            });
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

checkSchemes();
