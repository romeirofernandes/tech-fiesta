# RFID Tracking Neckband — System Documentation

A livestock health monitoring neckband that reads body temperature, ambient humidity, and heart rate from an animal in real-time, forwards it to a Node.js backend over USB serial, and displays it on a live web dashboard.

---

## Hardware Used

| Component | Purpose | Notes |
|-----------|---------|-------|
| **ESP32 DevKit V1** | Microcontroller | Main brain of the neckband |
| **MAX30102** | Heart rate / pulse detection | Connected via I2C (SDA=GPIO21, SCL=GPIO22) |
| **DHT11** | Body temperature + ambient humidity | Connected to GPIO27 |
| **NEO-6M GPS Module** | Animal location tracking | Connected via UART2 (RX2=GPIO16, TX2=GPIO17) |
| **Lithium-Ion Battery (3.7V)** | Independent power supply | 2000–3000 mAh recommended for ~12h runtime |
| **TP4056 Charging Module** | Battery charging + protection | USB-C input, B+/B- to battery, OUT+/OUT- to ESP32 VIN |
| USB Cable | Serial data output to PC/server (tethered mode) | 115200 baud |

### Wiring Summary

```
── MAX30102 (I2C) ──────────────────────────────────
ESP32 GPIO21  →  MAX30102 SDA
ESP32 GPIO22  →  MAX30102 SCL
ESP32 3.3V    →  MAX30102 VIN
ESP32 GND     →  MAX30102 GND

── DHT11 (Digital) ─────────────────────────────────
ESP32 GPIO27  →  DHT11 DATA
ESP32 3.3V    →  DHT11 VCC
ESP32 GND     →  DHT11 GND

── NEO-6M GPS (UART2) ──────────────────────────────
ESP32 GPIO16 (RX2)  →  NEO-6M TX
ESP32 GPIO17 (TX2)  →  NEO-6M RX
ESP32 3.3V          →  NEO-6M VCC
ESP32 GND           →  NEO-6M GND

── Power (Independent / Battery Mode) ──────────────
Li-Ion Battery +    →  TP4056 B+
Li-Ion Battery -    →  TP4056 B-
TP4056 OUT+         →  ESP32 VIN (or 5V pin via step-up if needed)
TP4056 OUT-         →  ESP32 GND

Note: ESP32 DevKit V1 accepts 5V on VIN. If using 3.7V Li-Ion
directly, use a MT3608 boost converter (3.7V → 5V) between
TP4056 OUT+ and ESP32 VIN for stable operation.
```

---

## Arduino Code (`iotcode.ino`)

**Location:** `arduino code/iotcode.ino`

**Libraries required** (install via Arduino Library Manager):
- `SparkFun MAX3010x Pulse and Proximity Sensor Library`
- `DHT sensor library` (Adafruit)
- `Adafruit Unified Sensor`
- `TinyGPS++` (by Mikal Hart) — for parsing NMEA sentences from NEO-6M

### What it does

- Reads **DHT11** every 2 seconds → temperature (°C) + humidity (%)
- Reads **MAX30102** every loop iteration for beat detection → calculates BPM using a 4-sample rolling average
- Reads **NEO-6M GPS** via `Serial2` (9600 baud) → latitude, longitude, speed, satellite count
- Emits a **single JSON line** over USB Serial every 2 seconds:

```json
{"temperature":38.5,"humidity":62.0,"heartRate":74,"lat":28.6139,"lng":77.2090,"speed":0.5,"satellites":6}
```

- USB Serial baud rate: **115200**
- GPS Serial2 baud rate: **9600** (NEO-6M default)
- Serial line delimiter: `\n`
- GPS fix typically takes **30–90 seconds** on cold start outdoors
- If no GPS fix yet, `lat`/`lng` fields are omitted from the JSON

### Thresholds in firmware

| Sensor | Valid range accepted |
|--------|---------------------|
| Heart Rate | 20 – 255 BPM |
| MAX30102 IR | > 50,000 (finger/skin contact confirmed) |
| GPS Fix | `gps.location.isValid()` must return true before lat/lng is included |
| GPS Speed | Reported in km/h (converted from knots by TinyGPS++) |

### Battery Life Estimates

| Battery Capacity | Estimated Runtime |
|-----------------|------------------|
| 1000 mAh | ~5–6 hours |
| 2000 mAh | ~10–12 hours |
| 3000 mAh | ~15–18 hours |

> ESP32 + MAX30102 + DHT11 + NEO-6M draws ~150–200 mA average in active mode.
> Deep sleep between readings can extend runtime to 2–3x.

---

## Serial Bridge (`serialBridge.js`)

**Location:** `backend/scripts/serialBridge.js`

A Node.js script that:
1. Opens the ESP32's USB COM port at 115200 baud
2. Parses JSON lines emitted by the ESP32
3. Buffers the latest sensor values
4. POSTs sensor data to the backend API every 2 seconds
5. Sends a heartbeat to the backend every 10 seconds (used for the "Sensor Device: On/Off" indicator on the dashboard)

### Run it

```bash
cd backend

# Auto-detect COM port (looks for Silicon Labs / FTDI / Espressif chips)
node scripts/serialBridge.js

# Or specify port manually
node scripts/serialBridge.js --port COM9
```

