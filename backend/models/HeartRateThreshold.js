const mongoose = require('mongoose');

const heartRateThresholdSchema = new mongoose.Schema({
  animalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
    required: true,
    unique: true,
  },
  minBPM: {
    type: Number,
    required: true,
  },
  maxBPM: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('HeartRateThreshold', heartRateThresholdSchema);
