// ==========================================
// ColdChain Sentinel Prototype
// ESP32 + DHT11 + MQ135 + LCD + Relays
// ==========================================

// | Component   | GPIO    |
// | ----------- | ------- |
// | DHT11 Room1 | GPIO 4  |
// | DHT11 Room2 | GPIO 5  |
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
#include <DHT.h>
#include <LiquidCrystal_I2C.h>
#include <Wire.h>

// =========================
// WIFI CONFIGURATION
// =========================
const char* ssid = "Murenzi";
const char* password = "new2o@2E";

// REPLACE "YOUR_COMPUTER_IP_ADDRESS" with the local IP of the PC running the backend
const char* backendUrl = "http://192.168.1.103:5000/api/telemetry";

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

// =========================
// TARGET TEMPERATURE RANGES
// =========================

// Room 1 (Vaccine fridge simulation)
float room1Min = 2.0;
float room1Max = 8.0;

// Room 2 (Frozen storage simulation)
float room2Min = 0.0;
float room2Max = 2.0;

// =========================
// VARIABLES
// =========================
float realTemp1, hum1;
float realTemp2, hum2;

float temp1;
float temp2;

int airQuality;

String alertMessage = "SAFE";

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

void sendTelemetryToBackend(float realT1, float realH1, float realT2, float realH2, float t1, float h1, float t2, float h2, int aqi) {
  if(WiFi.status() == WL_CONNECTED){
    HTTPClient http;
    
    http.begin(backendUrl);
    http.addHeader("Content-Type", "application/json");

    float avgTemp = (realT1 + realT2) / 2.0;
    float avgHum = (realH1 + realH2) / 2.0;

    // Construct the JSON payload mapping your sensors to the dashboard IPs
    String payload = "{\"secret\":\"supersecretkey123\",\"room\":{\"ip\":\"192.168.1.20\",\"airQuality\":";
    payload += String(aqi);
    payload += ",\"ambientTemp\":";
    payload += String(avgTemp, 1);
    payload += ",\"ambientHum\":";
    payload += String(avgHum, 0);
    payload += "},\"fridges\":[{\"ip\":\"192.168.1.10\",\"temperature\":";
    payload += String(t1, 1);
    payload += ",\"humidity\":";
    payload += String(h1, 0);
    payload += "},{\"ip\":\"192.168.1.11\",\"temperature\":";
    payload += String(t2, 1);
    payload += ",\"humidity\":";
    payload += String(h2, 0);
    payload += "}]}";

    int httpResponseCode = http.POST(payload);
    
    if(httpResponseCode > 0){
      Serial.print("Backend Response: ");
      Serial.println(httpResponseCode);
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

  // =========================
  // ROOM 1 CONTROL
  // =========================

  if (temp1 > room1Max) {

    digitalWrite(COOL_FAN_ROOM1, HIGH);

  } else {

    digitalWrite(COOL_FAN_ROOM1, LOW);
  }

  // =========================
  // ROOM 2 CONTROL
  // =========================

  if (temp2 > room2Max) {

    // Too hot -> cooling ON
    digitalWrite(COOL_FAN_ROOM2, HIGH);
    digitalWrite(WARM_FAN_ROOM2, LOW);

  }
  else if (temp2 < room2Min) {

    // Too cold -> warming ON
    digitalWrite(COOL_FAN_ROOM2, LOW);
    digitalWrite(WARM_FAN_ROOM2, HIGH);

  }
  else {

    // Safe range
    digitalWrite(COOL_FAN_ROOM2, LOW);
    digitalWrite(WARM_FAN_ROOM2, LOW);
  }

  // =========================
  // ALERT DETECTION
  // =========================

  bool danger = false;

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

  // =========================
  // LCD SCREEN 1
  // =========================

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("R1:");
  lcd.print(temp1, 1);
  lcd.print((char)223);
  lcd.print("C");

  lcd.setCursor(0, 1);
  lcd.print("H1:");
  lcd.print(hum1, 0);
  lcd.print("%");

  delay(1600); // 1.6 seconds

  // =========================
  // LCD SCREEN 2
  // =========================

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("R2:");
  lcd.print(temp2, 1);
  lcd.print((char)223);
  lcd.print("C");

  lcd.setCursor(0, 1);
  lcd.print("H2:");
  lcd.print(hum2, 0);
  lcd.print("%");

  delay(1600); // 1.6 seconds

  // =========================
  // LCD SCREEN 3
  // =========================

  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("Air:");
  lcd.print(airQuality);

  lcd.setCursor(0, 1);
  lcd.print(alertMessage);

  delay(1600); // 1.6 seconds
  
  // SEND REAL-TIME DATA TO DASHBOARD
  sendTelemetryToBackend(realTemp1, hum1, realTemp2, hum2, temp1, hum1, temp2, hum2, airQuality);
}
