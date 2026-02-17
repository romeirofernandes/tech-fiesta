const mongoose = require('mongoose');

const radarReadingSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    default: 'radar_01'
  },
  angle: {
    type: Number,
    required: true,
    min: 0,
    max: 180
  },
  distance: {
    type: Number,
    required: true,
    min: 0
  },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    accuracy: { type: Number }
  },
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient latest-reading queries
radarReadingSchema.index({ deviceId: 1, timestamp: -1 });

// Index for geofencing queries
radarReadingSchema.index({ distance: 1, timestamp: -1 });

const RadarReading = mongoose.model('RadarReading', radarReadingSchema);

module.exports = RadarReading;
