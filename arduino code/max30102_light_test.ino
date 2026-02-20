/*
 * ================================================================
 *  MAX30102 LED LIGHT TEST — ESP32
 *  Goal: bas red LED jalao, kuch nahi
 *  Tries multiple I2C pin combinations automatically
 * ================================================================
 */

#include <Wire.h>
#include "MAX30105.h"

MAX30105 particleSensor;

// Try karne ke liye 4 combinations
struct PinCombo {
  int sda;
  int scl;
};

PinCombo combos[] = {
  {21, 22},  // standard
  {22, 21},  // swapped
  {16, 17},  // alternate
  {4,  5},   // alternate 2
};

bool lightOn = false;

void tryCombo(int sda, int scl) {
  Serial.print("Trying SDA=");
  Serial.print(sda);
  Serial.print(" SCL=");
  Serial.print(scl);
  Serial.print(" ... ");

  Wire.end();
  delay(100);
  Wire.begin(sda, scl);
  delay(100);

  // I2C scan first
  Wire.beginTransmission(0x57);
  byte err = Wire.endTransmission();

  if (err == 0) {
    Serial.println("DEVICE FOUND at 0x57! ✅");

    if (particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
      // Kill all LEDs first then ramp up red
      particleSensor.setup(0);
      particleSensor.setPulseAmplitudeRed(0);
      particleSensor.setPulseAmplitudeIR(0);
      particleSensor.setPulseAmplitudeGreen(0);
      delay(200);

      // Now full brightness red
      particleSensor.setPulseAmplitudeRed(0xFF);
      particleSensor.setPulseAmplitudeIR(0x7F);

      Serial.println(">>> RED LED IS ON — look at sensor NOW <<<");
      lightOn = true;
    } else {
      Serial.println("begin() failed even though device found — retrying...");
    }
  } else {
    Serial.print("not found (err=");
    Serial.print(err);
    Serial.println(")");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println("\n====== MAX30102 LED LIGHT TEST ======");
  Serial.println("Trying all SDA/SCL combinations...\n");

  for (int i = 0; i < 4 && !lightOn; i++) {
    tryCombo(combos[i].sda, combos[i].scl);
    delay(500);
  }

  if (!lightOn) {
    Serial.println("\n====== ALL COMBINATIONS FAILED ======");
    Serial.println("Possible reasons:");
    Serial.println("  1. Loose wire — push wires firmly into ESP32 pins");
    Serial.println("  2. Wrong pin — double check physical pin labels on board");
    Serial.println("  3. Power issue — try VIN instead of 3V3 (or vice versa)");
    Serial.println("  4. Dead sensor — if you ever connected VIN to 5V, sensor may be fried");
  }
}

void loop() {
  if (lightOn) {
    // Keep LED alive + pulse it so you can see it breathing
    for (int brightness = 0x10; brightness <= 0xFF; brightness += 10) {
      particleSensor.setPulseAmplitudeRed(brightness);
      delay(20);
    }
    for (int brightness = 0xFF; brightness >= 0x10; brightness -= 10) {
      particleSensor.setPulseAmplitudeRed(brightness);
      delay(20);
    }
  }
  // If not found, do nothing
}
