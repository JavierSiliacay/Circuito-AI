# ESP32 LED Control Testing Guide

## Quick Setup
1. **Update WiFi Credentials** in the code:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```

2. **Upload the Code** to your ESP32 board

## Testing Steps

### Step 1: Verify Serial Monitor Output
**Expected Results:**
```
=== ESP32 LED Control Debug Mode ===
LED Pin: GPIO2
Button Pin: GPIO4
Sensor Pin: GPIO34
Testing LED...
Testing Button...
Press the button to test...
Connecting to WiFi (YOUR_WIFI_SSID)...
................................
WiFi connected!
IP Address: 192.168.x.x
Signal Strength: -45 dBm
Web server started on port 80
Ready for testing!
```

**If you see connection dots but no IP address:**
- WiFi credentials are incorrect
- Router is blocking ESP32
- Try restarting your router

### Step 2: Test Physical Button
**What to observe:**
- Press the button connected to GPIO4
- Look for "Button pressed! LED ON/OFF" messages
- LED should toggle with each press

**Common Issues:**
- No response: Check button wiring (GPIO4 to GND)
- Multiple triggers: Debounce delay may need adjustment

### Step 3: Test Web Interface
1. **Find the IP Address** from Serial Monitor
2. **Open a web browser** and navigate to: `http://192.168.x.x`
3. **Expected Web Page:**
   - Shows current LED status
   - Displays sensor value
   - Has ON/OFF buttons

4. **Test Web Controls:**
   - Click "Turn ON" - LED should light up
   - Click "Turn OFF" - LED should turn off
   - Check Serial Monitor for "Web toggle!" messages

### Step 4: Verify All Features
| Feature | Test Method | Expected Result |
|---------|-------------|-----------------|
| WiFi Connection | Serial Monitor | Connection success + IP address |
| LED Control | Physical button | LED toggles, serial messages |
| LED Control | Web interface | LED toggles, serial messages |
| Sensor Reading | Web page | Shows analog value (0-4095) |

## Troubleshooting

### No WiFi Connection
1. Verify WiFi credentials
2. Check router compatibility (2.4GHz vs 5GHz)
3. Try a different network
4. Check for IP conflicts

### Button Not Working
1. Verify GPIO4 connection to GND
2. Check internal pull-up resistor (INPUT_PULLUP)
3. Test with Serial Monitor - look for button state changes
4. Adjust debounce delay if needed

### Web Interface Not Loading
1. Verify IP address from Serial Monitor
2. Check if port 80 is blocked
3. Try a different browser
4. Restart ESP32 and try again

### LED Not Responding
1. Verify GPIO2 connection (built-in LED)
2. Test with simple digitalWrite() in setup()
3. Check for hardware issues
4. Try different GPIO pin if needed

## Debug Commands

Add these to setup() for extra debugging:
```cpp
// Test all GPIOs
Serial.println("Testing all GPIO outputs...");
for (int i = 2; i <= 5; i++) {
  pinMode(i, OUTPUT);
  digitalWrite(i, HIGH);
  delay(200);
  digitalWrite(i, LOW);
}
Serial.println("GPIO test complete!");
```

## Success Criteria

✅ **All tests pass:**
- Serial Monitor shows connection and IP address
- Physical button toggles LED with serial confirmation
- Web interface loads and controls LED
- Sensor values display correctly

⚠️ **Partial functionality:**
- WiFi works but button doesn't: Check wiring
- Button works but web doesn't: Check server code
- Web works but LED doesn't: Check GPIO connections

## Next Steps

Once testing is complete:
1. Remove debug Serial.println() statements
2. Optimize code for production
3. Add security features (password protection)
4. Consider OTA updates for remote management