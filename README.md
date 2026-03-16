# ESP32 WiFi Web Server

[![ESP32](https://img.shields.io/badge/ESP32-Web%20Server-blue)](https://www.espressif.com/)
[![Arduino](https://img.shields.io/badge/Arduino-Framework-green)](https://www.arduino.cc/)

A robust ESP32-based WiFi web server with automatic fallback to Access Point mode. Features a modern responsive web interface for LED control and system monitoring.

## 🎯 Features

- Dual-mode WiFi: Station (connects to router) or Access Point (creates hotspot)
- Automatic fallback: Switches to AP if station connection fails
- Responsive web UI with real-time status updates
- LED control via web buttons
- JSON API for integration
- mDNS support (esp32.local)
- Comprehensive error handling

## 📋 Quick Start

1. **Install ESP32 board support in Arduino IDE**
   - Add `https://dl.espressif.com/dl/package_esp32_index.json` to Additional Board URLs
   - Install "esp32" via Board Manager

2. **Configure credentials**
   - Open `esp32_wifi_web_server_final.ino`
   - Change `ssid` and `password` to your WiFi network

3. **Select board and upload**
   - Choose your ESP32 board (Tools → Board)
   - Select correct COM port
   - Click Upload

4. **Access the server**
   - Station mode: Open browser to printed IP or `http://esp32.local`
   - AP mode: Connect to "ESP32-WebServer" and open `http://192.168.4.1`

## 📁 Project Structure

```
.
├── esp32_wifi_web_server_final.ino  # Main firmware (copy to Arduino sketch)
├── docs/
│   └── esp32-wifi-server-setup.md   # Detailed setup guide
└── README.md                        # This file
```

## 🔧 Configuration

Edit the following constants in the firmware:

```cpp
const char* ssid = "YOUR_WIFI_SSID";        // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD"; // Your WiFi password
const char* apSSID = "ESP32-WebServer";    // AP network name (optional)
const char* apPassword = "12345678";        // AP password (min 8 chars)
const int ledPin = 2;                       // GPIO pin for LED (default built-in)
const unsigned long wifiTimeout = 15000;    // WiFi connection timeout (ms)
```

## 🖥️ Web Interface

![Web Interface Preview](docs/web-interface-preview.png) *(screenshot placeholder)*

### Pages & Endpoints

- `/` - Main web interface with LED controls and status cards
- `/status` - JSON status data (IP, RSSI, uptime, heap, LED state)
- `/ledon` - Turn LED on
- `/ledoff` - Turn LED off

## 🔐 Security Notes

⚠️ This is a demonstration project. For production use:
- Change default AP password
- Add HTTP authentication
- Disable serial debug prints
- Consider implementing HTTPS (requires additional crypto hardware)
- Validate all inputs to prevent injection attacks

## 🛠️ Customization

### Change LED Pin
```cpp
const int ledPin = 23;  // Use GPIO 23 instead
```

### Add More Controls
Add new endpoints in `setup()`:
```cpp
server.on("/heater/on", HTTP_GET, []() {
  digitalWrite(heaterPin, HIGH);
  server.send(200, "text/plain", "Heater ON");
});
```

Modify the HTML in `HTML_PAGE[]` to add buttons/indicators.

### External Sensors
Read sensor data in `handleStatus()` and add to JSON response:
```cpp
float temperature = dht.readTemperature();
json += "\"temperature\":" + String(temperature) + ",";
```

## 📡 WiFi Behavior

1. On boot, attempts to connect to configured WiFi network
2. After 15 seconds without connection, starts AP mode
3. In AP mode, connect to "ESP32-WebServer" and access `http://192.168.4.1`
4. Power cycling returns to station mode attempt
5. If station connection drops, ESP32 will attempt to reconnect

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Board not listed in Arduino IDE | Install ESP32 board support via Boards Manager |
| Upload fails | Check USB cable, drivers, correct COM port |
| Can't connect to WiFi | Verify SSID/password, ensure 2.4GHz network |
| Web page won't load | Check IP in Serial Monitor, ensure on same network |
| AP mode starts unexpectedly | Credentials may be wrong or router unreachable |
| mDNS doesn't work | Use IP address directly; mDNS may be blocked on some networks |

See `docs/esp32-wifi-server-setup.md` for detailed troubleshooting.

## 📚 Dependencies

- Arduino framework for ESP32
- Built-in libraries: `WiFi.h`, `WebServer.h`, `ESPmDNS.h`
- No external libraries required (uses ESP32 Arduino core built-ins)

## 🤝 Contributing

Feel free to fork and enhance! Some ideas:
- Web-based WiFi configuration (captive portal)
- OTA firmware updates
- Multiple relay controls
- Sensor integration (DHT, BME280, etc.)
- WebSocket real-time updates
- RESTful API for Home Assistant

## 🧠 Autonomous AI Mode

This project includes a built-in **Autonomous AI Agent** that can modify the code and run diagnostics directly.

### To Enable:
1. Run `start-autonomous-ai.bat` in your project folder.
2. In the Web UI, click **Authorize Deployment** to allow the AI to apply changes.
3. The AI is strictly locked to this folder and cannot modify external system files.

## 📄 License

MIT License - Free to use, modify, and distribute.

## 📧 Author

Circuito Autonomous Generator  
Generated: 2025-06-18

---

**Note**: Always test new code on a development board before deploying to critical applications. The author is not responsible for any damage or data loss.
