const mongoose = require('mongoose');

const deadAnimalSchema = new mongoose.Schema({
  originalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  rfid: {
    type: String,
    required: true
  },
  species: {
    type: String,
    required: true
  },
  breed: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    required: true
  },
  ageAtDeath: {
    type: Number,
    required: true
  },
  ageUnit: {
    type: String,
    required: true
  },
  farmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm',
    required: true
  },
  imageUrl: {
    type: String,
    default: null
  },
  deathDate: {
    type: Date,
    default: Date.now
  },
  causeOfDeath: {
    type: String,
    default: 'Unknown'
  },
  notes: {
    type: String,
    default: null
  }
});

module.exports = mongoose.model('DeadAnimal', deadAnimalSchema);
