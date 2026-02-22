const WhatsappUser = require('../models/WhatsappUser');
const Farmer = require('../models/Farmer');
const { handleIncomingMessage } = require('../services/whatsappBotService');

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/whatsapp/generate-otp
// Body: { email }
// Generates OTP, stores in Mongo, returns it to frontend.
// User then sends this OTP to the WhatsApp bot to link their account.
exports.generateOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const farmer = await Farmer.findOne({ email });
    if (!farmer) {
      return res.status(404).json({ message: 'No account found with this email. Please register first.' });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert WhatsappUser (chat_id will be filled when bot receives the OTP)
    await WhatsappUser.findOneAndUpdate(
      { mongo_id: farmer._id },
      {
        firebase_uid: farmer.firebaseUid,
        mongo_id: farmer._id,
        chat_id: 'pending',
        otp,
        otpExpiresAt,
        verified: false
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      message: 'OTP generated successfully',
      otp,
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER
        ? process.env.TWILIO_WHATSAPP_NUMBER.replace('whatsapp:', '')
        : '+14155238886'
    });
  } catch (error) {
    console.error('Generate OTP error:', error);
    res.status(500).json({ message: 'Failed to generate OTP', error: error.message });
  }
};

// GET /api/whatsapp/status?email=xxx
exports.getStatus = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const farmer = await Farmer.findOne({ email });
    if (!farmer) {
      return res.status(404).json({ linked: false });
    }

    const waUser = await WhatsappUser.findOne({ mongo_id: farmer._id });
    const isVerified = waUser?.verified === true;

    // Return pending OTP so the website can display it
    let pendingOtp = null;
    if (waUser && !isVerified && waUser.otp && waUser.otpExpiresAt > new Date()) {
      pendingOtp = waUser.otp;
    }

    res.status(200).json({
      linked: isVerified,
      chat_id: isVerified ? waUser.chat_id : null,
      pendingOtp
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking status', error: error.message });
  }
};

// POST /api/whatsapp/webhook - Twilio webhook for incoming messages
exports.webhook = async (req, res) => {
  try {
    const { From, Body, NumMedia } = req.body;

    // Get media URL and content type if present
    let mediaUrl = null;
    let mediaContentType = null;
    if (parseInt(NumMedia) > 0) {
      mediaUrl = req.body.MediaUrl0;
      mediaContentType = req.body.MediaContentType0 || null;
    }

    // Process the incoming message
    await handleIncomingMessage(From, Body, mediaUrl, mediaContentType);

    // Respond with empty TwiML (we send responses via the API, not TwiML)
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  } catch (error) {
    console.error('Webhook error:', error);
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  }
};

// POST /api/whatsapp/unlink
// Body: { email }
exports.unlinkWhatsapp = async (req, res) => {
  try {
    const { email } = req.body;
    const farmer = await Farmer.findOne({ email });
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    await WhatsappUser.findOneAndDelete({ mongo_id: farmer._id });
    res.status(200).json({ message: 'WhatsApp unlinked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error unlinking', error: error.message });
  }
};
