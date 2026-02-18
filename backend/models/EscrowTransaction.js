const mongoose = require('mongoose');

const escrowTransactionSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MarketplaceItem',
        required: true
    },
    itemName: {
        type: String,
        required: true
    },
    itemImage: {
        type: String
    },
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farmer',
        required: false // Optional if no strict auth
    },
    buyerName: {
        type: String, // Fallback if no auth
        required: true
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Farmer',
        required: false
    },
    destinationFarmId: {
        type: String, // ID of the farm where the animal will be moved
        required: false
    },
    amount: {
        type: Number,
        required: true
    },
    // Rental Specific Fields
    rentalDuration: {
        type: Number, // e.g., 5
        required: false
    },
    durationUnit: {
        type: String, // 'days', 'hours'
        enum: ['days', 'hours'],
        required: false
    },
    rentalStartDate: {
        type: Date,
        required: false
    },
    rentalEndDate: {
        type: Date,
        required: false
    },
    returnStatus: {
        type: String,
        enum: ['none', 'requested', 'returned', 'disputed'],
        default: 'none'
    },
    currency: {
        type: String,
        default: 'INR'
    },
    razorpayOrderId: {
        type: String,
        required: true
    },
    razorpayPaymentId: {
        type: String
    },
    razorpaySignature: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending_payment', 'held_in_escrow', 'released_to_seller', 'refunded', 'disputed'],
        default: 'pending_payment'
    },
    releaseCode: {
        type: String, // 4-digit code generated for buyer
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('EscrowTransaction', escrowTransactionSchema);
