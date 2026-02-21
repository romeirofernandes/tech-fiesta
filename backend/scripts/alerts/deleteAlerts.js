/**
 * deleteAlerts.js
 *
 * Usage:
 *   node deleteAlerts.js              -- delete only alerts seeded by seedAlerts.js
 *   node deleteAlerts.js test         -- delete all [TEST] alerts
 *   node deleteAlerts.js all          -- delete ALL alerts
 *   node deleteAlerts.js <alertId>    -- delete a specific alert by ID
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');
const Alert    = require('../../models/Alert');

const SEED_IDS_FILE = path.resolve(__dirname, '.seed-ids.json');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const arg = process.argv[2];

  if (!arg) {
    // Delete only alerts created by seedAlerts.js
    if (!fs.existsSync(SEED_IDS_FILE)) {
      console.log('No seed IDs file found. Nothing to delete.');
      console.log('(Run node seedAlerts.js first to create test alerts)');
      await mongoose.disconnect();
      return;
    }
    let ids = [];
    try { ids = JSON.parse(fs.readFileSync(SEED_IDS_FILE, 'utf-8')); } catch (_) {}
    if (ids.length === 0) {
      console.log('No seeded alert IDs found. Nothing to delete.');
      await mongoose.disconnect();
      return;
    }
    const result = await Alert.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted ${result.deletedCount} seeded alert(s).`);
    fs.unlinkSync(SEED_IDS_FILE);
    console.log('Cleared seed IDs file.');
  } else if (arg === 'test') {
    // Delete only [TEST] alerts
    const result = await Alert.deleteMany({ message: { $regex: /\[TEST\]/i } });
    console.log(`Deleted ${result.deletedCount} test alert(s).`);
    if (fs.existsSync(SEED_IDS_FILE)) fs.unlinkSync(SEED_IDS_FILE);
  } else if (arg === 'all') {
    // Delete ALL alerts
    const result = await Alert.deleteMany({});
    console.log(`Deleted ${result.deletedCount} alert(s).`);
    if (fs.existsSync(SEED_IDS_FILE)) fs.unlinkSync(SEED_IDS_FILE);
  } else if (mongoose.isValidObjectId(arg)) {
    // Delete specific alert by ID
    const result = await Alert.findByIdAndDelete(arg);
    if (result) {
      console.log(`Deleted alert: ${arg}`);
      // Remove from seed file if present
      if (fs.existsSync(SEED_IDS_FILE)) {
        try {
          let ids = JSON.parse(fs.readFileSync(SEED_IDS_FILE, 'utf-8'));
          ids = ids.filter(id => id !== arg);
          if (ids.length === 0) { fs.unlinkSync(SEED_IDS_FILE); }
          else { fs.writeFileSync(SEED_IDS_FILE, JSON.stringify(ids, null, 2)); }
        } catch (_) {}
      }
    } else {
      console.log(`No alert found with id: ${arg}`);
    }
  } else {
    console.error('Usage:\n  node deleteAlerts.js          -- delete seeded alerts only\n  node deleteAlerts.js test     -- delete all [TEST] alerts\n  node deleteAlerts.js all      -- delete ALL alerts\n  node deleteAlerts.js <id>     -- delete specific alert');
    process.exit(1);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const arg = process.argv[2];

  if (!arg) {
    // Delete alerts from the last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = await Alert.deleteMany({ createdAt: { $gte: twoHoursAgo } });
    console.log(`Deleted ${result.deletedCount} alert(s) from the last 2 hours.`);
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
