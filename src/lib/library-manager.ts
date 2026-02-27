// ==============================================================
// Arduino Library Manager — Real Library Data
// ==============================================================
// Parsed from the user's actual Arduino IDE libraries folder at:
//   C:\Users\User\Documents\Arduino\libraries
// Each entry corresponds to a real installed library with data
// from its library.properties file.
// ==============================================================

export interface ArduinoLibrary {
    id: string;
    name: string;
    version: string;
    author: string;
    category: string;
    architectures: string[];
    includes: string[];
    description: string;
    installed: boolean;
    url?: string;
}

// All libraries from the user's Arduino IDE installation
const ALL_LIBRARIES: ArduinoLibrary[] = [
    // ======================== SENSORS ========================
    {
        id: 'adafruit-mpu6050',
        name: 'Adafruit MPU6050',
        version: '2.2.6',
        author: 'Adafruit',
        category: 'Sensors',
        architectures: ['*'],
        includes: ['Adafruit_MPU6050.h'],
        description: 'Arduino library for the MPU6050 accelerometer/gyroscope sensors.',
        installed: true,
    },
    {
        id: 'adafruit-ina219',
        name: 'Adafruit INA219',
        version: '1.2.3',
        author: 'Adafruit',
        category: 'Sensors',
        architectures: ['*'],
        includes: ['Adafruit_INA219.h'],
        description: 'INA219 Current Sensor library.',
        installed: true,
    },
    {
        id: 'adafruit-unified-sensor',
        name: 'Adafruit Unified Sensor',
        version: '1.1.15',
        author: 'Adafruit',
        category: 'Sensors',
        architectures: ['*'],
        includes: ['Adafruit_Sensor.h'],
        description: 'Required for all Adafruit Unified Sensor based libraries.',
        installed: true,
    },
    {
        id: 'adafruit-tsc2007',
        name: 'Adafruit TSC2007',
        version: '1.1.2',
        author: 'Adafruit',
        category: 'Sensors',
        architectures: ['*'],
        includes: ['Adafruit_TSC2007.h'],
        description: 'Arduino library for the TSC2007 resistive touch screen drivers.',
        installed: true,
    },
    {
        id: 'dht11',
        name: 'DHT11',
        version: '2.1.0',
        author: 'Dhruba Saha',
        category: 'Sensors',
        architectures: ['*'],
        includes: ['DHT11.h'],
        description: 'An Arduino library for the DHT11 temperature and humidity sensor.',
        installed: true,
    },
    {
        id: 'dht-sensor-library',
        name: 'DHT sensor library',
        version: '1.4.6',
        author: 'Adafruit',
        category: 'Sensors',
        architectures: ['*'],
        includes: ['DHT.h'],
        description: 'Arduino library for DHT11, DHT22, etc Temp & Humidity Sensors.',
        installed: true,
    },
    {
        id: 'dhtlib',
        name: 'DHTlib',
        version: '0.1.36',
        author: 'Rob Tillaart',
        category: 'Sensors',
        architectures: ['avr'],
        includes: ['dht.h'],
        description: 'AVR Optimized Library for DHT Temperature & Humidity Sensor on AVR only.',
        installed: true,
    },
    {
        id: 'dallas-temperature',
        name: 'DallasTemperature',
        version: '4.0.3',
        author: 'Miles Burton et al.',
        category: 'Sensors',
        architectures: ['*'],
        includes: ['DallasTemperature.h'],
        description: 'Arduino library for Dallas/Maxim temperature ICs (DS18B20, etc.).',
        installed: true,
    },
    {
        id: 'hx711',
        name: 'HX711',
        version: '0.6.3',
        author: 'Rob Tillaart',
        category: 'Sensors',
        architectures: ['*'],
        includes: ['HX711.h'],
        description: 'Arduino library for HX711 load cell amplifier.',
        installed: true,
    },
    {
        id: 'hx711-adc',
        name: 'HX711_ADC',
        version: '1.2.12',
        author: 'Olav Kallhovd',
        category: 'Sensors',
        architectures: ['*'],
        includes: ['HX711_ADC.h'],
        description: 'Library for the HX711 24-bit ADC for weight scales.',
        installed: true,
    },
    {
        id: 'newping',
        name: 'NewPing',
        version: '1.9.7',
        author: 'Tim Eckel',
        category: 'Sensors',
        architectures: ['avr', 'arm', 'megaavr', 'esp32'],
        includes: ['NewPing.h'],
        description: 'Ultrasonic sensor library — simple, fast & powerful.',
        installed: true,
    },
    {
        id: 'tinygps',
        name: 'TinyGPS',
        version: '13.0.0',
        author: 'Mikal Hart',
        category: 'Sensors',
        architectures: ['*'],
        includes: ['TinyGPS.h'],
        description: 'A compact Arduino NMEA (GPS) parsing library.',
        installed: true,
    },
    {
        id: 'tinygpsplus',
        name: 'TinyGPSPlus',
        version: '1.0.3',
        author: 'Mikal Hart',
        category: 'Sensors',
        architectures: ['*'],
        includes: ['TinyGPS++.h'],
        description: 'Object-oriented parsing of GPS (NMEA) sentences.',
        installed: true,
    },

    // ======================== DISPLAY ========================
    {
        id: 'adafruit-gfx',
        name: 'Adafruit GFX Library',
        version: '1.12.4',
        author: 'Adafruit',
        category: 'Display',
        architectures: ['*'],
        includes: ['Adafruit_GFX.h'],
        description: 'Core graphics library — all other Adafruit display drivers derive from this.',
        installed: true,
    },
    {
        id: 'adafruit-ssd1306',
        name: 'Adafruit SSD1306',
        version: '2.5.16',
        author: 'Adafruit',
        category: 'Display',
        architectures: ['*'],
        includes: ['Adafruit_SSD1306.h'],
        description: 'SSD1306 OLED driver for 128x64 and 128x32 displays.',
        installed: true,
    },
    {
        id: 'adafruit-sh110x',
        name: 'Adafruit SH110X',
        version: '2.1.12',
        author: 'Adafruit',
        category: 'Display',
        architectures: ['*'],
        includes: ['Adafruit_SH110X.h'],
        description: 'SH110X OLED driver for SH1107/SH1106G displays.',
        installed: true,
    },
    {
        id: 'adafruit-ili9341',
        name: 'Adafruit ILI9341',
        version: '1.6.1',
        author: 'Adafruit',
        category: 'Display',
        architectures: ['*'],
        includes: ['Adafruit_ILI9341.h'],
        description: 'Library for Adafruit ILI9341 TFT displays.',
        installed: true,
    },
    {
        id: 'adafruit-neopixel',
        name: 'Adafruit NeoPixel',
        version: '1.12.4',
        author: 'Adafruit',
        category: 'Display',
        architectures: ['*'],
        includes: ['Adafruit_NeoPixel.h'],
        description: 'Arduino library for controlling single-wire LED pixels and strips (WS2812, etc.).',
        installed: true,
    },
    {
        id: 'adafruit-stmpe610',
        name: 'Adafruit STMPE610',
        version: '1.1.6',
        author: 'Adafruit',
        category: 'Display',
        architectures: ['*'],
        includes: ['Adafruit_STMPE610.h'],
        description: 'STMPE610/811 resistive touch screen controller.',
        installed: true,
    },
    {
        id: 'adafruit-touchscreen',
        name: 'Adafruit TouchScreen',
        version: '1.1.5',
        author: 'Adafruit',
        category: 'Display',
        architectures: ['*'],
        includes: ['TouchScreen.h'],
        description: 'Adafruit TouchScreen display library.',
        installed: true,
    },
    {
        id: 'tft-espi',
        name: 'TFT_eSPI',
        version: '2.5.43',
        author: 'Bodmer',
        category: 'Display',
        architectures: ['*'],
        includes: ['TFT_eSPI.h'],
        description: 'TFT graphics library with optimizations for RP2040, STM32, ESP8266 and ESP32.',
        installed: true,
    },
    {
        id: 'u8g2',
        name: 'U8g2',
        version: '2.35.30',
        author: 'Oliver Kraus',
        category: 'Display',
        architectures: ['*'],
        includes: ['U8g2lib.h'],
        description: 'Monochrome LCD, OLED and eInk Library. Supports SSD1306, SH1106, ST7920, and many more.',
        installed: true,
    },
    {
        id: 'liquidcrystal',
        name: 'LiquidCrystal',
        version: '1.0.7',
        author: 'Arduino, Adafruit',
        category: 'Display',
        architectures: ['*'],
        includes: ['LiquidCrystal.h'],
        description: 'Communication with alphanumeric LCD displays (HD44780 compatible).',
        installed: true,
    },
    {
        id: 'liquidcrystal-i2c',
        name: 'LiquidCrystal_I2C',
        version: '2.0.0',
        author: 'Frank de Brabander',
        category: 'Display',
        architectures: ['*'],
        includes: ['LiquidCrystal_I2C.h'],
        description: 'A library for I2C LCD displays (PCF8574 backpack).',
        installed: true,
    },
    {
        id: 'sh1106',
        name: 'SH1106',
        version: '2.0.0',
        author: 'Laura Kirsch',
        category: 'Display',
        architectures: ['*'],
        includes: ['SH1106.h'],
        description: 'Adafruit GFX compatible library for the SH1106 OLED driver.',
        installed: true,
    },
    {
        id: 'ili9488',
        name: 'ILI9488',
        version: '1.0.2',
        author: 'Jaret Burkett',
        category: 'Display',
        architectures: ['*'],
        includes: ['ILI9488.h'],
        description: 'Library for ILI9488 TFT displays.',
        installed: true,
    },
    {
        id: 'ili9341-t3n',
        name: 'ILI9341_t3n',
        version: '1.1.1',
        author: 'Paul Stoffregen et al.',
        category: 'Display',
        architectures: ['*'],
        includes: ['ILI9341_t3n.h'],
        description: 'Optimized ILI9341 (320x240 Color TFT) with multi-SPI bus support.',
        installed: true,
    },
    {
        id: 'jpeg-decoder',
        name: 'JPEGDecoder',
        version: '2.0.0',
        author: 'Bodmer',
        category: 'Display',
        architectures: ['*'],
        includes: ['JPEGDecoder.h'],
        description: 'JPEG decoder for Arduino Mega, Due, and ESP8266/ESP32.',
        installed: true,
    },
    {
        id: 'gfx-library-arduino',
        name: 'GFX Library for Arduino',
        version: '1.6.3',
        author: 'Moon On Our Nation',
        category: 'Display',
        architectures: ['*'],
        includes: ['Arduino_GFX.h'],
        description: 'GFX library for various color displays with various data bus interfaces.',
        installed: true,
    },
    {
        id: 'xpt2046-touchscreen',
        name: 'XPT2046_Touchscreen',
        version: '1.4',
        author: 'Paul Stoffregen',
        category: 'Display',
        architectures: ['*'],
        includes: ['XPT2046_Touchscreen.h'],
        description: 'Touchscreens using the XPT2046 controller chip.',
        installed: true,
    },
    {
        id: 'bonezegei-xpt2046',
        name: 'Bonezegei XPT2046',
        version: '1.0.1',
        author: 'Bonezegei',
        category: 'Display',
        architectures: ['esp32'],
        includes: ['Bonezegei_XPT2046.h'],
        description: 'Simple Library for XPT2046 Resistive Touch Controller.',
        installed: true,
    },
    {
        id: 'adafruit-epaper',
        name: 'Adafruit 4.01 Colour EPaper',
        version: '1.0.0',
        author: 'Kushagra Goel',
        category: 'Display',
        architectures: ['esp32', 'esp8266'],
        includes: ['Adafruit_4_01_ColourEPaper.h'],
        description: 'WaveShare 4.01 Colour ePaper display driver.',
        installed: true,
    },
    {
        id: 'adafruit-dma-neopixel',
        name: 'Adafruit DMA NeoPixel',
        version: '1.3.3',
        author: 'Adafruit',
        category: 'Display',
        architectures: ['samd'],
        includes: ['Adafruit_NeoPixel_ZeroDMA.h'],
        description: 'NeoPixel DMA on SAMD21 and SAMD51 microcontrollers.',
        installed: true,
    },

    // ======================== COMMUNICATION ========================
    {
        id: 'arduinojson',
        name: 'ArduinoJson',
        version: '7.3.0',
        author: 'Benoit Blanchon',
        category: 'Communication',
        architectures: ['*'],
        includes: ['ArduinoJson.h'],
        description: 'A simple and efficient JSON library for embedded C++.',
        installed: true,
    },
    {
        id: 'asynctcp',
        name: 'AsyncTCP',
        version: '1.1.4',
        author: 'dvarrel',
        category: 'Communication',
        architectures: ['esp32'],
        includes: ['AsyncTCP.h'],
        description: 'Async TCP Library for ESP32.',
        installed: true,
    },
    {
        id: 'espasyncwebserver',
        name: 'ESPAsyncWebServer',
        version: '3.1.0',
        author: 'lacamera',
        category: 'Communication',
        architectures: ['esp8266', 'esp32'],
        includes: ['ESPAsyncWebServer.h'],
        description: 'Async Web Server for ESP8266 and ESP32.',
        installed: true,
    },
    {
        id: 'esp-async-webserver',
        name: 'ESP Async WebServer',
        version: '3.7.2',
        author: 'ESP32Async',
        category: 'Communication',
        architectures: ['*'],
        includes: ['ESPAsyncWebServer.h'],
        description: 'Asynchronous HTTP and WebSocket Server for ESP32, ESP8266 and RP2040.',
        installed: true,
    },
    {
        id: 'websockets',
        name: 'WebSockets',
        version: '2.6.1',
        author: 'Markus Sattler',
        category: 'Communication',
        architectures: ['*'],
        includes: ['WebSocketsServer.h', 'WebSocketsClient.h'],
        description: 'WebSockets for Arduino (Server + Client).',
        installed: true,
    },
    {
        id: 'esp32-a2dp',
        name: 'ESP32-A2DP',
        version: '1.8.8',
        author: 'Phil Schatzmann',
        category: 'Communication',
        architectures: ['esp32'],
        includes: ['BluetoothA2DPSink.h', 'BluetoothA2DPSource.h'],
        description: 'Bluetooth A2DP Library for ESP32.',
        installed: true,
    },
    {
        id: 'nimble-arduino',
        name: 'NimBLE-Arduino',
        version: '2.2.3',
        author: 'h2zero',
        category: 'Communication',
        architectures: ['esp32'],
        includes: ['NimBLEDevice.h'],
        description: 'Bluetooth Low Energy (BLE) library based on NimBLE.',
        installed: true,
    },
    {
        id: 'irremote',
        name: 'IRremote',
        version: '4.4.1',
        author: 'shirriff, z3t0, ArminJo',
        category: 'Communication',
        architectures: ['avr', 'esp32', 'esp8266', 'samd', 'stm32', 'rp2040'],
        includes: ['IRremote.hpp'],
        description: 'Send and receive infrared signals with multiple protocols.',
        installed: true,
    },
    {
        id: 'rf24',
        name: 'RF24',
        version: '1.4.11',
        author: 'TMRh20',
        category: 'Communication',
        architectures: ['*'],
        includes: ['RF24.h'],
        description: 'Radio driver for nRF24L01(+) 2.4GHz wireless modules.',
        installed: true,
    },
    {
        id: 'blynk',
        name: 'Blynk',
        version: '1.3.2',
        author: 'Volodymyr Shymanskyy',
        category: 'Communication',
        architectures: ['*'],
        includes: ['Blynk.h'],
        description: 'Build a smartphone app for your IoT project in minutes!',
        installed: true,
    },
    {
        id: 'arduino-mqtt-client',
        name: 'ArduinoMqttClient',
        version: '0.1.8',
        author: 'Arduino',
        category: 'Communication',
        architectures: ['*'],
        includes: ['ArduinoMqttClient.h'],
        description: 'Send and receive MQTT messages using Arduino.',
        installed: true,
    },
    {
        id: 'arduino-http-client',
        name: 'ArduinoHttpClient',
        version: '0.6.1',
        author: 'Arduino',
        category: 'Communication',
        architectures: ['*'],
        includes: ['ArduinoHttpClient.h'],
        description: 'Easily interact with web servers, using HTTP and WebSockets.',
        installed: true,
    },
    {
        id: 'arduino-iot-cloud',
        name: 'ArduinoIoTCloud',
        version: '2.8.0',
        author: 'Arduino',
        category: 'Communication',
        architectures: ['esp32', 'esp8266', 'samd', 'mbed_nano'],
        includes: ['ArduinoIoTCloud.h'],
        description: 'Connect to the Arduino IoT Cloud service.',
        installed: true,
    },
    {
        id: 'oneWire',
        name: 'OneWire',
        version: '2.3.8',
        author: 'Paul Stoffregen et al.',
        category: 'Communication',
        architectures: ['*'],
        includes: ['OneWire.h'],
        description: 'Access 1-wire temperature sensors, memory and other chips.',
        installed: true,
    },
    {
        id: 'wifi101',
        name: 'WiFi101',
        version: '0.16.1',
        author: 'Arduino',
        category: 'Communication',
        architectures: ['*'],
        includes: ['WiFi101.h'],
        description: 'Network driver for ATMEL WINC1500 (WiFi Shield 101).',
        installed: true,
    },
    {
        id: 'wifinina',
        name: 'WiFiNINA',
        version: '1.9.1',
        author: 'Arduino',
        category: 'Communication',
        architectures: ['samd', 'megaavr'],
        includes: ['WiFiNINA.h'],
        description: 'Network connection with MKR WiFi 1010, Uno WiFi Rev.2, Nano 33 IoT.',
        installed: true,
    },
    {
        id: 'dabble-esp32',
        name: 'DabbleESP32',
        version: '1.5.1',
        author: 'STEMpedia',
        category: 'Communication',
        architectures: ['esp32'],
        includes: ['DabbleESP32.h'],
        description: 'Interface ESP32 with the Dabble Smartphone app.',
        installed: true,
    },
    {
        id: 'remotexy',
        name: 'RemoteXY',
        version: '4.1.2',
        author: 'Evgenii Shemanuev',
        category: 'Communication',
        architectures: ['*'],
        includes: ['RemoteXY.h'],
        description: 'Remote control your Arduino from a smartphone app.',
        installed: true,
    },
    {
        id: 'blues-notecard',
        name: 'Blues Wireless Notecard',
        version: '1.6.5',
        author: 'Blues',
        category: 'Communication',
        architectures: ['*'],
        includes: ['Notecard.h'],
        description: 'Easy-to-use Notecard Library for cellular IoT.',
        installed: true,
    },
    {
        id: 'smartrc-cc1101',
        name: 'SmartRC CC1101 Driver',
        version: '2.5.7',
        author: 'LSatan',
        category: 'Communication',
        architectures: ['avr', 'esp8266', 'esp32'],
        includes: ['ELECHOUSE_CC1101_SRC_DRV.h'],
        description: 'Driver for the CC1101 sub-GHz transceiver.',
        installed: true,
    },

    // ======================== DEVICE CONTROL ========================
    {
        id: 'accelstepper',
        name: 'AccelStepper',
        version: '1.64',
        author: 'Mike McCauley',
        category: 'Device Control',
        architectures: ['*'],
        includes: ['AccelStepper.h'],
        description: 'Control a variety of stepper motors with acceleration/deceleration.',
        installed: true,
    },
    {
        id: 'esp32servo',
        name: 'ESP32Servo',
        version: '3.0.6',
        author: 'Kevin Harrington, John K. Bennett',
        category: 'Device Control',
        architectures: ['esp32'],
        includes: ['ESP32Servo.h'],
        description: 'Control servos, tone and analogWrite on ESP32 boards.',
        installed: true,
    },
    {
        id: 'dfrobot-dfplayermini',
        name: 'DFRobotDFPlayerMini',
        version: '1.0.6',
        author: 'DFRobot',
        category: 'Device Control',
        architectures: ['*'],
        includes: ['DFRobotDFPlayerMini.h'],
        description: 'MP3 player module (DFPlayer Mini) driver.',
        installed: true,
    },
    {
        id: 'rtc-makuna',
        name: 'Rtc by Makuna',
        version: '2.3.7',
        author: 'Michael C. Miller',
        category: 'Device Control',
        architectures: ['*'],
        includes: ['RtcDS3231.h', 'RtcDS1307.h'],
        description: 'Interface DS1302, DS1307, DS3231, and DS3234 RTC modules.',
        installed: true,
    },

    // ======================== TIMING ========================
    {
        id: 'ntpclient',
        name: 'NTPClient',
        version: '3.2.1',
        author: 'Fabrice Weinberg',
        category: 'Timing',
        architectures: ['*'],
        includes: ['NTPClient.h'],
        description: 'Connect to a time server for accurate time.',
        installed: true,
    },
    {
        id: 'rtclib',
        name: 'RTClib',
        version: '2.1.4',
        author: 'Adafruit',
        category: 'Timing',
        architectures: ['*'],
        includes: ['RTClib.h'],
        description: 'Real Time Clock library (DS1307, DS3231, PCF8523).',
        installed: true,
    },
    {
        id: 'time',
        name: 'Time',
        version: '1.6.1',
        author: 'Michael Margolis',
        category: 'Timing',
        architectures: ['*'],
        includes: ['TimeLib.h'],
        description: 'Timekeeping functionality for Arduino.',
        installed: true,
    },
    {
        id: 'rtczero',
        name: 'RTCZero',
        version: '1.6.0',
        author: 'Arduino',
        category: 'Timing',
        architectures: ['samd'],
        includes: ['RTCZero.h'],
        description: 'RTC functions for Arduino Zero, MKRZero, MKR1000.',
        installed: true,
    },

    // ======================== SIGNAL I/O ========================
    {
        id: 'adafruit-busio',
        name: 'Adafruit BusIO',
        version: '1.17.4',
        author: 'Adafruit',
        category: 'Signal Input/Output',
        architectures: ['*'],
        includes: ['Adafruit_I2CDevice.h', 'Adafruit_SPIDevice.h'],
        description: 'Abstraction library for UART, I2C and SPI interfacing.',
        installed: true,
    },
    {
        id: 'ezbutton',
        name: 'ezButton',
        version: '1.0.6',
        author: 'ArduinoGetStarted.com',
        category: 'Signal Input/Output',
        architectures: ['*'],
        includes: ['ezButton.h'],
        description: 'Easy button library with debounce for Arduino, ESP32, ESP8266.',
        installed: true,
    },
    {
        id: 'pid-v1-bc',
        name: 'PID_v1_bc',
        version: '1.2.7',
        author: 'David Forrest',
        category: 'Signal Input/Output',
        architectures: ['*'],
        includes: ['PID_v1_bc.h'],
        description: 'PID controller with back-calculation anti-windup.',
        installed: true,
    },
    {
        id: 'esp32-analogwrite',
        name: 'ESP32 AnalogWrite',
        version: '5.0.2',
        author: 'David Lloyd',
        category: 'Signal Input/Output',
        architectures: ['esp32'],
        includes: ['analogWrite.h'],
        description: 'ESP32 PWM, Servo, Easing and Tone.',
        installed: true,
    },
    {
        id: 'audio-tools',
        name: 'Arduino Audio Tools',
        version: '1.2.1',
        author: 'Phil Schatzmann',
        category: 'Signal Input/Output',
        architectures: ['*'],
        includes: ['AudioTools.h'],
        description: 'Useful audio processing classes for Arduino.',
        installed: true,
    },

    // ======================== DATA PROCESSING ========================
    {
        id: 'adafruit-sleepydog',
        name: 'Adafruit SleepyDog',
        version: '1.6.5',
        author: 'Adafruit',
        category: 'Other',
        architectures: ['avr', 'samd', 'esp32', 'esp8266', 'rp2040'],
        includes: ['Adafruit_SleepyDog.h'],
        description: 'Watchdog timer for system reset and low power sleep.',
        installed: true,
    },
    {
        id: 'dazi-ai',
        name: 'DAZI-AI',
        version: '1.0.0',
        author: 'DAZI-AI Contributors',
        category: 'Communication',
        architectures: ['esp32'],
        includes: ['DAZI_AI.h'],
        description: 'Serverless AI Voice Assistant for ESP32 with ChatGPT and ASR.',
        installed: true,
    },
    {
        id: 'xiaozhi-mcp',
        name: 'xiaozhi-mcp',
        version: '1.0.0',
        author: 'toddpan',
        category: 'Communication',
        architectures: ['*'],
        includes: ['xiaozhi_mcp.h'],
        description: 'ESP32 MCP client library for xiaozhi platform.',
        installed: true,
    },
    {
        id: 'arducam-dvp',
        name: 'arducam_dvp',
        version: '1.0.0',
        author: 'Arducam',
        category: 'Device Control',
        architectures: ['mbed', 'mbed_portenta', 'mbed_giga'],
        includes: ['arducam_dvp.h'],
        description: 'Capture pixels from supported cameras on Arduino boards.',
        installed: true,
    },
];

