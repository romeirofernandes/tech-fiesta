/*
 * ================================================================
 *  SENSOR CONNECTION TEST
 *  - MAX30102 : Red + IR LED full brightness → should glow red
 *  - DHT11    : Reads temp/humidity every 2s → prints to Serial
 *  - ESP32 built-in LED (GPIO 2) blinks on every successful read
 *
 *  Connections: same as iotcode.ino
 *    DHT11 DATA → GPIO 4
 *    MAX30102 SDA → GPIO 21, SCL → GPIO 22
 * ================================================================
 */

#include <Wire.h>
#include "MAX30105.h"
#include "DHT.h"

#define DHTPIN      4
#define DHTTYPE     DHT11
#define BUILTIN_LED 2   // ESP32 DevKit V1 onboard LED

DHT      dht(DHTPIN, DHTTYPE);
MAX30105 particleSensor;

// I2C Scanner — finds any device on the bus and prints its address
void scanI2C() {
  Serial.println("\n[I2C SCAN] Scanning all addresses (0x01 to 0x7F)...");
  int found = 0;
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    byte err = Wire.endTransmission();
    if (err == 0) {
      Serial.print("[I2C SCAN] Device FOUND at address 0x");
      if (addr < 16) Serial.print("0");
      Serial.println(addr, HEX);
      found++;
    }
  }
  if (found == 0) {
    Serial.println("[I2C SCAN] NO devices found — SDA/SCL wiring problem!");
    Serial.println("           Double-check: SDA→GPIO21, SCL→GPIO22, VIN→3V3, GND→GND");
  } else {
    Serial.print("[I2C SCAN] Total devices found: ");
    Serial.println(found);
    Serial.println("           MAX30102 should appear at 0x57");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(BUILTIN_LED, OUTPUT);
  digitalWrite(BUILTIN_LED, LOW);

  Serial.println("\n========== SENSOR CONNECTION TEST ==========");

  // ── I2C Scanner first — diagnose MAX30102 wiring ──────────
  Wire.begin(21, 22);
  scanI2C();

  // ── MAX30102 ──────────────────────────────────────────────
  Serial.print("\n[MAX30102] Initialising... ");
  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {  // slower speed, more stable
    Serial.println("NOT FOUND ❌");
    Serial.println("           Possible fixes:");
    Serial.println("           1. VIN → 3V3 (NOT 5V, NOT VIN)");
    Serial.println("           2. SDA → GPIO 21");
    Serial.println("           3. SCL → GPIO 22");
    Serial.println("           4. GND → GND");
    Serial.println("           5. Check if I2C scan above found 0x57");
  } else {
    Serial.println("FOUND ✅");
    particleSensor.setup(0);
    particleSensor.setPulseAmplitudeRed(0xFF);
    particleSensor.setPulseAmplitudeIR(0xFF);
    particleSensor.setPulseAmplitudeGreen(0);
    Serial.println("[MAX30102] Red LED → FULL brightness. You should see RED glow now.");
  }

  // ── DHT11 ─────────────────────────────────────────────────
  dht.begin();
  Serial.println("\n[DHT11]   Working ✅ — reading every 2 seconds...");
  Serial.println("============================================\n");
}

void loop() {
  delay(2000);

  // Re-run I2C scan every loop so you don't miss it
  scanI2C();

  // Try MAX30102
  Serial.print("[MAX30102] Initialising... ");
  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("NOT FOUND ❌");
  } else {
    Serial.println("FOUND ✅ — RED LED ON");
    particleSensor.setup(0);
    particleSensor.setPulseAmplitudeRed(0xFF);
    particleSensor.setPulseAmplitudeIR(0xFF);
    particleSensor.setPulseAmplitudeGreen(0);
  }

  // DHT11
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  if (isnan(h) || isnan(t)) {
    Serial.println("[DHT11] ❌  Read FAILED");
  } else {
    Serial.print("[DHT11] ✅  Temp: ");
    Serial.print(t, 1);
    Serial.print(" °C  |  Humidity: ");
    Serial.print(h, 1);
    Serial.println(" %");
    digitalWrite(BUILTIN_LED, HIGH);
    delay(100);
    digitalWrite(BUILTIN_LED, LOW);
  }
  Serial.println("--------------------------------------------");
}
