const mongoose = require('mongoose');

const vaccinationEventSchema = new mongoose.Schema({
  animalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
    required: true
  },
  vaccineName: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    required: true,
    enum: ['administered', 'estimated', 'missed', 'scheduled']
  },
  date: {
    type: Date,
    required: true
  },
  notes: {
    type: String,
    default: null
  },
  repeatsEvery: {
    value: {
      type: Number,
      default: null
    },
    unit: {
      type: String,
      enum: ['days', 'months', 'years', null],
      default: null
    }
  },
  // Certificate image (uploaded to Cloudinary)
  certificateUrl: {
    type: String,
    default: null
  },
  // Blockchain proof
  blockchain: {
    txHash: { type: String, default: null },
    recordId: { type: Number, default: null },
    blockNumber: { type: Number, default: null },
    explorerUrl: { type: String, default: null },
    network: { type: String, default: 'polygon-amoy' }
  },
  // AI-extracted metadata from certificate
  extractedData: {
    type: Object,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('VaccinationEvent', vaccinationEventSchema);