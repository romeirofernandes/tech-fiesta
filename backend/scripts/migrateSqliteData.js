/**
 * SQLite to MongoDB Migration Script
 * Migrates data from rest_backend/db.sqlite3 to MongoDB
 * 
 * Usage: node migrateSqliteData.js
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import models
const IotSensorReading = require('../models/IotSensorReading');
const RFIDEvent = require('../models/RFIDEvent');
const Animal = require('../models/Animal');

// SQLite database path
const SQLITE_PATH = path.join(__dirname, '..', '..', 'rest_backend', 'db.sqlite3');

async function connectMongoDB() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI or MONGO_URI not found in .env');
  }
  
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');
}

async function migrateData() {
  console.log('═══════════════════════════════════════════');
  console.log('    SQLite to MongoDB Migration Script     ');
  console.log('═══════════════════════════════════════════\n');

  // Check if SQLite file exists
  const fs = require('fs');
  if (!fs.existsSync(SQLITE_PATH)) {
    console.log(`⚠️  SQLite database not found at: ${SQLITE_PATH}`);
    console.log('   Skipping migration, no data to transfer.\n');
    return { sensorReadings: 0, rfidEvents: 0 };
  }

  // Load better-sqlite3
  const Database = require('better-sqlite3');
  const db = new Database(SQLITE_PATH, { readonly: true });
  
  console.log(`📂 SQLite database: ${SQLITE_PATH}\n`);

  // Connect to MongoDB
  await connectMongoDB();

  // Get all animals for RFID matching
  const animals = await Animal.find({});
  const animalByRfid = {};
  animals.forEach(animal => {
    const normalizedRfid = animal.rfid.toLowerCase().replace(/\s+/g, '');
    animalByRfid[normalizedRfid] = animal._id;
  });
  console.log(`📋 Found ${animals.length} animals in MongoDB for RFID matching\n`);

  // Helper to find animal ID by RFID
  const findAnimalId = (rfidTag) => {
    if (!rfidTag) return null;
    const normalized = rfidTag.toLowerCase().replace(/\s+/g, '');
    return animalByRfid[normalized] || null;
  };

  // ═══════════════════════════════════════════
  // Migrate Sensor Readings
  // ═══════════════════════════════════════════
  console.log('🔄 Migrating sensor readings...');
  
  let sensorCount = 0;
  try {
    const sensorRows = db.prepare('SELECT * FROM sensors_sensorreading ORDER BY timestamp').all();
    console.log(`   Found ${sensorRows.length} sensor readings in SQLite`);

    for (const row of sensorRows) {
      const normalizedRfid = (row.rfid_tag || '').toLowerCase().replace(/\s+/g, '');
      
      const reading = new IotSensorReading({
        rfidTag: normalizedRfid,
        animalId: findAnimalId(normalizedRfid),
        temperature: row.temperature,
        humidity: row.humidity,
        heartRate: row.heart_rate,
        sensorType: row.sensor_type || 'COMBINED',
        deviceId: row.device_id || '',
        timestamp: new Date(row.timestamp),
        createdAt: new Date(row.created_at)
      });

      await reading.save();
      sensorCount++;
    }
    console.log(`   ✅ Migrated ${sensorCount} sensor readings\n`);
  } catch (error) {
    if (error.message.includes('no such table')) {
      console.log('   ⚠️  No sensors_sensorreading table found, skipping\n');
    } else {
      throw error;
    }
  }

  // ═══════════════════════════════════════════
  // Migrate RFID Events
  // ═══════════════════════════════════════════
  console.log('🔄 Migrating RFID events...');
  
  let rfidCount = 0;
  try {
    const rfidRows = db.prepare('SELECT * FROM sensors_rfidevent ORDER BY timestamp').all();
    console.log(`   Found ${rfidRows.length} RFID events in SQLite`);

    for (const row of rfidRows) {
      const normalizedRfid = (row.rfid_tag || '').toLowerCase().replace(/\s+/g, '');
      
      const event = new RFIDEvent({
        rfidTag: normalizedRfid,
        animalId: findAnimalId(normalizedRfid),
        readerId: row.reader_id || '',
        timestamp: new Date(row.timestamp)
      });

      await event.save();
      rfidCount++;
    }
    console.log(`   ✅ Migrated ${rfidCount} RFID events\n`);
  } catch (error) {
    if (error.message.includes('no such table')) {
      console.log('   ⚠️  No sensors_rfidevent table found, skipping\n');
    } else {
      throw error;
    }
  }

  db.close();
  
  console.log('═══════════════════════════════════════════');
  console.log('              Migration Summary            ');
  console.log('═══════════════════════════════════════════');
  console.log(`   Sensor Readings: ${sensorCount}`);
  console.log(`   RFID Events:     ${rfidCount}`);
  console.log('═══════════════════════════════════════════\n');

  return { sensorReadings: sensorCount, rfidEvents: rfidCount };
}

// Run migration
migrateData()
  .then(() => {
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
