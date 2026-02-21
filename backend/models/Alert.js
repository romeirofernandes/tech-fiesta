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

// Send email notification after a NEW alert is created (not on updates/resolves)
alertSchema.post('save', async function (doc) {
  try {
    // Only send email for brand-new, unresolved alerts that haven't been emailed yet
    if (doc.isResolved) return;

    // Check the _emailSent flag directly in DB (since select:false hides it from doc)
    const raw = await mongoose.model('Alert').findById(doc._id).select('+_emailSent').lean();
    if (!raw || raw._emailSent) return;

    // Lazy-require to avoid circular dependency issues
    const { sendAlertEmail } = require('../services/emailService');
    
    // Mark as emailed FIRST to prevent duplicate sends from concurrent saves
    await mongoose.model('Alert').updateOne(
      { _id: doc._id },
      { $set: { _emailSent: true } }
    );

    // Fire-and-forget: don't block the save operation
    sendAlertEmail(doc).catch((err) =>
      console.error('📧 Post-save email error:', err.message)
    );
  } catch (err) {
    // Never let email issues break alert creation
    console.error('📧 Post-save hook error:', err.message);
  }
});

module.exports = mongoose.model('Alert', alertSchema);