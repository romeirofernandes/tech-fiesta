# Geofencing Radar System

## Overview
The geofencing radar system uses ESP32 + Servo Motor + Ultrasonic Sensor to create a 180° scanning radar that detects movement and creates alerts when objects come within 10cm of the sensor.

## Hardware Setup
- **ESP32** board
- **Servo Motor** (attached to pin 12)
- **Ultrasonic Sensor** (HC-SR04)
  - Trig Pin: 10
  - Echo Pin: 11
- **Buzzer** (pin 8) - for local alerts

## Arduino Code
The Arduino code (`arduino code/arduino_radarprog.ino`) is already configured. It:
- Rotates servo from 15° to 165° continuously
- Measures distance at each angle
- Sends data via serial in format: `angle,distance.` (e.g., "45,23.")
- Activates buzzer when distance < 10cm

## Backend Components

### Models
- **RadarReading** - Stores each radar scan point (angle, distance, location, timestamp)
- **MovementAlert** - Stores geofence violations when objects detected within 10cm

### API Endpoints
```
POST   /api/radar/reading        - Create single radar reading
POST   /api/radar/reading/bulk   - Create multiple readings (full sweep)
GET    /api/radar/latest         - Get latest sweep data
GET    /api/radar/readings       - Get paginated readings with filters
POST   /api/radar/alert          - Create movement alert
GET    /api/radar/alerts         - Get movement alerts
PATCH  /api/radar/alerts/:id/resolve - Resolve an alert
GET    /api/radar/stats          - Get radar statistics
```

### Serial Bridge
**File**: `backend/scripts/radarBridge.js`

Connects to Arduino via serial port and:
- Parses incoming radar data (`angle,distance.`)
- Buffers full 180° sweep before posting to API
- Detects geofence violations (distance < 10cm)
- Creates alerts automatically
- Posts bulk sweep data to `/api/radar/reading/bulk`

## Running the System

### 1. Start Backend Server
```bash
cd backend
npm start
# Server runs on http://localhost:8000
```

### 2. Upload Arduino Code
1. Open `arduino code/arduino_radarprog.ino` in Arduino IDE
2. Select your ESP32 board and COM port
3. Upload the code

### 3. Start Radar Bridge
```bash
cd backend

# Auto-detect COM port
node scripts/radarBridge.js

# Or specify port manually
node scripts/radarBridge.js --port COM3
```

**Expected output:**
```
═══════════════════════════════════════════
   ESP32 Radar Bridge for Geofencing       
═══════════════════════════════════════════

📍 Location: 28.7041, 77.1025

🔌 Connecting to COM3 at 115200 baud...
✅ Serial port opened successfully
📡 Posting to: http://127.0.0.1:8000
🚨 Geofence threshold: 10cm
📦 Device ID: radar_01

--- Listening for radar data ---

📡 Angle: 45° | Distance: 23.5cm
📡 Angle: 46° | Distance: 24.1cm
⚠️  ALERT! Movement detected at 75° (8.2cm)
📤 Posting sweep data (151 points)...
```

### 4. Start Frontend
```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

### 5. View Geofencing Page
Navigate to: **Health & Monitoring → Geofencing**

## Features

### Real-time Radar Visualization
- Military-style circular radar display
- 180° sweep with animated scanning line
- Green dots for safe distances (> 10cm)
- Red pulsing dots for alerts (< 10cm)
- Distance rings at 20cm, 40cm, 60cm, 80cm, 100cm

### Live Statistics
- Nearest object distance and angle
- Total scans in last 24 hours
- Total alerts count
- Unresolved alerts count
- Closest detection ever

### Movement Alerts
- Automatic alert creation when object < 10cm
- Shows latest unresolved alert
- Full movement history with timestamps
- GPS location tracking
- One-click alert resolution

### Status Monitoring
- Radar connection status (Active/Disconnected)
- Location tracking (browser geolocation)
- Last update timestamp
- Manual refresh capability

## Configuration

### Environment Variables (Optional)
Create `.env` in backend folder:

```env
# Radar location (if not using dynamic geolocation)
RADAR_LAT=28.7041
RADAR_LNG=77.1025

# API URL
API_URL=http://127.0.0.1:8000
```

### Geofence Threshold
Edit `backend/scripts/radarBridge.js`:
```javascript
const GEOFENCE_THRESHOLD = 10; // Change to your desired distance in cm
```

### Polling Interval
Edit `frontend/src/pages/Geofencing.jsx`:
```javascript
const { sweepData } = useRadarPolling(API_BASE, {
  pollInterval: 2000,  // Change to adjust refresh rate (milliseconds)
  // ...
});
```

## Troubleshooting

### Radar shows "Disconnected"
- Ensure radarBridge.js is running
- Check COM port connection
- Verify Arduino is uploading serial data

### No data appearing
- Check backend server is running on port 8000
- Open browser console for errors
- Verify API_BASE_URL in frontend .env

### Serial port not found
- List available ports: `node -e "require('serialport').SerialPort.list().then(console.log)"`
- Manually specify port: `node scripts/radarBridge.js --port COM5`
- Install USB drivers for ESP32

### Alerts not triggering
- Check GEOFENCE_THRESHOLD setting
- Ensure objects are actually within 10cm
- Check radarBridge console for "ALERT!" messages

## Database Collections

### radar_readings
Stores all radar scan points:
```javascript
{
  deviceId: "radar_01",
  angle: 45,
  distance: 23.5,
  location: { lat: 28.7041, lng: 77.1025, accuracy: 100 },
  timestamp: ISODate("2026-02-17T10:30:00Z")
}
```

### movement_alerts
Stores geofence violations:
```javascript
{
  deviceId: "radar_01",
  distance: 8.2,
  angle: 75,
  location: { lat: 28.7041, lng: 77.1025 },
  severity: "high",
  message: "Movement detected at 75° (8.2cm from radar)",
  isResolved: false,
  timestamp: ISODate("2026-02-17T10:30:00Z")
}
```

## Future Enhancements
- Multiple radar support
- Custom geofence boundary shapes
- SMS/Email alerts
- GPS module integration for accurate positioning
- Farm boundary mapping
- Animal tracking with RFID integration

## Support
For issues or questions, check the console logs:
- **Backend**: Terminal running `npm start`
- **Radar Bridge**: Terminal running `radarBridge.js`
- **Frontend**: Browser console (F12)