### Config inside the script

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | `http://127.0.0.1:8000` | Backend server URL |
| `BAUD_RATE` | `115200` | Must match the Arduino sketch |
| `POST_INTERVAL_MS` | `2000` | How often sensor data is POSTed |
| `HEARTBEAT_INTERVAL_MS` | `10000` | How often a heartbeat ping is sent |
| `DEVICE_ID` | `neckband_001` | Device identifier sent with each reading |

---

## Independent Operation Mode (WiFi)

When the neckband is deployed on a farm and not tethered to a PC, the ESP32 can be switched to **WiFi mode** — sending data directly to the backend over the local network instead of via USB serial.

In this mode:
- The `serialBridge.js` script is **not needed**
- The ESP32 connects to the farm WiFi and POSTs JSON directly to `http://<backend-ip>:8000/api/iot/sensors`
- GPS coordinates are included in each POST for real-time livestock location tracking
- The TP4056 + Li-Ion battery powers the unit completely wire-free

> To switch modes, change `#define MODE SERIAL` to `#define MODE WIFI` in the Arduino sketch and set your WiFi SSID/password credentials.

### Independent Mode Data Flow

```
[DHT11] ──┐
           ├──► ESP32 ──WiFi──► Node.js API ──► MongoDB
[MAX30102]─┤                          │
[NEO-6M]──┘                          ▼
[Li-Ion]──► (powers ESP32)    React Dashboard
```

---

## Backend (`Node.js + Express + MongoDB`)

**Location:** `backend/server.js`  
**Port:** `8000`

### Relevant API Routes (`/api/iot/...`)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/iot/sensors` | Save a sensor reading |
| `GET` | `/api/iot/sensors/latest` | Get most recent readings |
| `GET` | `/api/iot/sensors/by_animal` | Get readings for a specific animal |
| `POST` | `/api/iot/heartbeat` | Update device online status |
| `GET` | `/api/iot/status` | Check if IoT device is connected |
| `POST` | `/api/iot/rfid` | Log an RFID scan event |
| `GET` | `/api/iot/animals/by_rfid` | Look up animal by RFID tag |
| `GET` | `/api/iot/isolation-alerts` | List active health alerts |
| `PATCH` | `/api/iot/isolation-alerts/:id/resolve` | Resolve an alert |

### MongoDB Model — `IotSensorReading`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `animalId` | ObjectId | No | Linked animal (if RFID matched) |
| `rfidTag` | String | No | RFID tag ID (optional for serial-only mode) |
| `temperature` | Number | No | °C |
| `humidity` | Number | No | % |
| `heartRate` | Number | No | BPM |
| `latitude` | Number | No | GPS lat (decimal degrees) |
| `longitude` | Number | No | GPS lng (decimal degrees) |
| `speed` | Number | No | km/h from GPS |
| `satellites` | Number | No | GPS satellite count (fix quality indicator) |
| `sensorType` | String | No | TEMP / HUMID / HR / COMBINED |
| `deviceId` | String | No | e.g. `neckband_001` |
| `timestamp` | Date | No | Auto-set on insert |

### Auto-Alert Logic

The backend automatically creates an **isolation alert** if it detects a sustained unhealthy pattern across the last 5 readings (within 15 minutes):

- **Fever alert:** Temperature > 40°C in 60%+ of recent readings
- **Critical fever:** Temperature > 41.5°C
- **Stress alert:** Heart rate > 100 BPM in 60%+ of recent readings

### Device Online/Offline Detection

The backend tracks the last heartbeat timestamp. If no heartbeat is received within **15 seconds**, the device is marked **Offline** on the dashboard.

---

## Frontend Dashboard

**Location:** `frontend/src/pages/HerdWatch.jsx` (Live Animal Health page)

**Shows:**
- Server status (Online/Offline)
- Sensor Device status (On/Off — driven by heartbeat)
- Last reading timestamp
- Live cards: Body Temperature, Moisture in Air, Heartbeat (BPM)
- Historical chart with time filters: 1 Hour / 6 Hours / 24 Hours / 7 Days / Show All
- Per-animal filtering via dropdown

---

## Full Data Flow

**Tethered Mode (USB Serial):**
```
[DHT11] ──┐
           ├──► ESP32 (iotcode.ino) ──USB Serial──► serialBridge.js ──HTTP POST──► Node.js API ──► MongoDB
[MAX30102]─┤                                                                              │
[NEO-6M]──┘                                                                              ▼
[PC power]                                                                    React Dashboard (frontend)
```

**Independent Mode (WiFi + Battery):**
```
[DHT11] ──┐
           ├──► ESP32 (iotcode.ino) ──WiFi──► Node.js API ──► MongoDB
[MAX30102]─┤                                        │
[NEO-6M]──┘                                        ▼
[Li-Ion + TP4056]──► powers ESP32         React Dashboard (frontend)
```

---

## How to Run Everything

```bash
# 1. Start backend
cd backend
node server.js          # Starts on port 8000

# 2. Start serial bridge (in a separate terminal)
cd backend
node scripts/serialBridge.js    # Auto-detects ESP32 COM port

# 3. Start frontend
cd frontend
npm run dev
```

> Flash `arduino code/iotcode.ino` to the ESP32 via Arduino IDE before running the bridge.
