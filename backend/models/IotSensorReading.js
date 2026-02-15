const mongoose = require('mongoose');

const iotSensorReadingSchema = new mongoose.Schema({
  animalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
    default: null
  },
  rfidTag: {
    type: String,
    required: true,
    index: true
  },
  temperature: {
    type: Number,
    default: null
  },
  humidity: {
    type: Number,
    default: null
  },
  heartRate: {
    type: Number,
    default: null
  },
  sensorType: {
    type: String,
    enum: ['TEMP', 'HUMID', 'HR', 'COMBINED'],
    default: 'COMBINED'
  },
  deviceId: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient queries by rfid and time
iotSensorReadingSchema.index({ rfidTag: 1, timestamp: -1 });

module.exports = mongoose.model('IotSensorReading', iotSensorReadingSchema);