// ============================================================
// Library Manager Functions
// ============================================================

const INSTALLED_KEY = 'circuito-libraries-installed';

function getExtraInstalled(): string[] {
    try {
        const stored = localStorage.getItem(INSTALLED_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveExtraInstalled(ids: string[]) {
    try {
        localStorage.setItem(INSTALLED_KEY, JSON.stringify(ids));
    } catch { /* full */ }
}

export function getAllLibraries(): ArduinoLibrary[] {
    const extra = getExtraInstalled();
    return ALL_LIBRARIES.map((lib) => ({
        ...lib,
        installed: lib.installed || extra.includes(lib.id),
    }));
}

export function getInstalledLibraries(): ArduinoLibrary[] {
    return getAllLibraries().filter((l) => l.installed);
}

export function searchLibraries(query: string): ArduinoLibrary[] {
    const q = query.toLowerCase();
    return getAllLibraries().filter(
        (l) =>
            l.name.toLowerCase().includes(q) ||
            l.author.toLowerCase().includes(q) ||
            l.category.toLowerCase().includes(q) ||
            l.description.toLowerCase().includes(q) ||
            l.includes.some((inc) => inc.toLowerCase().includes(q))
    );
}

export function getLibrariesByCategory(): Record<string, ArduinoLibrary[]> {
    const libs = getAllLibraries();
    const grouped: Record<string, ArduinoLibrary[]> = {};
    for (const lib of libs) {
        if (!grouped[lib.category]) grouped[lib.category] = [];
        grouped[lib.category].push(lib);
    }
    return grouped;
}

export function installLibrary(id: string) {
    const extra = getExtraInstalled();
    if (!extra.includes(id)) {
        extra.push(id);
        saveExtraInstalled(extra);
    }
}

export function uninstallLibrary(id: string) {
    const extra = getExtraInstalled();
    saveExtraInstalled(extra.filter((e) => e !== id));
}

export function getLibraryById(id: string): ArduinoLibrary | undefined {
    return getAllLibraries().find((l) => l.id === id);
}

export function getIncludeStatements(libraryId: string): string {
    const lib = getLibraryById(libraryId);
    if (!lib) return '';
    return lib.includes.map((inc) => `#include <${inc}>`).join('\n');
}

export const getLibraries = () => getAllLibraries();
export const getIncludeStatement = (lib: ArduinoLibrary) => {
    if (lib.includes.length === 0) return '';
    return `#include <${lib.includes[0]}>`;
};
