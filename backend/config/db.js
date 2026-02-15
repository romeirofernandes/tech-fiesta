const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const URI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(URI);
    console.log('MongoDB connected successfully');
  }
    catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
    }
};

module.exports = connectDB;
