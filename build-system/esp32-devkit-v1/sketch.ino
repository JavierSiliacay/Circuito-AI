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