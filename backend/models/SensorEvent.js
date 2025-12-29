const mongoose = require('mongoose');

const sensorEventSchema = new mongoose.Schema({
  animalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['temperature', 'heartRate', 'movement']
  },
  value: {
    type: Number,
    required: true
  },
  meta: {
    gateId: String,
    distance: Number
  },
  recordedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SensorEvent', sensorEventSchema);