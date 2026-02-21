/**
 * seedAlerts.js
 *
 * Creates a single test alert for the first animal found in the DB,
 * then fires WhatsApp, SMS, and email notifications.
 *
 * Usage:
 *   node scripts/alerts/seedAlerts.js
 *   node scripts/alerts/seedAlerts.js <animalId>
 *   node scripts/alerts/seedAlerts.js <animalId> <type>
 *
 * <type> can be: health, vaccination, inactivity, geofence (default: health)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Animal   = require('../../models/Animal');
const Alert    = require('../../models/Alert');
const { sendWhatsAppAlert, sendSmsAlert } = require('../../utils/whatsappSender');
const { sendAlertEmail } = require('../../services/emailService');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Resolve animal
  const animalIdArg = process.argv[2];
  const alertType = process.argv[3] || 'health';
  let animal;
  if (animalIdArg && mongoose.isValidObjectId(animalIdArg)) {
    animal = await Animal.findById(animalIdArg);
    if (!animal) {
      console.error(`Animal not found with id: ${animalIdArg}`);
      process.exit(1);
    }
  } else {
    animal = await Animal.findOne();
    if (!animal) {
      console.error('No animals found in the database. Please add an animal first.');
      process.exit(1);
    }
  }

  console.log(`Using animal: ${animal.name} (${animal._id})`);

  const alertMessages = {
    health: `[TEST] ${animal.name} is showing signs of fever and lethargy. Immediate attention required.`,
    vaccination: `[TEST] Missed vaccination: FMD Vaccine was due on ${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
    inactivity: `[TEST] ${animal.name} has shown no movement for the last 6 hours.`,
    geofence: `[TEST] ${animal.name} has strayed 450m from the farm boundary (boundary: 300m)`
  };

  const severityMap = { health: 'high', vaccination: 'medium', inactivity: 'low', geofence: 'high' };

  const validType = alertMessages[alertType] ? alertType : 'health';

  const alert = await Alert.create({
    animalId: animal._id,
    type: validType,
    severity: severityMap[validType],
    message: alertMessages[validType]
  });

  console.log(`\nCreated alert [${alert.type}] id=${alert._id}`);

  // Fire WhatsApp notification
  try {
    await sendWhatsAppAlert(alert);
    console.log('  WhatsApp: sent');
  } catch (err) {
    console.error(`  WhatsApp send failed: ${err.message}`);
  }

  // Fire SMS notification
  try {
    await sendSmsAlert(alert);
    console.log('  SMS: sent');
  } catch (err) {
    console.error(`  SMS send failed: ${err.message}`);
  }

  // Fire Email notification (post-save hook also fires, but call explicitly for certainty)
  try {
    await sendAlertEmail(alert);
    console.log('  Email: sent');
  } catch (err) {
    console.error(`  Email send failed: ${err.message}`);
  }

  console.log('\nDone. Test alert created and notifications fired.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
