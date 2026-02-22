const mongoose = require('mongoose');

const whatsappUserSchema = new mongoose.Schema({
  firebase_uid: { type: String, required: true, unique: true },
  mongo_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer', required: true, unique: true },
  chat_id: { type: String, required: true }, // whatsapp:+91XXXXXXXXXX or 'pending'
  otp: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WhatsappUser', whatsappUserSchema);
