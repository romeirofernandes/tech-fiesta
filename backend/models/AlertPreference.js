const mongoose = require('mongoose');

const alertPreferenceSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true,
    unique: true
  },
  whatsapp: {
    type: Boolean,
    default: true
  },
  sms: {
    type: Boolean,
    default: true
  },
  email: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('AlertPreference', alertPreferenceSchema);
