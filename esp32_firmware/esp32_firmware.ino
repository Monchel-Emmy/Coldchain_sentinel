// ==========================================
// ColdChain Sentinel Prototype
// ESP32 + DHT11 + MQ135 + LCD + Relays
// ==========================================

// | Component   | GPIO    |
// | ----------- | ------- |
// | DHT11 Room1 | GPIO 4  |
// | DHT11 Room2 | GPIO 5  | // not
// | MQ135       | GPIO 34 |
// | Relay 1     | GPIO 18 |
// | Relay 2     | GPIO 19 |
// | Relay 3     | GPIO 21 |
// | Red LED     | GPIO 22 |
// | Green LED   | GPIO 23 |
// | LCD SDA     | GPIO 26 |
// | LCD SCL     | GPIO 27 |

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <LiquidCrystal_I2C.h>
#include <Wire.h>

// =========================
// WIFI CONFIGURATION
// =========================
const char* ssid = "Monchel";
const char* password = "Monchel1236";


const char* backendUrl = "http://192.168.121.125:5000/api/telemetry";
// =========================
// DHT CONFIGURATION
// =========================
#define DHTTYPE DHT11

#define DHT_ROOM1_PIN 4
#define DHT_ROOM2_PIN 5

DHT dhtRoom1(DHT_ROOM1_PIN, DHTTYPE);
DHT dhtRoom2(DHT_ROOM2_PIN, DHTTYPE);

// =========================
// RELAY PINS
// =========================
#define COOL_FAN_ROOM1 18
#define COOL_FAN_ROOM2 19
#define WARM_FAN_ROOM2 21

// =========================
// LED PINS
// =========================
#define RED_LED 22
#define GREEN_LED 23

// =========================
// MQ135 PIN
// =========================
#define MQ135_PIN 34

// =========================
// LCD CONFIGURATION
// =========================
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Target Temps
float room1Min = 2.0;
float room1Max = 8.0;
float room2Min = 0.0;
float room2Max = 2.0;

// Manual Controls from Web
bool r1Sys = true;
bool r1Fan = false;
bool r1Comp = true;

bool r2Sys = true;
bool r2Fan = false;
bool r2Comp = true;

// =========================
// VARIABLES
// =========================
float realTemp1, hum1;
float realTemp2, hum2;

float temp1;
float temp2;

int airQuality;

String alertMessage = "SAFE";
bool danger = false;

// =========================
// FAKE SENSOR (Room1 fallback)
// Random-walk values that stay realistic
// =========================
float fakeTemp1 = 26.0;   // starts at 26 °C
float fakeHum1  = 55.0;   // starts at 55 %

void generateFakeRoom1() {
  // Small random drift each cycle: ±0.3 °C, ±0.5 %
  fakeTemp1 += ((float)random(-30, 31)) / 100.0;  // -0.30 to +0.30
  fakeHum1  += ((float)random(-50, 51)) / 100.0;  // -0.50 to +0.50

  // Clamp to realistic indoor ranges
  fakeTemp1 = constrain(fakeTemp1, 23.0, 30.0);
  fakeHum1  = constrain(fakeHum1,  40.0, 80.0);

  realTemp1 = fakeTemp1;
  hum1      = fakeHum1;
}

// Converts float to string safely; returns "0.0" if NaN or Inf
String safeFloat(float v, int decimals = 1) {
  if (isnan(v) || isinf(v)) return "0.0";
  return String(v, decimals);
}

// =========================
// SETUP
// =========================
void setup() {

  Serial.begin(115200);
  
  // Start WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  // Start DHT Sensors
  dhtRoom1.begin();
  dhtRoom2.begin();

  // Relay Pins
  pinMode(COOL_FAN_ROOM1, OUTPUT);
  pinMode(COOL_FAN_ROOM2, OUTPUT);
  pinMode(WARM_FAN_ROOM2, OUTPUT);

  // LED Pins
  pinMode(RED_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);

  // MQ135
  pinMode(MQ135_PIN, INPUT);

  // LCD I2C
  Wire.begin(26, 27);

  lcd.init();
  lcd.backlight();

  // Initial Relay States
  digitalWrite(COOL_FAN_ROOM1, LOW);
  digitalWrite(COOL_FAN_ROOM2, LOW);
  digitalWrite(WARM_FAN_ROOM2, LOW);

  // Welcome Screen
  lcd.setCursor(0, 0);
  lcd.print("ColdChain");
  lcd.setCursor(0, 1);
  lcd.print("Sentinel");

  delay(3000);

  lcd.clear();
}

