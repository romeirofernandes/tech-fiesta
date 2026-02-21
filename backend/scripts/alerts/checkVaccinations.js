/**
 * checkVaccinations.js
 *
 * Run this manually to detect ALL missed vaccinations and create alerts + send notifications.
 * Safe to run multiple times — won't create duplicate alerts for the same missed vaccination.
 *
 * Usage:
 *   node scripts/alerts/checkVaccinations.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const VaccinationEvent = require('../../models/VaccinationEvent');
const Alert = require('../../models/Alert');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const now = new Date();

  // Find ALL overdue scheduled vaccination events (no time restriction)
  const overdueEvents = await VaccinationEvent.find({
    eventType: 'scheduled',
    date: { $lt: now }
  }).populate('animalId', 'name rfid');

  if (overdueEvents.length === 0) {
    console.log('No overdue vaccinations found.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${overdueEvents.length} overdue vaccination event(s).`);

  // Mark all as 'missed'
  const overdueIds = overdueEvents.map(e => e._id);
  await VaccinationEvent.updateMany(
    { _id: { $in: overdueIds } },
    { $set: { eventType: 'missed' } }
  );

  let created = 0;
  let skipped = 0;

  for (const event of overdueEvents) {
    if (!event.animalId) { skipped++; continue; }

    const animalIdVal = event.animalId._id || event.animalId;
    const message = `Missed vaccination: ${event.vaccineName} was due on ${event.date.toLocaleDateString()}`;

    // Don't create duplicate alerts for the same missed vaccination
    const existingAlert = await Alert.findOne({
      animalId: animalIdVal,
      type: 'vaccination',
      message: { $regex: event.vaccineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      isResolved: false
    });

    if (existingAlert) {
      console.log(`  SKIP: alert already exists for ${event.animalId.name} - ${event.vaccineName}`);
      skipped++;
      continue;
    }

    const daysPastDue = Math.floor((now - event.date) / (1000 * 60 * 60 * 24));
    await Alert.create({
      animalId: animalIdVal,
      type: 'vaccination',
      severity: daysPastDue > 30 ? 'high' : 'medium',
      message
    });
    // Post-save hook fires automatically → sends WhatsApp, SMS, email
    console.log(`  CREATED: ${event.animalId.name} - ${event.vaccineName} (${daysPastDue}d overdue)`);
    created++;
  }

  console.log(`\nDone. Created ${created} alert(s), skipped ${skipped}.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
