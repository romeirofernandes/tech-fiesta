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
    enum: ['health', 'vaccination', 'inactivity', 'geofence']
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
  resolutionNotes: String,
  _emailSent: {
    type: Boolean,
    default: false,
    select: false
  }
});

// Send ALL notifications after a NEW alert is created (guarded by _emailSent flag)
alertSchema.post('save', async function (doc) {
  try {
    // Only fire for brand-new, unresolved alerts
    if (doc.isResolved) return;

    // Check the _emailSent flag directly in DB (select:false hides it from doc)
    const raw = await mongoose.model('Alert').findById(doc._id).select('+_emailSent').lean();
    if (!raw || raw._emailSent) return;

    // Mark FIRST to prevent duplicates from concurrent saves
    await mongoose.model('Alert').updateOne(
      { _id: doc._id },
      { $set: { _emailSent: true } }
    );

    // Fire all three channels — lazy-require to avoid circular deps
    const { sendAlertEmail } = require('../services/emailService');
    const { sendWhatsAppAlert, sendSmsAlert } = require('../utils/whatsappSender');

    sendAlertEmail(doc).catch((err) =>
      console.error('📧 Post-save email error:', err.message)
    );
    sendWhatsAppAlert(doc).catch((err) =>
      console.error('📱 Post-save WhatsApp error:', err.message)
    );
    sendSmsAlert(doc).catch((err) =>
      console.error('📲 Post-save SMS error:', err.message)
    );
  } catch (err) {
    console.error('📧 Post-save hook error:', err.message);
  }
});

module.exports = mongoose.model('Alert', alertSchema);