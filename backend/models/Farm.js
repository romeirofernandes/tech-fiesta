const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  coordinates: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  herdWatchRadius: {
    type: Number,
    default: 300 // meters
  },
  flaggedForReview: {
    type: Boolean,
    default: false
},
lastReviewedAt: Date,
reviewedBy: String
});

farmSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Farm', farmSchema);