/**
 * Radar Serial Bridge for ESP32 + Servo + Ultrasonic Sensor
 * 
 * Connects to ESP32 via serial port and forwards radar sweep data to Node.js API
 * Detects movements within geofence boundary (< 10cm) and creates alerts
 * 
 * Usage: node radarBridge.js --port COM3
 *        node radarBridge.js (auto-detect)
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://127.0.0.1:8000';
const BAUD_RATE = 115200;
const DEVICE_ID = 'radar_01';
const GEOFENCE_THRESHOLD = 30; // cm - alert if object within this distance
const HEARTBEAT_INTERVAL_MS = 10000; // Send heartbeat every 10 seconds

// State management
let lastAlertTime = {};
const ALERT_COOLDOWN = 5000; // Don't re-alert same angle within 5 seconds

// Location (will be updated with actual location)
let currentLocation = null;

// Parse command line arguments
function getPortFromArgs() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      return args[i + 1];
    }
  }
  return null;
}

// Auto-detect available serial ports
async function findSerialPort() {
  const ports = await SerialPort.list();
  console.log('Available serial ports:');
  ports.forEach((port, idx) => {
    console.log(`  ${idx + 1}. ${port.path} - ${port.manufacturer || 'Unknown'}`);
  });

  // Look for common ESP32/Arduino identifiers
  const espPort = ports.find(p => 
    (p.manufacturer && (
      p.manufacturer.includes('Silicon Labs') ||
      p.manufacturer.includes('FTDI') ||
      p.manufacturer.includes('wch.cn') ||
      p.manufacturer.includes('Espressif')
    )) ||
    (p.path && p.path.includes('USB'))
  );

  if (espPort) {
    console.log(`\nAuto-selected: ${espPort.path}`);
    return espPort.path;
  }

  if (ports.length > 0) {
    console.log(`\nUsing first available: ${ports[0].path}`);
    return ports[0].path;
  }

  return null;
}

// HTTP POST helper
async function postData(endpoint, data) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`POST ${endpoint} failed: ${response.status} - ${errorText}`);
      return null;
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`POST ${endpoint} error: ${error.message}`);
    return null;
  }
}

// Parse radar data from serial output
// Format: "angle,distance." (e.g., "45,23." or "90,5.67.")
function parseRadarData(line) {
  const match = line.match(/(\d+),(\d+\.?\d*)$/);
  if (match) {
    return {
      angle: parseInt(match[1]),
      distance: parseFloat(match[2])
    };
  }
  return null;
}

// Check if object is within geofence boundary
function isGeofenceViolation(distance) {
  return distance < GEOFENCE_THRESHOLD && distance > 0;
}

// Check if we should send alert (cooldown logic)
function shouldSendAlert(angle) {
  const now = Date.now();
  const lastAlert = lastAlertTime[angle] || 0;
  return (now - lastAlert) > ALERT_COOLDOWN;
}

// Process incoming serial line
async function processLine(line) {
  // Skip empty lines
  if (!line || line.trim() === '') return;
  
  const radarData = parseRadarData(line);
  
  if (radarData) {
    const { angle, distance } = radarData;

    const alert = distance < GEOFENCE_THRESHOLD && distance > 0;
    process.stdout.write(`📡 ${angle}°→${distance.toFixed(0)}cm${alert ? ' 🚨' : ''}  \r`);

    // POST directly to in-memory live endpoint — no DB writes
    await postData('/api/radar/live', { angle, distance, deviceId: DEVICE_ID });

    // Only persist an alert record if geofence violated (DB write kept minimal)
    if (alert && shouldSendAlert(angle)) {
      console.log(`\n⚠️  ALERT! Movement at ${angle}° (${distance.toFixed(1)}cm)`);
      await postData('/api/radar/alert', {
        deviceId: DEVICE_ID,
        angle,
        distance,
        location: currentLocation,
        severity: distance < 5 ? 'high' : 'medium'
      });
      lastAlertTime[angle] = Date.now();
    }
  }
}

// Get browser-like location (for testing, use fixed coordinates)
// In production, you can get this from GPS module or manual config
async function getLocation() {
  // TODO: If you have a GPS module, read from there
  // For now, use environment variables or default
  return {
    lat: parseFloat(process.env.RADAR_LAT) || 28.7041,
    lng: parseFloat(process.env.RADAR_LNG) || 77.1025,
    accuracy: 100
  };
}

// Send heartbeat to backend
async function sendHeartbeat() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/radar/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: DEVICE_ID })
    });
    
    if (response.ok) {
      console.log('💓 Heartbeat sent');
    }
  } catch (error) {
    console.error('❌ Heartbeat failed:', error.message);
  }
}

// Main entry point
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('   ESP32 Radar Bridge for Geofencing       ');
  console.log('═══════════════════════════════════════════\n');

  // Get location
  currentLocation = await getLocation();
  console.log(`📍 Location: ${currentLocation.lat}, ${currentLocation.lng}\n`);

  // Determine port
  let portPath = getPortFromArgs();
  
  if (!portPath) {
    console.log('No --port specified, auto-detecting...\n');
    portPath = await findSerialPort();
  }

  if (!portPath) {
    console.error('❌ No serial port found. Please specify with --port COM3');
    process.exit(1);
  }

  console.log(`\n🔌 Connecting to ${portPath} at ${BAUD_RATE} baud...`);

  // Create serial port connection
  const port = new SerialPort({
    path: portPath,
    baudRate: BAUD_RATE
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '.' }));

  // Handle connection open
  port.on('open', () => {
    console.log('✅ Serial port opened successfully');
    console.log(`📡 Posting to: ${API_BASE_URL}`);
    console.log(`🚨 Geofence threshold: ${GEOFENCE_THRESHOLD}cm`);
    console.log(`📦 Device ID: ${DEVICE_ID}`);
    console.log('\n--- Listening for radar data ---\n');
    
    // Send initial heartbeat
    sendHeartbeat();
    
    // Set up periodic heartbeat
    setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  });

  // Handle incoming data
  parser.on('data', processLine);

  // Handle errors
  port.on('error', (err) => {
    console.error('❌ Serial port error:', err.message);
  });

  // Handle close
  port.on('close', () => {
    console.log('\n🔌 Serial port closed');
    process.exit(0);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down...');
    port.close();
  });
}

main().catch(console.error);
