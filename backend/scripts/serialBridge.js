/**
 * Serial Bridge for ESP32 IoT Communication
 * Replaces the Python serial_bridge.py from rest_backend
 * 
 * Connects to ESP32 via serial port and forwards sensor data to Node.js API
 * 
 * Usage: node serialBridge.js --port COM3
 *        node serialBridge.js (auto-detect)
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://127.0.0.1:8000';
const BAUD_RATE = 115200;
const POST_INTERVAL_MS = 2000;      // Post every 2 s (matches ESP32 emit rate)
const HEARTBEAT_INTERVAL_MS = 10000; // Send heartbeat every 10 seconds
const DEVICE_ID = 'neckband_001';    // Must match what the ESP32 was flashed with

// Sensor buffer — updated every time a JSON line arrives from the ESP32
let sensorBuffer = {
  temperature: null,
  humidity: null,
  heartRate: null
};
let lastPostTime = Date.now();

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

// HTTP POST helper using built-in fetch (Node 18+) or http module
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
    console.log(`✓ POST ${endpoint} success`);
    return result;
  } catch (error) {
    console.error(`POST ${endpoint} error: ${error.message}`);
    return null;
  }
}

// Parse a JSON line emitted by the ESP32
// Expected format: {"temperature":38.5,"humidity":62.0,"heartRate":74}
function parseJsonLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

// Process incoming serial line — ESP32 emits one JSON object per line
async function processLine(line) {
  // Skip debug/info lines that start with '['
  const trimmed = line.trim();
  if (!trimmed.startsWith('{')) {
    if (trimmed.length > 0) console.log(`[Serial] ${trimmed}`);
    return;
  }

  const parsed = parseJsonLine(trimmed);
  if (!parsed) {
    console.warn(`[Serial] Could not parse line: ${trimmed}`);
    return;
  }

  // Merge into buffer (keep last known value if a field is absent this tick)
  if (parsed.temperature != null) {
    sensorBuffer.temperature = parsed.temperature;
    console.log(`🌡️  Temperature: ${parsed.temperature} °C`);
  }
  if (parsed.humidity != null) {
    sensorBuffer.humidity = parsed.humidity;
    console.log(`💧 Humidity: ${parsed.humidity} %`);
  }
  if (parsed.heartRate != null) {
    sensorBuffer.heartRate = parsed.heartRate;
    console.log(`❤️  Heart Rate: ${parsed.heartRate} BPM`);
  }

  // Post to backend on every line (ESP32 already throttles to PRINT_INTERVAL)
  const now = Date.now();
  if (now - lastPostTime >= POST_INTERVAL_MS) {
    await postSensorData();
    lastPostTime = now;
  }
}

// Post buffered sensor data to API (no RFID required)
async function postSensorData() {
  const { temperature, humidity, heartRate } = sensorBuffer;

  // Only post if we have at least one sensor value
  if (temperature === null && humidity === null && heartRate === null) {
    console.log('⏳ No sensor data in buffer yet, skipping');
    return;
  }

  const data = {
    temperature,
    humidity,
    heartRate,
    deviceId: DEVICE_ID
  };

  console.log('\n📤 Posting sensor data:', JSON.stringify(data));
  await postData('/api/iot/sensors', data);
}

// Send heartbeat to API to indicate device is connected
async function sendHeartbeat() {
  await postData('/api/iot/heartbeat', { deviceId: 'esp32_serial' });
  console.log('💓 Heartbeat sent');
}

// Main entry point
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('    ESP32 Serial Bridge for Node.js IoT    ');
  console.log('═══════════════════════════════════════════\n');

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

  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  // Handle connection open
  port.on('open', () => {
    console.log('✅ Serial port opened successfully');
    console.log(`📡 Posting to: ${API_BASE_URL}`);
    console.log(`⏱️  Post interval: ${POST_INTERVAL_MS / 1000}s`);
    console.log(`💓 Heartbeat interval: ${HEARTBEAT_INTERVAL_MS / 1000}s`);
    console.log('\n--- Listening for data ---\n');
    
    // Send initial heartbeat
    sendHeartbeat();
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

  // Periodic heartbeat to maintain connection status
  setInterval(async () => {
    await sendHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);
}

main().catch(console.error);
