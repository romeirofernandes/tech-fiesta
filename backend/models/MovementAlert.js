const mongoose = require('mongoose');

const movementAlertSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    default: 'radar_01'
  },
  distance: {
    type: Number,
    required: true
  },
  angle: {
    type: Number,
    required: true,
    min: 0,
    max: 180
  },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    accuracy: { type: Number },
    timestamp: { type: Date }
  },
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'high'
  },
  message: {
    type: String,
    default: function() {
      return `Movement detected at ${this.angle}° (${this.distance.toFixed(1)}cm from radar)`;
    }
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: String
  },
  resolutionNotes: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
movementAlertSchema.index({ deviceId: 1, timestamp: -1 });
movementAlertSchema.index({ isResolved: 1, timestamp: -1 });
movementAlertSchema.index({ farmId: 1, timestamp: -1 });

const MovementAlert = mongoose.model('MovementAlert', movementAlertSchema);

module.exports = MovementAlert;
