const mongoose = require('mongoose');

const rfidEventSchema = new mongoose.Schema({
  rfidTag: {
    type: String,
    required: true,
    index: true
  },
  animalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
    default: null
  },
  readerId: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('RFIDEvent', rfidEventSchema);
