#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "DHT.h"

// RFID Pins
#define SS_PIN  5
#define RST_PIN 27

// DHT11 Pins
#define DHTPIN 4
#define DHTTYPE DHT11

// MAX30102 uses default I2C pins (SDA=21, SCL=22)

MFRC522 mfrc522(SS_PIN, RST_PIN);
MAX30105 particleSensor;
DHT dht(DHTPIN, DHTTYPE);

// State management
bool cardScanned = false;
String currentUID = "";

// Heart rate calculation variables
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute;
int beatAvg;

// Timing for sensor readings
unsigned long lastDHTRead = 0;
const unsigned long DHT_INTERVAL = 2000;  // Read DHT every 2 seconds

unsigned long lastHeartRateRead = 0;
const unsigned long HR_INTERVAL = 100;    // Check heart rate every 100ms

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Initialize SPI for RFID
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("RC522 RFID Reader Initialized");

  // Initialize I2C for MAX30102
  Wire.begin(21, 22);
  
  // Initialize MAX30102
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not found. Please check wiring.");
  } else {
    Serial.println("MAX30102 Heart Rate Sensor Initialized");
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
  }

  // Initialize DHT11
  dht.begin();
  Serial.println("DHT11 Temperature & Humidity Sensor Initialized");

  Serial.println("\n========================================");
  Serial.println("Tap an RFID card to start vital monitoring...");
  Serial.println("========================================\n");
}

void loop() {
  if (!cardScanned) {
    // Wait for RFID card scan
    scanRFIDCard();
  } else {
    // Card has been scanned, now read vitals
    readVitals();
    
    // Check for new card tap to reset/switch user
    checkForNewCard();
  }
}

void scanRFIDCard() {
  // Look for new card
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Select the card
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Build UID string
  currentUID = "";
  Serial.print("\n>>> RFID Card Detected! UID: ");
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    Serial.print(mfrc522.uid.uidByte[i] < 0x10 ? " 0" : " ");
    Serial.print(mfrc522.uid.uidByte[i], HEX);
    if (mfrc522.uid.uidByte[i] < 0x10) currentUID += "0";
    currentUID += String(mfrc522.uid.uidByte[i], HEX);
  }
  Serial.println();

  // Stop reading
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();

  // Set card as scanned
  cardScanned = true;
  
  Serial.println("\n========================================");
  Serial.println("Starting Vital Signs Monitoring...");
  Serial.println("Place your finger on the MAX30102 sensor");
  Serial.println("Tap another card to switch user");
  Serial.println("========================================\n");
  
  delay(1000);
}

void readVitals() {
  unsigned long currentMillis = millis();
  
  // Read DHT11 (Temperature & Humidity)
  if (currentMillis - lastDHTRead >= DHT_INTERVAL) {
    lastDHTRead = currentMillis;
    readDHT11();
  }
  
  // Read MAX30102 (Heart Rate)
  readHeartRate();
}

void readDHT11() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();  // Celsius
  float temperatureF = dht.readTemperature(true);  // Fahrenheit

  Serial.println("--- DHT11 Reading ---");
  
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read from DHT11 sensor!");
  } else {
    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.print(" °C / ");
    Serial.print(temperatureF);
    Serial.println(" °F");
    
    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
    
    // Calculate heat index
    float heatIndex = dht.computeHeatIndex(temperature, humidity, false);
    Serial.print("Heat Index: ");
    Serial.print(heatIndex);
    Serial.println(" °C");
  }
  Serial.println();
}

void readHeartRate() {
  long irValue = particleSensor.getIR();
  
  if (irValue > 50000) {  // Finger is detected
    if (checkForBeat(irValue) == true) {
      long delta = millis() - lastBeat;
      lastBeat = millis();
      
      beatsPerMinute = 60 / (delta / 1000.0);
      
      if (beatsPerMinute < 255 && beatsPerMinute > 20) {
        rates[rateSpot++] = (byte)beatsPerMinute;
        rateSpot %= RATE_SIZE;
        
        // Calculate average
        beatAvg = 0;
        for (byte x = 0; x < RATE_SIZE; x++) {
          beatAvg += rates[x];
        }
        beatAvg /= RATE_SIZE;
        
        Serial.println("--- Heart Rate Reading ---");
        Serial.print("BPM: ");
        Serial.print(beatsPerMinute);
        Serial.print(" | Avg BPM: ");
        Serial.println(beatAvg);
        Serial.println();
      }
    }
  } else {
    // No finger detected - print occasionally
    static unsigned long lastNoFingerMsg = 0;
    if (millis() - lastNoFingerMsg > 3000) {
      lastNoFingerMsg = millis();
      Serial.println("No finger detected on heart rate sensor...");
      beatAvg = 0;
      beatsPerMinute = 0;
    }
  }
}

void checkForNewCard() {
  // Check if a new card is tapped to switch user
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    String newUID = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      if (mfrc522.uid.uidByte[i] < 0x10) newUID += "0";
      newUID += String(mfrc522.uid.uidByte[i], HEX);
    }
    
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    
    if (newUID != currentUID) {
      Serial.println("\n========================================");
      Serial.println("New card detected! Switching user...");
      Serial.println("========================================");
      cardScanned = false;
      
      // Reset heart rate data
      beatAvg = 0;
      beatsPerMinute = 0;
      for (byte i = 0; i < RATE_SIZE; i++) rates[i] = 0;
    }
  }
}
