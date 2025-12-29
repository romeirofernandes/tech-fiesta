const mongoose = require('mongoose');

const vacxxSchema = new mongoose.Schema({
  animalType: {
    type: String,
    required: true,
    enum: ['Cow', 'Bull', 'Buffalo', 'Sheep', 'Goat'] // Added some common ones, but user only specified Cow/Bull
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: false
  },
  unit: {
    type: String,
    default: 'months'
  },
  schedule: [{
    disease: {
      type: String,
      required: true
    },
    firstDoseAtMonths: {
      type: Number,
      required: true
    },
    boosterAfterMonths: {
      type: Number,
      default: null
    },
    repeatEveryMonths: {
      type: Number,
      default: null
    },
    mandatory: {
      type: Boolean,
      default: false
    },
    notes: {
      type: String
    }
  }],
  source: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Vacxx', vacxxSchema);
