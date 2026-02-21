const twilio = require('twilio');
const Farmer = require('../models/Farmer');
const Animal = require('../models/Animal');
const Farm = require('../models/Farm');

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
      if (farmer.phoneNumber) {
        let toNumbers = farmer.phoneNumber;
        // Remove all non-digit characters
        let digitsOnly = toNumbers.replace(/\D/g, '');
        
        // If it's a 10 digit Indian number, prefix with 91
        if (digitsOnly.length === 10) {
            digitsOnly = '91' + digitsOnly;
        }

        // Add whatsapp prefix
        const finalWhatsappNumber = `whatsapp:+${digitsOnly}`;

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
          from: 'whatsapp:+14155238886', // Standard Twilio Sandbox
          to: finalWhatsappNumber
        });
        
        console.log(`WhatsApp alert sent to ${farmer.fullName} on ${finalWhatsappNumber}`);
      }
    }
  } catch (error) {
    console.error('Error sending WhatsApp alert:', error.message);
  }
}

module.exports = { sendWhatsAppAlert };
