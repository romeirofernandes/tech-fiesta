const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  animalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Animal',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['health', 'vaccination', 'inactivity']
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high']
  },
  message: {
    type: String,
    required: true
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: String,
resolutionNotes: String

});

module.exports = mongoose.model('Alert', alertSchema);