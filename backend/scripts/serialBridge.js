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
const API_BASE_URL = process.env.API_URL || 'http://127.0.0.1:5000';
const BAUD_RATE = 115200;
const POST_INTERVAL_MS = 5000; // Post sensor data every 5 seconds
const HEARTBEAT_INTERVAL_MS = 10000; // Send heartbeat every 10 seconds

// State management
let currentRfid = null;
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

// Parse RFID from serial output
// Format: ">>> RFID Card Detected! UID:  04 3A 2B 1C"
function parseRfid(line) {
  const match = line.match(/UID:\s*([0-9A-Fa-f\s]+)/);
  if (match) {
    // Remove spaces and lowercase
    return match[1].replace(/\s+/g, '').toLowerCase();
  }
  return null;
}

// Parse temperature from serial output
// Format: "Temperature: 36.5 °C / 97.7 °F" or "Temperature: 36.5 °C"
function parseTemperature(line) {
  const match = line.match(/Temperature:\s*([\d.]+)\s*°C/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

// Parse humidity from serial output
// Format: "Humidity: 65.0 %"
function parseHumidity(line) {
  const match = line.match(/Humidity:\s*([\d.]+)\s*%/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

// Parse heart rate from serial output
// Format: "BPM: 72.0 | Avg BPM: 70" or "Avg BPM: 70"
function parseHeartRate(line) {
  const match = line.match(/Avg BPM:\s*(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  return null;
}

// Process incoming serial line
async function processLine(line) {
  console.log(`[Serial] ${line}`);

  // Check for RFID detection
  if (line.includes('RFID Card Detected') || line.includes('UID:')) {
    const rfid = parseRfid(line);
    if (rfid) {
      currentRfid = rfid;
      console.log(`\n📟 RFID Detected: ${rfid}`);
      
      // Post RFID event
      await postData('/api/iot/rfid', {
        rfidTag: rfid,
        readerId: 'serial_bridge'
      });
    }
  }

  // Check for user switch
  if (line.includes('New card detected') || line.includes('Switching user')) {
    console.log('\n🔄 User switch detected, resetting buffer');
    sensorBuffer = {
      temperature: null,
      humidity: null,
      heartRate: null
    };
  }

  // Parse sensor values
  const temp = parseTemperature(line);
  if (temp !== null) {
    sensorBuffer.temperature = temp;
    console.log(`🌡️  Temperature: ${temp}°C`);
  }

  const humid = parseHumidity(line);
  if (humid !== null) {
    sensorBuffer.humidity = humid;
    console.log(`💧 Humidity: ${humid}%`);
  }

  const hr = parseHeartRate(line);
  if (hr !== null) {
    sensorBuffer.heartRate = hr;
    console.log(`❤️  Heart Rate: ${hr} BPM`);
  }

  // Check if it's time to post sensor data
  const now = Date.now();
  if (now - lastPostTime >= POST_INTERVAL_MS) {
    await postSensorData();
    lastPostTime = now;
  }
}

// Post buffered sensor data to API
async function postSensorData() {
  if (!currentRfid) {
    console.log('⏳ No RFID set, skipping sensor post');
    return;
  }

  const { temperature, humidity, heartRate } = sensorBuffer;
  
  // Only post if we have at least one sensor value
  if (temperature === null && humidity === null && heartRate === null) {
    console.log('⏳ No sensor data in buffer, skipping');
    return;
  }

  const data = {
    rfidTag: currentRfid,
    temperature,
    humidity,
    heartRate,
    deviceId: 'esp32_serial'
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

  const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

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

  // Periodic sensor posting (backup in case no new data triggers it)
  setInterval(async () => {
    if (currentRfid && Date.now() - lastPostTime >= POST_INTERVAL_MS) {
      await postSensorData();
      lastPostTime = Date.now();
    }
  }, POST_INTERVAL_MS);
}

main().catch(console.error);
