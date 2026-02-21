/**
 * deleteAlerts.js
 *
 * Deletes alerts from the database.
 *
 * Usage:
 *   node scripts/deleteAlerts.js              -- deletes ALL alerts
 *   node scripts/deleteAlerts.js test         -- deletes only [TEST] alerts (message contains "[TEST]")
 *   node scripts/deleteAlerts.js <alertId>    -- deletes the specific alert by ID
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Alert    = require('../../models/Alert');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const arg = process.argv[2];

  if (!arg) {
    // Delete ALL alerts
    const result = await Alert.deleteMany({});
    console.log(`Deleted ${result.deletedCount} alert(s).`);
  } else if (arg === 'test') {
    // Delete only seeded test alerts
    const result = await Alert.deleteMany({ message: { $regex: /\[TEST\]/i } });
    console.log(`Deleted ${result.deletedCount} test alert(s).`);
  } else if (mongoose.isValidObjectId(arg)) {
    // Delete specific alert by ID
    const result = await Alert.findByIdAndDelete(arg);
    if (result) {
      console.log(`Deleted alert: ${arg}`);
    } else {
      console.log(`No alert found with id: ${arg}`);
    }
  } else {
    console.error('Invalid argument. Usage:\n  node scripts/deleteAlerts.js\n  node scripts/deleteAlerts.js test\n  node scripts/deleteAlerts.js <alertId>');
    process.exit(1);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
