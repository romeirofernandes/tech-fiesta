const { parseVoiceInput } = require('../services/groqVoiceService');

/**
 * Parse voice transcript into structured form data
 * POST /api/voice/parse
 */
exports.parseVoice = async (req, res) => {
  try {
    const { transcript, type, context } = req.body;

    if (!transcript) {
      return res.status(400).json({ success: false, error: 'transcript is required' });
    }

    if (!['production', 'expense', 'sale'].includes(type)) {
      return res.status(400).json({ success: false, error: 'type must be one of: production, expense, sale' });
    }

    const result = await parseVoiceInput(transcript, type, context || {});
    res.json(result);
  } catch (error) {
    console.error('Voice parse error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
