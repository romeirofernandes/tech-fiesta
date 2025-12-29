const mongoose = require('mongoose');

const healthSnapshotSchema = new mongoose.Schema({
  animalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  summary: {
    type: String,
    required: true
  },
  calculatedOn: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('HealthSnapshot', healthSnapshotSchema);