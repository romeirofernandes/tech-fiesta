/*
 * ================================================================
 *  NECKBAND VITALS MONITOR — ESP32 (Serial Mode)
 *  Sensors : DHT11 (temp + humidity) | MAX30102 (heart rate)
 *  Output  : JSON lines over USB Serial → serialBridge.js picks
 *            them up and forwards to the backend.
 *  No WiFi, no HTTP, no RFID logic required on this device.
 *
 *  Required Arduino libraries (install via Library Manager):
 *    - SparkFun MAX3010x Pulse and Proximity Sensor Library
 *    - DHT sensor library (Adafruit)
 *    - Adafruit Unified Sensor
 * ================================================================
 */

#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "DHT.h"

// ── DHT11 ────────────────────────────────────────────────────
#define DHTPIN  27        // GPIO27 — left side of ESP32 DevKit V1
#define DHTTYPE DHT11

// ── MAX30102 — default I2C pins on ESP32 (SDA=21, SCL=22) ────

// ── Timing (ms) ──────────────────────────────────────────────
const unsigned long DHT_INTERVAL    = 2000;  // read DHT every 2 s
const unsigned long PRINT_INTERVAL  = 2000;  // emit JSON every 2 s

// ─────────────────────────────────────────────────────────────

DHT       dht(DHTPIN, DHTTYPE);
MAX30105  particleSensor;

// Heart rate buffers
const byte RATE_SIZE = 4;
byte  rates[RATE_SIZE];
byte  rateSpot       = 0;
long  lastBeat       = 0;
float beatsPerMinute = 0;
int   beatAvg        = 0;

// Latest sensor values
float latestTemp     = NAN;
float latestHumidity = NAN;
int   latestHR       = 0;

// Timers
unsigned long lastDHTRead = 0;
unsigned long lastPrint   = 0;

// ─────────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== Neckband Vitals Monitor (Serial Mode) ===");

  // Initialise MAX30102 via I2C
  Wire.begin(21, 22);
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("[ERROR] MAX30102 not found — check wiring!");
  } else {
    Serial.println("[OK] MAX30102 initialised");
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
  }

  // Initialise DHT11
  dht.begin();
  Serial.println("[OK] DHT11 initialised");
  Serial.println("[INFO] Emitting JSON lines — connect serialBridge.js to forward to backend\n");
}

// ─────────────────────────────────────────────────────────────
//  LOOP
// ─────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // Read DHT11 every DHT_INTERVAL
  if (now - lastDHTRead >= DHT_INTERVAL) {
    lastDHTRead = now;
    readDHT11();
  }

  // Read MAX30102 every loop iteration (beat detection must be fast)
  readHeartRate();

  // Emit one JSON line every PRINT_INTERVAL
  if (now - lastPrint >= PRINT_INTERVAL) {
    lastPrint = now;
    printJSON();
  }
}

// ─────────────────────────────────────────────────────────────
//  DHT11 — Temperature & Humidity
// ─────────────────────────────────────────────────────────────
void readDHT11() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();  // Celsius

  if (isnan(h) || isnan(t)) {
    Serial.println("[DHT11] Read failed — sensor error");
    return;
  }

  latestTemp     = t;
  latestHumidity = h;
}

// ─────────────────────────────────────────────────────────────
//  MAX30102 — Heart Rate
// ─────────────────────────────────────────────────────────────
void readHeartRate() {
  long irValue = particleSensor.getIR();

  if (irValue > 50000) {  // Sensor contact detected
    if (checkForBeat(irValue)) {
      long delta     = millis() - lastBeat;
      lastBeat       = millis();
      beatsPerMinute = 60.0 / (delta / 1000.0);

      if (beatsPerMinute > 20 && beatsPerMinute < 255) {
        rates[rateSpot++] = (byte)beatsPerMinute;
        rateSpot %= RATE_SIZE;

        beatAvg = 0;
        for (byte x = 0; x < RATE_SIZE; x++) beatAvg += rates[x];
        beatAvg /= RATE_SIZE;

        latestHR = beatAvg;
      }
    }
  } else {
    latestHR = 0;
  }
}

// ─────────────────────────────────────────────────────────────
//  Emit a JSON object on one line for serialBridge.js to parse
//  Format: {"temperature":38.5,"humidity":62.0,"heartRate":74}
// ─────────────────────────────────────────────────────────────
void printJSON() {
  Serial.print("{");

  bool first = true;

  if (!isnan(latestTemp)) {
    Serial.print("\"temperature\":");
    Serial.print(latestTemp, 1);
    first = false;
  }

  if (!isnan(latestHumidity)) {
    if (!first) Serial.print(",");
    Serial.print("\"humidity\":");
    Serial.print(latestHumidity, 1);
    first = false;
  }

  if (latestHR > 0) {
    if (!first) Serial.print(",");
    Serial.print("\"heartRate\":");
    Serial.print(latestHR);
  }

  Serial.println("}");
}