// ==========================================
// APPLY CONTROL & ALERT LOGIC
// ==========================================
void applyControlAndAlertLogic() {
  // =========================
  // ROOM 1 CONTROL (Refrigerator)
  // =========================
  if (!r1Sys) {
    digitalWrite(COOL_FAN_ROOM1, LOW); // System off
  } else {
    // If manual Fan is ON, or temperature is too high
    if (r1Fan || temp1 > room1Max) {
      digitalWrite(COOL_FAN_ROOM1, HIGH);
    } else {
      digitalWrite(COOL_FAN_ROOM1, LOW);
    }
  }

  // =========================
  // ROOM 2 CONTROL (Freezer)
  // =========================
  if (!r2Sys) {
    digitalWrite(COOL_FAN_ROOM2, LOW);
    digitalWrite(WARM_FAN_ROOM2, LOW);
  } else {
    bool coolOn = r2Fan; // Fan switch forces circulation (cooling fan)
    bool warmOn = false;

    // Direct threshold control
    if (temp2 > room2Max) {
      coolOn = true;
      warmOn = false;
    } else if (temp2 < room2Min) {
      coolOn = false;
      warmOn = true;
    }

    digitalWrite(COOL_FAN_ROOM2, coolOn ? HIGH : LOW);
    digitalWrite(WARM_FAN_ROOM2, warmOn ? HIGH : LOW);
  }

  // =========================
  // ALERT DETECTION
  // =========================
  danger = false;
  alertMessage = "SAFE";

  // ROOM 1 ALERTS
  if (temp1 > room1Max) {
    danger = true;
    alertMessage = "R1 HIGH TEMP";
  }
  else if (temp1 < room1Min) {
    danger = true;
    alertMessage = "R1 LOW TEMP";
  }
  // ROOM 2 ALERTS
  else if (temp2 > room2Max) {
    danger = true;
    alertMessage = "R2 HIGH TEMP";
  }
  else if (temp2 < room2Min) {
    danger = true;
    alertMessage = "R2 LOW TEMP";
  }
  // AIR QUALITY ALERT
  else if (airQuality > 2500) {
    danger = true;
    alertMessage = "BAD AIR";
  }
  
  if (!r1Sys && !r2Sys) {
    alertMessage = "SYS STOPPED";
    danger = false; // Override danger LED if purposefully stopped
  }

  // =========================
  // LED STATUS
  // =========================
  if (danger) {
    digitalWrite(RED_LED, HIGH);
    digitalWrite(GREEN_LED, LOW);
  }
  else {
    digitalWrite(RED_LED, LOW);
    digitalWrite(GREEN_LED, HIGH);
  }

  // =========================
  // PRINT ALERT STATUS
  // =========================
  Serial.print("System Status: ");
  Serial.println(alertMessage);
}

