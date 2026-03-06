/**
 * Circuito AI — Personal Hardware Intelligence Base
 * Generated on: 2/28/2026, 10:38:16 AM
 * This file is automatically populated from your desktop "ARDUINO CODES" folder.
 */

export interface ProjectKnowledge {
  id: string;
  title: string;
  description: string;
  pins: string[];
  libraries: string[];
}

export const LOCAL_PROJECTS: ProjectKnowledge[] = [
  {
    "id": "3modes_quakeservo",
    "title": "3Modes QuakeServo",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "convergentButton=2",
      "divergentButton=3",
      "transformButton=4",
      "prevConvState=HIGH",
      "prevDivState=HIGH",
      "prevTransState=HIGH"
    ],
    "libraries": [
      "Servo.h"
    ]
  },
  {
    "id": "4ir_linefollower1",
    "title": "4IR LineFollower1",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "IR1=17",
      "IR2=5",
      "IR3=18",
      "IR4=19",
      "ENA=12",
      "IN1=14",
      "IN2=27",
      "IN3=26",
      "IN4=25",
      "ENB=15",
      "BASE_SPEED=140",
      "TURN_SPEED=130",
      "PIVOT_SPEED=170",
      "SOFT_PIVOT_SPEED=150",
      "lastError=0"
    ],
    "libraries": []
  },
  {
    "id": "4ir_linefollower3s",
    "title": "4IR LineFollower3s",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "IR1=17",
      "IR2=5",
      "IR3=18",
      "IR4=19",
      "ENA=12",
      "IN1=14",
      "IN2=27",
      "IN3=26",
      "IN4=25",
      "ENB=15",
      "BASE_SPEED=180",
      "TURN_SPEED=130",
      "PIVOT_SPEED=150",
      "SOFT_PIVOT_SPEED=130",
      "lastError=0"
    ],
    "libraries": []
  },
  {
    "id": "aiassistant",
    "title": "AIAssistant",
    "description": "Automotive Electronics & IoT AI Assistant - TRUE AI VERSION ESP32-based voice-controlled assistant with OpenAI GPT integration Hardware: - ESP32 Dev Board (30-pin) with WiFi - INMP441 I2S Microphone - MAX98357A I2S Audio Amplifier - 1.3\" OLED Display (128x64) TRUE AI Capabilities: - OpenAI GPT-4 API",
    "pins": [
      "i=0",
      "j=0",
      "OLED_I2C_ADDRESS=0",
      "SCREEN_WIDTH=128",
      "SCREEN_HEIGHT=64",
      "OLED_RESE=T",
      "I2S_BUFFER_SIZE=1024",
      "INMP441_WS=25",
      "INMP441_SCK=26",
      "INMP441_SD=33",
      "MAX98357_WS=22",
      "MAX98357_SCK=21",
      "MAX98357_SD=19",
      "LED_PIN=2",
      "FAN_PIN=4"
    ],
    "libraries": [
      "Arduino.h",
      "Wire.h",
      "WiFi.h",
      "WiFiClientSecure.h",
      "HTTPClient.h",
      "ArduinoJson.h",
      "driver/i2s.h",
      "Adafruit_GFX.h"
    ]
  },
  {
    "id": "arduinoesp_uartcomms",
    "title": "ARDUINOESP UARTComms",
    "description": "Source file analyzed but no comments found.",
    "pins": [],
    "libraries": []
  },
  {
    "id": "automatic_headlight",
    "title": "Automatic Headlight",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "TFT_MISO=25",
      "TFT_LED=5",
      "TFT_SCK=19",
      "TFT_MOSI=23",
      "TFT_DC=21",
      "TFT_RESET=18",
      "TFT_CS=22",
      "PROXIMITY=14",
      "LED_PIN=26",
      "brightness=0",
      "barWidth=map"
    ],
    "libraries": [
      "WiFi.h",
      "WebServer.h",
      "SPI.h",
      "Adafruit_GFX.h",
      "Adafruit_ILI9341.h"
    ]
  },
  {
    "id": "autonomous_sumobot",
    "title": "Autonomous Sumobot",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "leftMotorForward=5",
      "leftMotorBackward=6",
      "rightMotorForward=7",
      "rightMotorBackward=8",
      "trigPin=10",
      "echoPin=9",
      "irSensorFront=2",
      "irSensorBack=3",
      "servo1Pin=11",
      "servo2Pin=12",
      "RECV_PIN=4",
      "distanc=e",
      "buttonPressCount=0",
      "getDistanc=e"
    ],
    "libraries": [
      "IRremote.hpp",
      "Servo.h"
    ]
  },
  {
    "id": "batteryguard",
    "title": "BatteryGuard",
    "description": "============================================ battery_monitor.h Battery voltage, current, and power monitoring ============================================",
    "pins": [
      "BATTERY_MONITOR_=H",
      "VOLTAGE_DIVIDER_RATIO=4",
      "BATTERY_FULL_VOLTAGE=12",
      "BATTERY_EMPTY_VOLTAGE=11",
      "MAX_DATA_POINTS=60",
      "dataInde=x"
    ],
    "libraries": [
      "Arduino.h",
      "Wire.h",
      "Adafruit_INA219.h"
    ]
  },
  {
    "id": "carminder",
    "title": "CarMinder",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "WIFI_MAGIC=0",
      "SCREEN_WIDTH=128",
      "SCREEN_HEIGHT=64",
      "I2S_BCLK_PIN=26",
      "I2S_LRC_PIN=25",
      "I2S_DOUT_PIN=27",
      "BTN_MODE=23",
      "GPS_RX_PIN=16",
      "GPS_TX_PIN=17",
      "EEPROM_SIZE=1024",
      "TOTAL_MILEAGE_ADDR=0",
      "CURRENT_MAINTENANCE_ADDR=8",
      "MAINTENANCE_SETTINGS_ADDR=16",
      "WIFI_SETTINGS_ADDR=432",
      "SSID_LENGTH=32"
    ],
    "libraries": [
      "Wire.h",
      "U8g2lib.h",
      "TinyGPS++.h",
      "EEPROM.h",
      "WiFi.h",
      "WebServer.h",
      "driver/i2s.h"
    ]
  },
  {
    "id": "civic_rpmgauge",
    "title": "Civic RPMGauge",
    "description": "HONDA CIVIC RPM GAUGE SHESSSHH BY JAVIERRRR",
    "pins": [
      "TFT_MISO=25",
      "TFT_LED=5",
      "TFT_SCK=19",
      "TFT_MOSI=23",
      "TFT_DC=21",
      "TFT_RESET=18",
      "TFT_CS=22",
      "TRIGGER_PIN=12",
      "ECHO_PIN=13",
      "CENTER_X=120",
      "CENTER_Y=140",
      "RADIUS=90",
      "NEEDLE_LEN=70",
      "RPM_MIN=1000",
      "RPM_MAX=8000"
    ],
    "libraries": [
      "SPI.h",
      "Adafruit_GFX.h",
      "Adafruit_ILI9341.h",
      "NewPing.h"
    ]
  },
  {
    "id": "coolant_turbidity",
    "title": "Coolant Turbidity",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "sensorPin=A2",
      "sensor=map"
    ],
    "libraries": [
      "LiquidCrystal_I2C.h"
    ]
  },
  {
    "id": "distance_sensor_project",
    "title": "DISTANCE SENSOR PROJECT",
    "description": "Automated Parking Light Distance Sensor Project made by a group of Siliacay,Suello,Sobrepena,Tan,Ucat,Tumampoc,Simbajon,Llenares and Torreon.                                                           #define trigPin 8 - An unnecessary in c programming that won't display in output, it served as a com",
    "pins": [
      "trigPin=8",
      "echoPin=9",
      "buzzerPin=10",
      "ledPin=11"
    ],
    "libraries": []
  },
  {
    "id": "dualultrasonic_withdfplayer",
    "title": "DualUltrasonic withDFPlayer",
    "description": "Dual Sensor with Voice Alert",
    "pins": [
      "TRIG_LEFT=5",
      "ECHO_LEFT=18",
      "TRIG_RIGHT=14",
      "ECHO_RIGHT=26",
      "trigPi=n",
      "echoPi=n"
    ],
    "libraries": [
      "DFRobotDFPlayerMini.h"
    ]
  },
  {
    "id": "esp32simpleweb",
    "title": "esp32simpleweb",
    "description": "Source file analyzed but no comments found.",
    "pins": [],
    "libraries": [
      "ESP8266WiFi.h",
      "ESP8266WebServer.h",
      "ESP8266mDNS.h"
    ]
  },
  {
    "id": "esp8266_rccar",
    "title": "ESP8266 RCcar",
    "description": "ESP8266 Wi-Fi Controlled RC Car - Blue Cyberpunk Theme Enhanced Responsive Version with Optimized Landscape Layout SoftAP Mode - No Router Required Compatible with NodeMCU / Wemos D1 Mini Motor Driver: ZK-BM1 Features: - Creates its own Wi-Fi hotspot - Blue cyberpunk themed web interface - Optimized",
    "pins": [
      "IN1=D1",
      "IN2=D2",
      "IN3=D5",
      "IN4=D6"
    ],
    "libraries": [
      "ESP8266WiFi.h",
      "ESP8266WebServer.h"
    ]
  },
  {
    "id": "initialdtakumi_oledbitmap",
    "title": "InitialDTakumi OLEDBitmap",
    "description": "Initial D Takumi AE86 bitmap",
    "pins": [
      "SCREEN_WIDTH=128",
      "SCREEN_HEIGHT=64",
      "OLED_RESE=T",
      "OLED_ADDR=0",
      "FRAME_WIDTH=128",
      "FRAME_HEIGHT=64",
      "FRAME_DELAY=100",
      "FRAME_COUN=T",
      "frame=0",
      "xPo=s",
      "yPos=18",
      "barWidth=100",
      "barHeight=8",
      "bar=X",
      "barY=45"
    ],
    "libraries": [
      "Adafruit_GFX.h",
      "Adafruit_SSD1306.h",
      "Wire.h"
    ]
  },
  {
    "id": "instantenousrateofchange_dc-motor",
    "title": "InstantenousRateOfChange DC-MOTOR",
    "description": "Source file analyzed but no comments found.",
    "pins": [],
    "libraries": [
      "LiquidCrystal_I2C.h"
    ]
  },
  {
    "id": "intruderalert",
    "title": "IntruderAlert",
    "description": "Intruder Alert",
    "pins": [
      "shockPin=2",
      "ledPin=13"
    ],
    "libraries": [
      "SoftwareSerial.h"
    ]
  },
  {
    "id": "jammerbabyyyy",
    "title": "JammerBabyyyy",
    "description": "VSPI Mode Jammer with Serial Monitor Output",
    "pins": [
      "ch1=45",
      "flagv=0",
      "i=0"
    ],
    "libraries": [
      "RF24.h",
      "SPI.h",
      "esp_bt.h",
      "esp_wifi.h"
    ]
  },
  {
    "id": "jasfilmsstudio",
    "title": "JasFilmsStudio",
    "description": "In Arduino Uno TFT needs 5pcs 10k resistors from CS to SCK VCC,GND and MISO no need resistors LED pin needs at least 220Ω ,330Ω or 1kΩ resistor",
    "pins": [
      "TFT_DC=9",
      "TFT_CS=10",
      "TFT_RST=8",
      "TFT_MISO=12",
      "TFT_MOSI=11",
      "TFT_CLK=13",
      "DT=4",
      "SCK=5",
      "textSiz=e",
      "i=0",
      "Seria=l",
      "xPo=s",
      "yPo=s"
    ],
    "libraries": [
      "Adafruit_GFX.h",
      "Adafruit_ILI9341.h",
      "SPI.h",
      "HX711.h"
    ]
  },
  {
    "id": "klarence_thesis",
    "title": "Klarence Thesis",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "ONE_WIRE_BUS=3",
      "LED_PIN=13",
      "buzzer=4",
      "NUM_SAMPLES=5",
      "sampleIndex=0",
      "i=0",
      "bars=map"
    ],
    "libraries": [
      "OneWire.h",
      "DallasTemperature.h",
      "Wire.h",
      "LiquidCrystal_I2C.h"
    ]
  },
  {
    "id": "line_tracer_2wd",
    "title": "Line Tracer 2WD",
    "description": "Line Tracer 2WD DC MOTORS",
    "pins": [
      "leftmotorforward=1",
      "leftmotorbackward=2",
      "rightmotorforward=3",
      "rightmotorbackward=4",
      "leftsensor=5",
      "rightsensor=6"
    ],
    "libraries": []
  },
  {
    "id": "mcuwithai",
    "title": "MCUwithAI",
    "description": "Automotive Electronics & IoT AI Assistant - TRUE AI VERSION ESP32-based voice-controlled assistant with OpenAI GPT integration Hardware: - ESP32 Dev Board (30-pin) with WiFi - INMP441 I2S Microphone - MAX98357A I2S Audio Amplifier - 1.3\" OLED Display (128x64) TRUE AI Capabilities: - OpenAI GPT-4 API",
    "pins": [
      "i=0",
      "j=0",
      "OLED_I2C_ADDRESS=0",
      "SCREEN_WIDTH=128",
      "SCREEN_HEIGHT=64",
      "OLED_RESE=T",
      "I2S_BUFFER_SIZE=1024",
      "INMP441_WS=25",
      "INMP441_SCK=26",
      "INMP441_SD=33",
      "MAX98357_WS=22",
      "MAX98357_SCK=21",
      "MAX98357_SD=19",
      "LED_PIN=2",
      "FAN_PIN=4"
    ],
    "libraries": [
      "Arduino.h",
      "Wire.h",
      "WiFi.h",
      "WiFiClientSecure.h",
      "HTTPClient.h",
      "ArduinoJson.h",
      "driver/i2s.h",
      "Adafruit_GFX.h"
    ]
  },
  {
    "id": "midterm_forthem",
    "title": "Midterm forthem",
    "description": "FOR LOOP LEDS RUNNING BACK AND FORTH",
    "pins": [
      "ledPin=s",
      "numLEDs=6",
      "i=0"
    ],
    "libraries": []
  },
  {
    "id": "multlyricslcd",
    "title": "MultLyricsLCD",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "longdelay=4000",
      "shortdelay=2400",
      "brightness=150"
    ],
    "libraries": [
      "Wire.h",
      "LiquidCrystal_I2C.h"
    ]
  },
  {
    "id": "myrobocar",
    "title": "myROBOCAR",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "motorA1=25",
      "motorA2=26",
      "motorB1=27",
      "motorB2=14",
      "trigPin=5",
      "echoPin=18",
      "BUILTLED=2",
      "BUZZER_PIN=4",
      "motorA_PWM=32",
      "motorB_PWM=33",
      "currentMode=1",
      "motorSpeed=200",
      "distance=0",
      "leftDistance=0",
      "rightDistance=0"
    ],
    "libraries": [
      "WiFi.h",
      "WebServer.h",
      "ArduinoJson.h",
      "EEPROM.h"
    ]
  },
  {
    "id": "rc_sumobot",
    "title": "RC Sumobot",
    "description": "======================= AUTONOMOUS SUMOBOT (ESP32 + ZK-BM1 MOSFET DRIVER) IR responsive + ultrasonic attack + non-blocking search + Serial Monitor by Javier Siliacay =======================",
    "pins": [
      "TRIG1=5",
      "ECHO1=18",
      "TRIG2=17",
      "ECHO2=16",
      "IR_FRONT=4",
      "IR_BACK=15",
      "IN1=14",
      "IN2=27",
      "IN3=26",
      "IN4=25",
      "LED_PIN=2",
      "fastSpeed=255",
      "slowSpeed=150",
      "turnSpeed=180",
      "distance1=200"
    ],
    "libraries": []
  },
  {
    "id": "robotcar",
    "title": "ROBOTCAR",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "motorA1=25",
      "motorA2=26",
      "motorB1=27",
      "motorB2=14",
      "motorA_PWM=32",
      "motorB_PWM=33",
      "trigPin=5",
      "echoPin=17",
      "BUILTLED=2",
      "BUZZER_PIN=4",
      "autoStep=0",
      "motorSpeed=255"
    ],
    "libraries": [
      "BluetoothSerial.h"
    ]
  },
  {
    "id": "sim800l_samplecode",
    "title": "SIM800L SampleCode",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "SIM_RX=13",
      "SIM_TX=14"
    ],
    "libraries": [
      "HardwareSerial.h"
    ]
  },
  {
    "id": "sumobot_for_tirt",
    "title": "Sumobot for TIRT",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "oilSensorPin=34",
      "alcoholSensorPin=35",
      "trigPin=5",
      "echoPin=18",
      "distanc=e"
    ],
    "libraries": [
      "WiFi.h",
      "HTTP_Method.h",
      "Middlewares.h",
      "Uri.h",
      "WebServer.h",
      "ArduinoJson.h"
    ]
  },
  {
    "id": "tftmochivier",
    "title": "TFTMochiVier",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "TFT_DC=D2",
      "TFT_CS=D1",
      "TFT_MOSI=D7",
      "TFT_SCK=D5",
      "TFT_RST=D4",
      "TFT_MISO=D6",
      "TFT_LED=D8",
      "currentAnimation=0",
      "textDisplayMode=0",
      "numMessages=5",
      "currentMessageIndex=0",
      "ANIMATION_DELAY=100",
      "TEXT_CHANGE_INTERVAL=5000",
      "FAST_TYPEWRITER_SPEED=50",
      "chunkSize=3"
    ],
    "libraries": [
      "Adafruit_GFX.h",
      "Adafruit_ILI9341.h"
    ]
  },
  {
    "id": "thesis",
    "title": "Thesis",
    "description": "Source file analyzed but no comments found.",
    "pins": [
      "TFT_CS=10",
      "TFT_RST=8",
      "TFT_DC=9",
      "buzzer=2",
      "redled=3",
      "turbidityPin=A0",
      "turbidityValue=0"
    ],
    "libraries": [
      "SPI.h",
      "Adafruit_GFX.h",
      "Adafruit_ILI9341.h",
      "SoftwareSerial.h"
    ]
  },
  {
    "id": "obd2_can_traffic_log",
    "title": "OBD2 CAN Traffic Log (canid.pdf)",
    "description": "Raw OBD2 CAN bus traffic data log. Contains periodic messages and state changes for various vehicle control units. Frequent IDs: 0x545 (Engine/Status), 0x350 (ABS/Steering), 0x316 (Engine RPM/Speed), 0x4F0 (Lighting/BCM), and 0x329. This dataset is used for reverse engineering vehicle-specific PID controllers and understanding bus load.",
    "pins": [
      "CAN_RX=4",
      "CAN_TX=5"
    ],
    "libraries": [
      "ESP32-TWAI-CAN",
      "mcp_can.h"
    ]
  }
];

export const getHardwareKnowledgeString = () => {
  return LOCAL_PROJECTS.map(p =>
    "- PROJECT: " + p.title + "\n" +
    "  DESC: " + p.description + "\n" +
    "  PINS: " + p.pins.join(", ") + "\n" +
    "  LIBS: " + p.libraries.join(", ") + "\n"
  ).join("\n");
};
