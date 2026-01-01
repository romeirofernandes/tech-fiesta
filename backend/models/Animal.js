const mongoose = require('mongoose');

const animalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  rfid: {
    type: String,
    required: true,
    unique: true
  },
  species: {
    type: String,
    required: true,
    enum: ['cow', 'buffalo', 'goat', 'sheep', 'chicken']
  },
  breed: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female']
  },
  yearOfBirth: {
    type: Number,
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

animalSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Animal', animalSchema);