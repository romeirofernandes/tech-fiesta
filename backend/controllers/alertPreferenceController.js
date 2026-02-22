const AlertPreference = require('../models/AlertPreference');

// GET /api/alert-preferences/:farmerId
exports.getPreferences = async (req, res) => {
  try {
    const { farmerId } = req.params;
    let pref = await AlertPreference.findOne({ farmerId });

    // Return defaults if none saved yet
    if (!pref) {
      pref = { whatsapp: true, sms: true, email: true };
    }

    res.status(200).json(pref);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/alert-preferences/:farmerId
exports.updatePreferences = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { whatsapp, sms, email } = req.body;

    const pref = await AlertPreference.findOneAndUpdate(
      { farmerId },
      { whatsapp, sms, email },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json(pref);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
