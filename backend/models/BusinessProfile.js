const mongoose = require('mongoose');

const businessProfileSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true,
    unique: true
  },
  gstNumber: {
    type: String,
    required: true,
    unique: true
  },
  tradeName: {
    type: String,
    required: true
  },
  legalName: {
    type: String,
    required: true
  },
  businessType: {
    type: String, // e.g., 'Proprietorship', 'Partnership', etc.
  },
  registrationDate: {
    type: String
  },
  gstStatus: {
    type: String, // 'Active', 'Cancelled', etc.
    default: 'Active'
  },
  address: {
    street: String,
    building: String,
    locality: String,
    district: String,
    state: String,
    pincode: String,
    city: String
  },
  businessActivities: [{
    type: String
  }],
  filingFrequency: {
    type: String // 'M' (monthly) or 'Q' (quarterly)
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  // Financial tracking
  walletBalance: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalPurchases: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BusinessProfile', businessProfileSchema);
