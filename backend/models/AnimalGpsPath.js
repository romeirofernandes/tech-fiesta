const mongoose = require('mongoose');

const waypointSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  timestamp: { type: Date, required: true }
}, { _id: false });

const animalGpsPathSchema = new mongoose.Schema({
  animalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
    required: true
  },
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true
  },
  waypoints: [waypointSchema],
  isStraying: {
    type: Boolean,
    default: false
  },
  movementStartTime: {
    type: Date,
    default: null
  },
  movementEndTime: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

animalGpsPathSchema.index({ farmId: 1 });
animalGpsPathSchema.index({ animalId: 1 });

module.exports = mongoose.model('AnimalGpsPath', animalGpsPathSchema);
