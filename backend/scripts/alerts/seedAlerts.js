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
const fs       = require('fs');
const path     = require('path');
const Animal   = require('../../models/Animal');
const Alert    = require('../../models/Alert');

const SEED_IDS_FILE = path.resolve(__dirname, '.seed-ids.json');
const KALI_ID = '6999765df235b9db428c326e'; 
const JATHAN_ID = '699947d3794f274cbf688a27'; // Default test animal if KALI_ID not found


async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Resolve animal — default to Kali
  const animalIdArg = process.argv[2] || KALI_ID;
  const alertType = process.argv[3] || 'health';
  let animal;
  if (mongoose.isValidObjectId(animalIdArg)) {
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
    health: `  ${animal.name} is showing signs of fever and lethargy. Immediate attention required.`,
    vaccination: `  Missed vaccination: FMD Vaccine was due on ${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
    inactivity: `  ${animal.name} has shown no movement for the last 6 hours.`,
    geofence: `  ${animal.name} has strayed 450m from the farm boundary (boundary: 300m)`
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

  // Save the created ID so deleteAlerts can clean it up
  let existingIds = [];
  if (fs.existsSync(SEED_IDS_FILE)) {
    try { existingIds = JSON.parse(fs.readFileSync(SEED_IDS_FILE, 'utf-8')); } catch (_) {}
  }
  existingIds.push(alert._id.toString());
  fs.writeFileSync(SEED_IDS_FILE, JSON.stringify(existingIds, null, 2));
  console.log(`  Saved ID to ${SEED_IDS_FILE}`);

  console.log('\nDone. Notifications will fire via the post-save hook.');
  console.log('To delete this alert: node deleteAlerts.js');
  
  // Wait 3 seconds for post-save hook to complete before disconnecting
  await new Promise(resolve => setTimeout(resolve, 3000));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
