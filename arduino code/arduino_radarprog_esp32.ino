  // Includes the ESP32 Servo library (install "ESP32Servo" by Kevin Harrington via Library Manager)
  #include <ESP32Servo.h>
  // Defines Trig and Echo pins of the Ultrasonic Sensor
  // NOTE: HC-SR04 ECHO outputs 5V — use a voltage divider (5V→3.3V) on echoPin for ESP32 safety
  const int trigPin = 5;
  const int echoPin = 18;
  // Defines the buzzer pin
  const int buzzerPin = 19;
  // Variables for the duration and the distance
  long duration;
  int distance;
  Servo myServo; // Creates a servo object for controlling the servo motor
  // Blocks servo sweep and buzzes continuously until object moves away
  void waitForClear() {
    Serial.println("[ALERT] Object detected! Waiting for it to move away...");
    digitalWrite(buzzerPin, HIGH);
    while (true) {
      int d = calculateDistance();
      if (d > 10) {                  // only resume when object is truly gone (>10 cm)
        break;
      }
      Serial.print("[BLOCKED] Distance: "); Serial.print(d); Serial.println(" cm");
      delay(100); // re-check every 100ms
    }
    digitalWrite(buzzerPin, LOW);
    Serial.println("[CLEAR] Object removed. Resuming sweep.");
  }

  void setup() {
    pinMode(trigPin, OUTPUT); // Sets the trigPin as an Output
    pinMode(echoPin, INPUT); // Sets the echoPin as an Input
    pinMode(buzzerPin, OUTPUT); // Sets the buzzerPin as an Output
    digitalWrite(buzzerPin, LOW); // Ensure buzzer is off initially
    Serial.begin(115200);
    myServo.attach(21); // Defines on which pin is the servo motor attached
  }
  void loop() {
    // rotates the servo motor from 15 to 165 degrees
    for(int i=15;i<=165;i+=10){  
    myServo.write(i);
    delay(30);
    distance = calculateDistance();// Calls a function for calculating the distance measured by the Ultrasonic sensor for each degree
    
    // Pause sweep and buzz until object clears
    if(distance < 10 && distance > 0){
      waitForClear();
    }
    
    Serial.print(i); // Sends the current degree into the Serial Port
    Serial.print(","); // Sends addition character right next to the previous value needed later in the Processing IDE for indexing
    Serial.print(distance); // Sends the distance value into the Serial Port
    Serial.print("."); // Sends addition character right next to the previous value needed later in the Processing IDE for indexing
    Serial.print(" [Angle: "); Serial.print(i); Serial.print("deg | Distance: "); Serial.print(distance); Serial.println(" cm]");
    }
    // Repeats the previous lines from 165 to 15 degrees
    for(int i=165;i>15;i-=10){  
    myServo.write(i);
    delay(30);
    distance = calculateDistance();
    
    // Pause sweep and buzz until object clears
    if(distance < 10 && distance > 0){
      waitForClear();
    }

    Serial.print(i);
    Serial.print(",");
    Serial.print(distance);
    Serial.print(".");
    Serial.print(" [Angle: "); Serial.print(i); Serial.print("deg | Distance: "); Serial.print(distance); Serial.println(" cm]");
    }
  }
  // Function for calculating the distance measured by the Ultrasonic sensor
  int calculateDistance(){ 
    
    digitalWrite(trigPin, LOW); 
    delayMicroseconds(2);
    // Sets the trigPin on HIGH state for 10 micro seconds
    digitalWrite(trigPin, HIGH); 
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    duration = pulseIn(echoPin, HIGH, 30000); // 30ms timeout (prevents hanging)
    if(duration == 0){
      return 0; // No echo received
    }
    distance = duration * 0.034 / 2;
    return distance;
  }
