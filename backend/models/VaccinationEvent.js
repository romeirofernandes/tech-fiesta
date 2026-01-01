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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('VaccinationEvent', vaccinationEventSchema);