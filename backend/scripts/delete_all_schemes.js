require('dotenv').config();
const mongoose = require('mongoose');
const Scheme = require('../models/Scheme');

const deleteAllSchemes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const result = await Scheme.deleteMany({});
        console.log(`Deleted ${result.deletedCount} schemes from database`);

        await mongoose.connection.close();
        console.log('Database connection closed');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

deleteAllSchemes();
