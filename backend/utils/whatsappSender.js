const twilio = require('twilio');
const Farmer = require('../models/Farmer');
const Animal = require('../models/Animal');
const Farm = require('../models/Farm');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Initialize the Twilio client only if credentials are provided
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Try to load AlertPreference model — returns null if it doesn't exist
 */
function getAlertPreferenceModel() {
  try {
    return require('../models/AlertPreference');
  } catch (e) {
    return null;
  }
}

/**
 * Format a phone number to E.164 format for Twilio
 */
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return null;

  // Remove all non-digit characters
  let digits = phoneNumber.replace(/\D/g, '');

  // If it's a 10-digit Indian number, prefix with 91
  if (digits.length === 10) {
    digits = '91' + digits;
  }

  return '+' + digits;
}

/**
 * Send WhatsApp notification to farmers when an alert is created
 */
async function sendWhatsAppAlert(alert) {
  if (!client) {
    console.log('WhatsApp notification skipped: Twilio credentials not configured');
    return;
  }

  try {
    const animalId = alert.animalId;
    if (!animalId) return;

    // 1. Get animal details
    const animal = await Animal.findById(animalId);
    if (!animal || !animal.farmId) return;

    // 2. Get farm details
    const farm = await Farm.findById(animal.farmId);
    const farmName = farm ? farm.name : 'Unknown Farm';

    // 3. Get all farmers who own this farm
    const farmers = await Farmer.find({ farms: animal.farmId });
    if (!farmers || farmers.length === 0) return;

    const AlertPreference = getAlertPreferenceModel();

    // 4. Send WhatsApp to each farmer with a phone number
    for (const farmer of farmers) {
      // Check preferences if available
      if (AlertPreference) {
        try {
          const pref = await AlertPreference.findOne({ farmerId: farmer._id });
          if (pref && pref.whatsapp === false) {
            console.log(`WhatsApp skipped for ${farmer.fullName} (disabled in preferences)`);
            continue;
          }
        } catch (e) { /* ignore preference errors */ }
      }

      const formattedNumber = formatPhoneNumber(farmer.phoneNumber);
      if (!formattedNumber) {
        console.log(`WhatsApp skipped for ${farmer.fullName} (no phone number)`);
        continue;
      }

      const finalWhatsappNumber = `whatsapp:${formattedNumber}`;

      const messageBody = `🚨 *PASHU ALERT* 🚨

*Severity:* ${alert.severity.toUpperCase()}
*Type:* ${alert.type.toUpperCase()}

*Animal Details:*
- Name: ${animal.name}
- RFID: ${animal.rfid}
- Species: ${animal.species}

*Farm:* ${farmName}

*Alert:*
${alert.message}

*Time:* ${new Date(alert.createdAt || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

      try {
        await client.messages.create({
          body: messageBody,
          from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
          to: finalWhatsappNumber
        });

        console.log(`✅ WhatsApp alert sent to ${farmer.fullName} on ${finalWhatsappNumber}`);
      } catch (sendErr) {
        console.error(`❌ WhatsApp send failed for ${farmer.fullName} (${finalWhatsappNumber}):`, sendErr.message);
      }
    }
  } catch (error) {
    console.error('Error in sendWhatsAppAlert:', error.message);
  }
}

/**
 * Send SMS notification to farmers when an alert is created
 */
async function sendSmsAlert(alert) {
  if (!client) {
    console.log('SMS notification skipped: Twilio credentials not configured');
    return;
  }

  const smsFrom = process.env.TWILIO_SMS_NUMBER;
  if (!smsFrom) {
    console.log('SMS notification skipped: TWILIO_SMS_NUMBER not configured');
    return;
  }

  try {
    const animalId = alert.animalId;
    if (!animalId) return;

    // 1. Get animal details
    const animal = await Animal.findById(animalId);
    if (!animal || !animal.farmId) return;

    // 2. Get farm details
    const farm = await Farm.findById(animal.farmId);
    const farmName = farm ? farm.name : 'Unknown Farm';

    // 3. Get all farmers who own this farm
    const farmers = await Farmer.find({ farms: animal.farmId });
    if (!farmers || farmers.length === 0) return;

    const AlertPreference = getAlertPreferenceModel();

    // 4. Send SMS to each farmer with a phone number
    for (const farmer of farmers) {
      // Check preferences if available
      if (AlertPreference) {
        try {
          const pref = await AlertPreference.findOne({ farmerId: farmer._id });
          if (pref && pref.sms === false) {
            console.log(`SMS skipped for ${farmer.fullName} (disabled in preferences)`);
            continue;
          }
        } catch (e) { /* ignore preference errors */ }
      }

      const formattedNumber = formatPhoneNumber(farmer.phoneNumber);
      if (!formattedNumber) {
        console.log(`SMS skipped for ${farmer.fullName} (no phone number)`);
        continue;
      }

      const smsBody = `[PASHU ALERT] ${alert.severity.toUpperCase()} - ${alert.type.toUpperCase()}
Animal: ${animal.name} (${animal.rfid})
Farm: ${farmName}
${alert.message}
Time: ${new Date(alert.createdAt || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

      try {
        await client.messages.create({
          body: smsBody,
          from: smsFrom,
          to: formattedNumber
        });

        console.log(`✅ SMS alert sent to ${farmer.fullName} on ${formattedNumber}`);
      } catch (sendErr) {
        console.error(`❌ SMS send failed for ${farmer.fullName} (${formattedNumber}):`, sendErr.message);
      }
    }
  } catch (error) {
    console.error('Error in sendSmsAlert:', error.message);
  }
}

module.exports = { sendWhatsAppAlert, sendSmsAlert };
