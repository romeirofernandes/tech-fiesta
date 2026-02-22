const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  imageUrl: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['farmer', 'admin'],
    default: 'farmer'
  },
  farms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
  }],
  preferredLanguage: {
    type: String,
    default: 'en'
  },
  aadhaarNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  isAadhaarVerified: {
    type: Boolean,
    default: false
  },
  aadhaarVerifiedAt: {
    type: Date,
    default: null
  },
  isBusinessVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Farmer', farmerSchema);