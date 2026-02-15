/**
 * IoT Dummy Data Seeder
 * Generates realistic sensor data for all animals in the database
 * 
 * Usage: node seedIotData.js
 *        node seedIotData.js --clear (clears existing IoT data first)
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import models
const IotSensorReading = require('../models/IotSensorReading');
const RFIDEvent = require('../models/RFIDEvent');
const Animal = require('../models/Animal');
const Farm = require('../models/Farm'); // Required for populate

// Configuration
const READINGS_PER_ANIMAL = 150; // Number of sensor readings to generate
const HOURS_OF_DATA = 24; // Spread readings over this many hours
const RFID_EVENTS_PER_ANIMAL = 10; // Random RFID scan events

// Realistic sensor value ranges by species
const SENSOR_RANGES = {
  cow: {
    tempMin: 38.0, tempMax: 39.5,
    humidMin: 40, humidMax: 70,
    hrMin: 48, hrMax: 84
  },
  buffalo: {
    tempMin: 37.5, tempMax: 39.0,
    humidMin: 45, humidMax: 75,
    hrMin: 40, hrMax: 80
  },
  goat: {
    tempMin: 38.5, tempMax: 40.5,
    humidMin: 35, humidMax: 65,
    hrMin: 70, hrMax: 135
  },
  sheep: {
    tempMin: 38.5, tempMax: 40.0,
    humidMin: 35, humidMax: 65,
    hrMin: 60, hrMax: 120
  },
  chicken: {
    tempMin: 40.5, tempMax: 42.0,
    humidMin: 30, humidMax: 60,
    hrMin: 250, hrMax: 350
  },
  pig: {
    tempMin: 38.0, tempMax: 39.5,
    humidMin: 45, humidMax: 75,
    hrMin: 60, hrMax: 100
  },
  horse: {
    tempMin: 37.5, tempMax: 38.5,
    humidMin: 40, humidMax: 70,
    hrMin: 28, hrMax: 44
  },
  default: {
    tempMin: 37.5, tempMax: 39.5,
    humidMin: 40, humidMax: 70,
    hrMin: 60, hrMax: 100
  }
};

// Random number in range with some decimal precision
function randomInRange(min, max, decimals = 1) {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

// Generate random timestamp within the last N hours
function randomTimestamp(hoursBack) {
  const now = Date.now();
  const msBack = hoursBack * 60 * 60 * 1000;
  return new Date(now - Math.random() * msBack);
}

// Generate timestamps evenly spread over time period
function generateTimestamps(count, hoursBack) {
  const now = Date.now();
  const intervalMs = (hoursBack * 60 * 60 * 1000) / count;
  const timestamps = [];
  
  for (let i = 0; i < count; i++) {
    // Add some randomness to each interval
    const jitter = (Math.random() - 0.5) * intervalMs * 0.5;
    const time = now - (count - i) * intervalMs + jitter;
    timestamps.push(new Date(time));
  }
  
  return timestamps.sort((a, b) => a - b);
}

async function connectMongoDB() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI or MONGO_URI not found in .env');
  }
  
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');
}

async function seedData() {
  console.log('═══════════════════════════════════════════');
  console.log('       IoT Dummy Data Seeder Script        ');
  console.log('═══════════════════════════════════════════\n');

  // Check for --clear flag
  const shouldClear = process.argv.includes('--clear');

  await connectMongoDB();

  // Clear existing data if requested
  if (shouldClear) {
    console.log('🗑️  Clearing existing IoT data...');
    await IotSensorReading.deleteMany({});
    await RFIDEvent.deleteMany({});
    console.log('   Cleared all IoT sensor readings and RFID events\n');
  }

  // Get all animals
  const animals = await Animal.find({}).populate('farmId', 'name');
  console.log(`📋 Found ${animals.length} animals in database\n`);

  if (animals.length === 0) {
    console.log('⚠️  No animals found! Please add some animals first.');
    console.log('   Tip: Use the app to create animals with RFID tags.\n');
    return { sensorReadings: 0, rfidEvents: 0 };
  }

  let totalReadings = 0;
  let totalRfidEvents = 0;

  for (const animal of animals) {
    const species = animal.species?.toLowerCase() || 'default';
    const ranges = SENSOR_RANGES[species] || SENSOR_RANGES.default;
    const rfidTag = animal.rfid.toLowerCase().replace(/\s+/g, '');

    console.log(`🐄 Processing: ${animal.name} (${animal.species}) - RFID: ${rfidTag}`);

    // Generate sensor readings
    const timestamps = generateTimestamps(READINGS_PER_ANIMAL, HOURS_OF_DATA);
    const readings = [];

    for (const timestamp of timestamps) {
      readings.push({
        animalId: animal._id,
        rfidTag: rfidTag,
        temperature: randomInRange(ranges.tempMin, ranges.tempMax),
        humidity: randomInRange(ranges.humidMin, ranges.humidMax),
        heartRate: Math.round(randomInRange(ranges.hrMin, ranges.hrMax, 0)),
        sensorType: 'COMBINED',
        deviceId: 'seed_script',
        timestamp: timestamp,
        createdAt: timestamp
      });
    }

    // Bulk insert sensor readings
    await IotSensorReading.insertMany(readings);
    totalReadings += readings.length;
    console.log(`   ✅ Created ${readings.length} sensor readings`);

    // Generate RFID events
    const rfidEvents = [];
    for (let i = 0; i < RFID_EVENTS_PER_ANIMAL; i++) {
      rfidEvents.push({
        rfidTag: rfidTag,
        animalId: animal._id,
        readerId: `reader_${Math.floor(Math.random() * 3) + 1}`,
        timestamp: randomTimestamp(HOURS_OF_DATA)
      });
    }

    await RFIDEvent.insertMany(rfidEvents);
    totalRfidEvents += rfidEvents.length;
    console.log(`   ✅ Created ${rfidEvents.length} RFID events\n`);
  }

  console.log('═══════════════════════════════════════════');
  console.log('               Seeding Summary             ');
  console.log('═══════════════════════════════════════════');
  console.log(`   Animals processed:  ${animals.length}`);
  console.log(`   Sensor readings:    ${totalReadings}`);
  console.log(`   RFID events:        ${totalRfidEvents}`);
  console.log('═══════════════════════════════════════════\n');

  return { sensorReadings: totalReadings, rfidEvents: totalRfidEvents };
}

// Run seeder
seedData()
  .then(() => {
    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
