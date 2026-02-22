const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const businessOwnerSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  // GST details (filled during registration)
  gstNumber: {
    type: String,
    required: true,
    unique: true
  },
  tradeName: {
    type: String,
    default: ''
  },
  legalName: {
    type: String,
    default: ''
  },
  businessType: {
    type: String,
    default: ''
  },
  registrationDate: {
    type: String
  },
  gstStatus: {
    type: String,
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
  isGstVerified: {
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

// Hash password before saving
businessOwnerSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
businessOwnerSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('BusinessOwner', businessOwnerSchema);
