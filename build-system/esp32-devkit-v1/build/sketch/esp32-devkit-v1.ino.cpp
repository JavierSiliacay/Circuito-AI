#line 1 "C:\\Users\\User\\Desktop\\websites codebase\\Circuito AI\\circuito-ai\\build-system\\esp32-devkit-v1\\esp32-devkit-v1.ino"
#include <Arduino.h>

// Define LED pin for ESP32 Built-in LED
const int ledPin = 2;

#line 6 "C:\\Users\\User\\Desktop\\websites codebase\\Circuito AI\\circuito-ai\\build-system\\esp32-devkit-v1\\esp32-devkit-v1.ino"
void setup();
#line 13 "C:\\Users\\User\\Desktop\\websites codebase\\Circuito AI\\circuito-ai\\build-system\\esp32-devkit-v1\\esp32-devkit-v1.ino"
void loop();
#line 6 "C:\\Users\\User\\Desktop\\websites codebase\\Circuito AI\\circuito-ai\\build-system\\esp32-devkit-v1\\esp32-devkit-v1.ino"
void setup() {
  // Initialize Serial Monitor
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);
  Serial.println("System Initialized...");
}

void loop() {
  // Turn the LED on
  digitalWrite(ledPin, HIGH);
  Serial.println("LED Status: ON");
  delay(1000);

  // Turn the LED off
  digitalWrite(ledPin, LOW);
  Serial.println("LED Status: OFF");
  delay(1000);
}
#line 1 "C:\\Users\\User\\Desktop\\websites codebase\\Circuito AI\\circuito-ai\\build-system\\esp32-devkit-v1\\sketch.ino"
#include <Arduino.h>

// Define LED pin for ESP32 Built-in LED
const int ledPin = 2;

void setup() {
  // Initialize Serial Monitor
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);
  Serial.println("System Initialized...");
}

void loop() {
  // Turn the LED on
  digitalWrite(ledPin, HIGH);
  Serial.println("LED Status: ON");
  delay(1000);

  // Turn the LED off
  digitalWrite(ledPin, LOW);
  Serial.println("LED Status: OFF");
  delay(1000);
}