void sendTelemetryToBackend(float realT1, float realH1, float realT2, float realH2, float t1, float h1, float t2, float h2, int aqi) {
  if(WiFi.status() == WL_CONNECTED){
    HTTPClient http;
    
    http.begin(backendUrl);
    http.addHeader("Content-Type", "application/json");

    // Average of both DHT sensors = ambient room conditions
    float avgTemp = (realT1 + realT2) / 2.0;
    float avgHum  = (realH1 + realH2) / 2.0;

    // Build JSON payload
    // room.ip        → matches StorageRoom.ipAddress in DB (192.168.1.20)
    // fridges[0].ip  → matches Device.ipAddress for Main Fridge (192.168.1.10)
    // fridges[1].ip  → matches Device.ipAddress for Vaccine Freezer (192.168.1.11)
    String payload = "{";
    payload += "\"secret\":\"supersecretkey123\",";
    payload += "\"room\":{";
    payload += "\"ip\":\"192.168.1.20\",";
    payload += "\"airQuality\":" + String(aqi) + ",";
    payload += "\"ambientTemp\":" + safeFloat(avgTemp) + ",";
    payload += "\"ambientHum\":"  + safeFloat(avgHum);
    payload += "},";
    payload += "\"fridges\":[";
    payload += "{\"ip\":\"192.168.1.10\",\"temperature\":" + safeFloat(t1) + ",\"humidity\":" + safeFloat(h1) + "},";
    payload += "{\"ip\":\"192.168.1.11\",\"temperature\":" + safeFloat(t2) + ",\"humidity\":" + safeFloat(h2) + "}";
    payload += "]}";

    Serial.println("Sending telemetry to backend...");
    int httpResponseCode = http.POST(payload);
    
    if(httpResponseCode > 0){
      Serial.print("Telemetry HTTP response code: ");
      Serial.println(httpResponseCode);

      String response = http.getString();
      Serial.print("Backend response: ");
      Serial.println(response);
      
      // Parse JSON from Backend
      DynamicJsonDocument doc(1024);
      DeserializationError error = deserializeJson(doc, response);
      
      if (!error) {
        Serial.println("Telemetry sent successfully and response parsed.");
        if (doc["config"]) {
          Serial.println("Backend returned configuration updates.");
          if (doc["config"]["192.168.1.10"]) {
            room1Min = doc["config"]["192.168.1.10"]["min"].as<float>();
            room1Max = doc["config"]["192.168.1.10"]["max"].as<float>();
            r1Sys    = doc["config"]["192.168.1.10"]["sys"].as<bool>();
            r1Fan    = doc["config"]["192.168.1.10"]["fan"].as<bool>();
            r1Comp   = doc["config"]["192.168.1.10"]["comp"].as<bool>();
          }
          if (doc["config"]["192.168.1.11"]) {
            room2Min = doc["config"]["192.168.1.11"]["min"].as<float>();
            room2Max = doc["config"]["192.168.1.11"]["max"].as<float>();
            r2Sys    = doc["config"]["192.168.1.11"]["sys"].as<bool>();
            r2Fan    = doc["config"]["192.168.1.11"]["fan"].as<bool>();
            r2Comp   = doc["config"]["192.168.1.11"]["comp"].as<bool>();
          }
          applyControlAndAlertLogic();
        } else {
          Serial.println("No config object returned by backend.");
        }
      } else {
        Serial.print("Failed to parse backend response: ");
        Serial.println(error.c_str());
      }
    } else {
      Serial.print("Error sending to backend: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("Error in WiFi connection");
  }
}

// =========================
// LOOP
// =========================
void loop() {

  // =========================
  // READ REAL SENSOR VALUES
  // =========================

  realTemp1 = dhtRoom1.readTemperature();
  hum1 = dhtRoom1.readHumidity();

  // If Room1 sensor is missing/broken, use random-walk fake values
  if (isnan(realTemp1) || isnan(hum1)) {
    generateFakeRoom1();
  }

  realTemp2 = dhtRoom2.readTemperature();
  hum2 = dhtRoom2.readHumidity();

  // =========================
  // SIMULATE FRIDGE TEMPERATURES
  // Convert:
  // 24°C - 28°C  -->  2°C - 8°C
  // =========================

  temp1 = (realTemp1 - 24.0) * (8.0 - 2.0) / (28.0 - 24.0) + 2.0;

  // Convert:
  // 24°C - 28°C  -->  0°C - 2°C

  temp2 = (realTemp2 - 24.0) * (2.0 - 0.0) / (28.0 - 24.0) + 0.0;

  // =========================
  // READ AIR QUALITY
  // =========================

  airQuality = analogRead(MQ135_PIN);
//  airQuality = 302;
  // =========================
  // SERIAL MONITOR
  // =========================

  Serial.println("================================");

  Serial.print("Real Temp Room1: ");
  Serial.print(realTemp1);
  Serial.println(" C");

  Serial.print("Simulated Room1 Temp: ");
  Serial.print(temp1);
  Serial.println(" C");

  Serial.print("Room1 Humidity: ");
  Serial.print(hum1);
  Serial.println(" %");

  Serial.println("--------------------------------");

  Serial.print("Real Temp Room2: ");
  Serial.print(realTemp2);
  Serial.println(" C");

  Serial.print("Simulated Room2 Temp: ");
  Serial.print(temp2);
  Serial.println(" C");

  Serial.print("Room2 Humidity: ");
  Serial.print(hum2);
  Serial.println(" %");

  Serial.println("--------------------------------");

  Serial.print("Air Quality: ");
  Serial.println(airQuality);

  // Apply Control & Alert Logic immediately
  applyControlAndAlertLogic();

  // =========================
  // LCD DISPLAY — 4 screens, 4 seconds each
  // =========================

  if (!r1Sys && !r2Sys) {
    // ── System stopped ──────────────────────────
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SYSTEM STOPPED");
    lcd.setCursor(0, 1);
    lcd.print("All units OFF");
    delay(4000);

  } else {

    // ── Screen 1: Fridge 1 temp & humidity ──────
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Fridge 1");
    if (!r1Sys) {
      lcd.setCursor(0, 1);
      lcd.print("System OFF");
    } else {
      lcd.setCursor(0, 1);
      lcd.print("T:");
      lcd.print(temp1, 1);
      lcd.print("C H:");
      lcd.print(hum1, 0);
      lcd.print("%");
    }
    delay(4000);

    // ── Screen 2: Fridge 2 temp & humidity ──────
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Fridge 2");
    if (!r2Sys) {
      lcd.setCursor(0, 1);
      lcd.print("System OFF");
    } else {
      lcd.setCursor(0, 1);
      lcd.print("T:");
      lcd.print(temp2, 1);
      lcd.print("C H:");
      lcd.print(hum2, 0);
      lcd.print("%");
    }
    delay(4000);

    // ── Screen 3: Air quality (MQ135 raw ADC) ───
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Air Quality");
    lcd.setCursor(0, 1);
    lcd.print("MQ135: ");
    lcd.print(airQuality);
    delay(4000);

    // ── Screen 4: System status / alert ─────────
    lcd.clear();
    lcd.setCursor(0, 0);
    if (danger) {
      lcd.print("!! ALERT !!");
    } else {
      lcd.print("Status: OK");
    }
    lcd.setCursor(0, 1);
    lcd.print(alertMessage);
    delay(4000);
  }
  
  // SEND REAL-TIME DATA TO DASHBOARD
  sendTelemetryToBackend(realTemp1, hum1, realTemp2, hum2, temp1, hum1, temp2, hum2, airQuality);
}
