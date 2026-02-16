const mongoose = require('mongoose');

const marketplaceItemSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['equipment', 'cattle']
    },
    name: {
        type: String,
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farmer',
        required: true
    },
    description: {
        type: String
    },
    price: {
        type: Number,
        required: true
    },
    priceUnit: {
        type: String,
        required: true,
        enum: ['per day', 'per hour', 'fixed'] // 'fixed' for cattle sales, others for rent
    },
    location: {
        type: String,
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming there is a User model, or Farmer
        required: false // Optional for now if auth isn't fully strict or if we use local storage user
    },
    linkedAnimalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Animal',
        required: false
    },
    status: {
        type: String,
        enum: ['available', 'sold', 'rented'],
        default: 'available'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('MarketplaceItem', marketplaceItemSchema);
