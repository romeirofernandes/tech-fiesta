const mongoose = require('mongoose');

const escrowTransactionSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MarketplaceItem',
        required: true
    },
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Optional if no strict auth
    },
    buyerName: {
        type: String, // Fallback if no auth
        required: true
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
