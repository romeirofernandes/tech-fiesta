/**
 * Heart Rate Data Generator
 * Generates realistic heart rate + temperature + humidity sensor data for a specific animal.
 * POSTs data to the running backend server via /api/iot/sensors/bulk.
 *
 * Usage:
 *   node generateHeartRateData.js --rfid RF2005 --start "2026-02-15T06:00:00Z" --end "2026-02-15T12:00:00Z"
 *   node generateHeartRateData.js --rfid RF2005                          (defaults to last 6 hours)
 *   node generateHeartRateData.js --rfid RF2005 --species goat --server http://localhost:5000
 *
 * Options:
 *   --rfid       RFID tag of the animal (required)
 *   --start      Start time (ISO 8601). Default: 6 hours ago
 *   --end        End time (ISO 8601). Default: now
 *   --species    Animal species for realistic ranges. Default: goat
 *   --server     Backend server URL. Default: http://localhost:5000
 *   --batch      Batch size for bulk POST. Default: 60
 */

const axios = require('axios');

// Sensor value ranges by species
const SENSOR_RANGES = {
  cow:     { tempMin: 38.0, tempMax: 39.5, humidMin: 40, humidMax: 70, hrMin: 48, hrMax: 84 },
  buffalo: { tempMin: 37.5, tempMax: 39.0, humidMin: 45, humidMax: 75, hrMin: 40, hrMax: 80 },
  goat:    { tempMin: 38.5, tempMax: 40.5, humidMin: 35, humidMax: 65, hrMin: 70, hrMax: 135 },
  sheep:   { tempMin: 38.5, tempMax: 40.0, humidMin: 35, humidMax: 65, hrMin: 60, hrMax: 120 },
  chicken: { tempMin: 40.5, tempMax: 42.0, humidMin: 30, humidMax: 60, hrMin: 250, hrMax: 350 },
  pig:     { tempMin: 38.0, tempMax: 39.5, humidMin: 45, humidMax: 75, hrMin: 60, hrMax: 100 },
  horse:   { tempMin: 37.5, tempMax: 38.5, humidMin: 40, humidMax: 70, hrMin: 28, hrMax: 44 },
  default: { tempMin: 37.5, tempMax: 39.5, humidMin: 40, humidMax: 70, hrMin: 60, hrMax: 100 },
};

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    rfid: null,
    start: null,
    end: null,
    species: 'goat',
    server: 'http://localhost:5000',
    batch: 60,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--rfid':    opts.rfid = args[++i]; break;
      case '--start':   opts.start = args[++i]; break;
      case '--end':     opts.end = args[++i]; break;
      case '--species': opts.species = args[++i]; break;
      case '--server':  opts.server = args[++i]; break;
      case '--batch':   opts.batch = parseInt(args[++i]); break;
    }
  }

  if (!opts.rfid) {
    console.error('Error: --rfid is required');
    console.error('Usage: node generateHeartRateData.js --rfid RF2005 [--start ISO] [--end ISO] [--species goat] [--server URL]');
    process.exit(1);
  }

  // Defaults: last 6 hours
  const now = new Date();
  if (!opts.end) opts.end = now.toISOString();
  if (!opts.start) opts.start = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();

  return opts;
}

/**
 * Generate a realistic value using random walk (smoother transitions).
 * @param {number} prev - Previous value
 * @param {number} min - Minimum allowed
 * @param {number} max - Maximum allowed
 * @param {number} maxStep - Maximum step change per tick
 * @returns {number}
 */
function randomWalk(prev, min, max, maxStep) {
  const step = (Math.random() - 0.5) * 2 * maxStep;
  let next = prev + step;
  // Clamp to range
  if (next < min) next = min + Math.random() * maxStep;
  if (next > max) next = max - Math.random() * maxStep;
  return next;
}

async function main() {
  const opts = parseArgs();
  const ranges = SENSOR_RANGES[opts.species] || SENSOR_RANGES.default;

  const startTime = new Date(opts.start);
  const endTime = new Date(opts.end);
  const durationMs = endTime - startTime;
  const intervalMs = 60 * 1000; // 1 minute per reading
  const totalReadings = Math.floor(durationMs / intervalMs);

  console.log('═══════════════════════════════════════════');
  console.log('     Heart Rate Data Generator Script      ');
  console.log('═══════════════════════════════════════════');
  console.log(`  RFID:      ${opts.rfid}`);
  console.log(`  Species:   ${opts.species}`);
  console.log(`  Start:     ${startTime.toISOString()}`);
  console.log(`  End:       ${endTime.toISOString()}`);
  console.log(`  Duration:  ${(durationMs / (60 * 60 * 1000)).toFixed(1)} hours`);
  console.log(`  Readings:  ${totalReadings} (1 per minute)`);
  console.log(`  Server:    ${opts.server}`);
  console.log(`  HR Range:  ${ranges.hrMin}-${ranges.hrMax} bpm`);
  console.log(`  Temp Range: ${ranges.tempMin}-${ranges.tempMax} °C`);
  console.log('═══════════════════════════════════════════\n');

  if (totalReadings <= 0) {
    console.error('Error: End time must be after start time');
    process.exit(1);
  }

  // Generate all readings with smooth random walk
  const readings = [];
  let hr = (ranges.hrMin + ranges.hrMax) / 2; // Start at midpoint
  let temp = (ranges.tempMin + ranges.tempMax) / 2;
  let humid = (ranges.humidMin + ranges.humidMax) / 2;

  const hrStep = (ranges.hrMax - ranges.hrMin) * 0.05; // 5% of range per step
  const tempStep = (ranges.tempMax - ranges.tempMin) * 0.03;
  const humidStep = (ranges.humidMax - ranges.humidMin) * 0.04;

  for (let i = 0; i < totalReadings; i++) {
    const timestamp = new Date(startTime.getTime() + i * intervalMs);

    hr = randomWalk(hr, ranges.hrMin, ranges.hrMax, hrStep);
    temp = randomWalk(temp, ranges.tempMin, ranges.tempMax, tempStep);
    humid = randomWalk(humid, ranges.humidMin, ranges.humidMax, humidStep);

    readings.push({
      rfidTag: opts.rfid.toLowerCase().replace(/\s+/g, ''),
      temperature: parseFloat(temp.toFixed(1)),
      humidity: parseFloat(humid.toFixed(1)),
      heartRate: Math.round(hr),
      sensorType: 'COMBINED',
      deviceId: 'hr_generator',
      timestamp: timestamp.toISOString(),
    });
  }

  // POST in batches
  let sent = 0;
  for (let i = 0; i < readings.length; i += opts.batch) {
    const batch = readings.slice(i, i + opts.batch);
    try {
      await axios.post(`${opts.server}/api/iot/sensors/bulk`, {
        readings: batch,
      });
      sent += batch.length;
      const pct = ((sent / totalReadings) * 100).toFixed(0);
      process.stdout.write(`\r  Sent ${sent}/${totalReadings} readings (${pct}%)`);
    } catch (error) {
      console.error(`\n  Error posting batch at index ${i}:`, error.response?.data || error.message);
      // Continue with next batch
    }
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log(`  Done! Sent ${sent}/${totalReadings} readings.`);
  console.log('═══════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
