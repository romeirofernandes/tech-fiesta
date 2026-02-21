const twilio = require('twilio');
const Farmer = require('../models/Farmer');
const Animal = require('../models/Animal');
const Farm = require('../models/Farm');
const AlertPreference = require('../models/AlertPreference');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Initialize the Twilio client only if credentials are provided
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

async function sendWhatsAppAlert(alert) {
  if (!client) {
    console.log('WhatsApp notification skipped: Twilio credentials not configured in .env');
    return;
  }

  try {
    const animalId = alert.animalId;
    if (!animalId) return;

    // 1. Get animal to find farmId
    const animal = await Animal.findById(animalId);
    if (!animal || !animal.farmId) return;

    // 2. Fetch Farm to get the farm name
    const farm = await Farm.findById(animal.farmId);
    const farmName = farm ? farm.name : 'Unknown Farm';

    // 3. Get all farmers associated with this farm
    const farmers = await Farmer.find({ farms: animal.farmId });
    if (!farmers || farmers.length === 0) return;

    // 4. Send message to each farmer's phone number
    for (const farmer of farmers) {
      // Check alert preferences
      const pref = await AlertPreference.findOne({ farmerId: farmer._id });
      if (pref && pref.whatsapp === false) {
        console.log(`WhatsApp skipped for ${farmer.fullName} (disabled in preferences)`);
        continue;
      }

      {
        // Hardcoded recipient number
        const finalWhatsappNumber = 'whatsapp:+918097996263';

        const messageBody = `🚨 *TECH-FIESTA ALERT* 🚨

*Severity:* ${alert.severity.toUpperCase()}
*Type:* ${alert.type.toUpperCase()}

*Animal Details:*
- Name: ${animal.name}
- RFID: ${animal.rfid}
- Species: ${animal.species}

*Farm:* ${farmName}

*Message:* 
${alert.message}

*Time:* ${new Date(alert.createdAt || Date.now()).toLocaleString()}`;

        await client.messages.create({
          body: messageBody,
          from: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
          to: finalWhatsappNumber
        });
        
        console.log(`WhatsApp alert sent to ${farmer.fullName} on ${finalWhatsappNumber}`);
      }
    }
  } catch (error) {
    console.error('Error sending WhatsApp alert:', error.message);
  }
}


async function sendSmsAlert(alert) {
  if (!client) {
    console.log('SMS notification skipped: Twilio credentials not configured in .env');
    return;
  }

  const smsFrom = process.env.TWILIO_SMS_NUMBER;
  if (!smsFrom) {
    console.log('SMS notification skipped: TWILIO_SMS_NUMBER not configured in .env');
    return;
  }

  try {
    const animalId = alert.animalId;
    if (!animalId) return;

    // 1. Get animal to find farmId
    const animal = await Animal.findById(animalId);
    if (!animal || !animal.farmId) return;

    // 2. Fetch Farm to get the farm name
    const farm = await Farm.findById(animal.farmId);
    const farmName = farm ? farm.name : 'Unknown Farm';

    // 3. Get all farmers associated with this farm
    const farmers = await Farmer.find({ farms: animal.farmId });
    if (!farmers || farmers.length === 0) return;

    // 4. Send SMS to each farmer's phone number
    for (const farmer of farmers) {
      // Check alert preferences
      const pref = await AlertPreference.findOne({ farmerId: farmer._id });
      if (pref && pref.sms === false) {
        console.log(`SMS skipped for ${farmer.fullName} (disabled in preferences)`);
        continue;
      }

      {
        // Hardcoded recipient number
        const toNumber = '+918097996263';

        const smsBody = `[PASHU ALERT] ${alert.severity.toUpperCase()} - ${alert.type.toUpperCase()}\nAnimal: ${animal.name} (${animal.rfid})\nFarm: ${farmName}\n${alert.message}\n${new Date(alert.createdAt || Date.now()).toLocaleString()}`;

        await client.messages.create({
          body: smsBody,
          from: smsFrom,
          to: toNumber
        });

        console.log(`SMS alert sent to ${farmer.fullName} on ${toNumber}`);
      }
    }
  } catch (error) {
    console.error('Error sending SMS alert:', error.message);
  }
}


module.exports = { sendWhatsAppAlert, sendSmsAlert };
