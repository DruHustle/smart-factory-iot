#include <Servo.h>
#include <Wire.h>
#include <SSD1306Ascii.h>
#include <SSD1306AsciiWire.h>

// ADA031 V4 five-axis controller. Calibrate every pose at low power before use.
const byte SERVO_PINS[5] = {9, 6, 5, 3, 11};
const byte BUTTON_PIN = 4; // ArmBoard pushbutton, active LOW
const byte MIN_DEG[5] = {0, 0, 0, 0, 35};
const byte MAX_DEG[5] = {180, 180, 180, 180, 90};
const byte NEUTRAL[5] = {90, 90, 90, 90, 90};
Servo servos[5];
byte target[5] = {90, 90, 90, 90, 90};
// Text-only driver avoids the 1024-byte framebuffer required by graphics
// libraries, leaving enough RAM for servos and telemetry on the ATmega328P.
SSD1306AsciiWire display;
bool oledReady = false;
char lastAction[18] = "READY";
bool calibrationMode = false;
bool potentiometersMatched = false;
byte potentiometerTarget[5] = {90, 90, 90, 90, 90};
unsigned long lastCalibrationUpdate = 0;
unsigned long lastCalibrationTelemetry = 0;
unsigned long lastOledRefresh = 0;
unsigned long lastPeriodicTelemetry = 0;
const unsigned long PERIODIC_TELEMETRY_MS = 2000;

enum Program { IDLE, PICK_AND_PLACE, DEMONSTRATION };
Program program = IDLE;
bool stopRequested = false;
bool neutralAfterButtonStop = false;
byte buttonState = HIGH;
byte lastButtonReading = HIGH;
unsigned long buttonChangedAt = 0;
const unsigned long BUTTON_DEBOUNCE_MS = 35;
unsigned long cycleCount = 0;
unsigned long successfulCycles = 0;
unsigned long interruptedCycles = 0;
unsigned long failedCycles = 0;
unsigned long lastCycleMs = 0;
byte activeSequenceStep = 0;
bool movementActive = false;

void renderOled() {
  if (!oledReady) return;
  display.clear();
  display.setCursor(0, 0);
  if (calibrationMode) display.println(potentiometersMatched ? F("CAL: POT CONTROL") : F("CAL: MATCH POTS"));
  else if (program == PICK_AND_PLACE) {
    display.print(F("PICK "));
    if (activeSequenceStep == 1) display.println(F("1/3: A"));
    else if (activeSequenceStep == 2) display.println(F("2/3: B"));
    else if (activeSequenceStep == 3) display.println(F("3/3: A"));
    else display.println(F("A-B-A"));
  }
  else if (program == DEMONSTRATION) display.println(F("MODE: DEMO"));
  else display.println(F("MODE: IDLE"));

  display.print(F("M B")); display.print(target[0]); display.print(F(" S")); display.println(target[1]);
  display.print(F("M E")); display.print(target[2]); display.print(F(" W")); display.println(target[3]);
  display.print(F("M G")); display.println(target[4]);
  display.print(F("ACT: ")); display.println(lastAction);
  if (calibrationMode) {
    display.print(F("P B")); display.print(potentiometerTarget[0]); display.print(F(" S")); display.println(potentiometerTarget[1]);
    display.print(F("P E")); display.print(potentiometerTarget[2]); display.print(F(" W")); display.println(potentiometerTarget[3]);
    display.print(F("P G")); display.println(potentiometerTarget[4]);
  }
}

void setAction(const char *message) {
  strncpy(lastAction, message, sizeof(lastAction) - 1);
  lastAction[sizeof(lastAction) - 1] = '\0';
  renderOled();
}

void reportI2cDevices() {
  byte found = 0;
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      Serial.print(F("{\"i2c_address\":\"0x"));
      if (address < 16) Serial.print('0');
      Serial.print(address, HEX);
      Serial.println(F("\"}"));
      found++;
    }
  }
  if (!found) Serial.println(F("{\"i2c_devices\":0}"));
}

void blinkStatus(byte count) {
  for (byte i = 0; i < count; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(140);
    digitalWrite(LED_BUILTIN, LOW);
    delay(140);
  }
}

// User-taught endpoints from firmware/ada301/calibration-points.json.
const byte POINT_A[5] = {90, 90, 90, 90, 90};
const byte POINT_B[5] = {180, 180, 59, 0, 57};
const byte PICK_POSES[][5] = {
  {90, 90, 90, 90, 90},
  {180, 180, 59, 0, 57},
  {90, 90, 90, 90, 90}
};
const byte DEMO_POSES[][5] = {
  {90, 90, 90, 90, 90}, {70, 105, 80, 55, 90}, {70, 105, 80, 55, 45},
  {110, 75, 105, 125, 45}, {90, 65, 115, 45, 45}, {90, 90, 90, 90, 90}
};

byte clampAngle(byte axis, int value) {
  return constrain(value, MIN_DEG[axis], MAX_DEG[axis]);
}

void publishTelemetry() {
  Serial.print(F("{\"cycle_count\":")); Serial.print(cycleCount);
  Serial.print(F(",\"successful_cycles\":")); Serial.print(successfulCycles);
  Serial.print(F(",\"interrupted_cycles\":")); Serial.print(interruptedCycles);
  Serial.print(F(",\"failed_cycles\":")); Serial.print(failedCycles);
  Serial.print(F(",\"cycle_time_ms\":")); Serial.print(lastCycleMs);
  Serial.print(F(",\"active_profile\":")); Serial.print((int)program);
  Serial.print(F(",\"sequence_step\":")); Serial.print(activeSequenceStep);
  Serial.print(F(",\"movement_active\":")); Serial.print(movementActive ? 1 : 0);
  Serial.print(F(",\"button_pressed\":")); Serial.print(buttonState == LOW ? 1 : 0);
  Serial.print(F(",\"uptime_ms\":")); Serial.print(millis());
  Serial.print(F(",\"calibration_mode\":")); Serial.print(calibrationMode ? 1 : 0);
  Serial.print(F(",\"pots_matched\":")); Serial.print(potentiometersMatched ? 1 : 0);
  for (byte i = 0; i < 5; i++) { Serial.print(F(",\"servo_")); Serial.print(i + 1); Serial.print(F("_deg\":")); Serial.print(target[i]); }
  if (calibrationMode) {
    for (byte i = 0; i < 5; i++) { Serial.print(F(",\"pot_")); Serial.print(i + 1); Serial.print(F("_deg\":")); Serial.print(potentiometerTarget[i]); }
  }
  Serial.println(F("}"));
  lastPeriodicTelemetry = millis();
}

void readPotentiometers() {
  // The ArmBoard pots are electrically reversed: fully counter-clockwise reads
  // near 1023, while fully clockwise reads near 0.
  potentiometerTarget[0] = map(analogRead(0), 1023, 0, MIN_DEG[0], MAX_DEG[0]);
  potentiometerTarget[1] = map(analogRead(1), 1023, 0, MIN_DEG[1], MAX_DEG[1]);
  potentiometerTarget[2] = map(analogRead(2), 1023, 0, MIN_DEG[2], MAX_DEG[2]);
  potentiometerTarget[3] = map(analogRead(3), 1023, 0, MIN_DEG[3], MAX_DEG[3]);
  potentiometerTarget[4] = map(analogRead(6), 1023, 0, MIN_DEG[4], MAX_DEG[4]);
}

void updateCalibration() {
  if (millis() - lastCalibrationUpdate < 75) return;
  lastCalibrationUpdate = millis();
  readPotentiometers();
  if (!potentiometersMatched) {
    bool allMatched = true;
    for (byte i = 0; i < 5; i++) if (abs((int)potentiometerTarget[i] - (int)target[i]) > 5) allMatched = false;
    if (allMatched) {
      potentiometersMatched = true;
      strncpy(lastAction, "POT CONTROL", sizeof(lastAction) - 1);
    } else {
      strncpy(lastAction, "MATCH POTS", sizeof(lastAction) - 1);
    }
    lastAction[sizeof(lastAction) - 1] = '\0';
  } else {
    bool changed = false;
    for (byte i = 0; i < 5; i++) {
      if (abs((int)potentiometerTarget[i] - (int)target[i]) > 1) {
        target[i] = clampAngle(i, potentiometerTarget[i]);
        servos[i].write(target[i]);
        changed = true;
      }
    }
    if (changed) renderOled();
  }
  if (millis() - lastOledRefresh >= 250) {
    lastOledRefresh = millis();
    renderOled();
  }
  if (millis() - lastCalibrationTelemetry >= 500) {
    lastCalibrationTelemetry = millis();
    publishTelemetry();
  }
}

void pollStop() {
  if (Serial.available() && Serial.peek() == 'S') { Serial.read(); stopRequested = true; }
}

void handleButtonPress() {
  calibrationMode = false;
  potentiometersMatched = false;
  if (program == PICK_AND_PLACE || program == DEMONSTRATION) {
    stopRequested = true;
    neutralAfterButtonStop = true;
    setAction("STOP -> 90");
  } else {
    program = PICK_AND_PLACE;
    stopRequested = false;
    neutralAfterButtonStop = false;
    setAction("A-B-A START");
    blinkStatus(2);
  }
  publishTelemetry();
}

void updateButton() {
  const byte reading = digitalRead(BUTTON_PIN);
  const unsigned long now = millis();
  if (reading != lastButtonReading) {
    lastButtonReading = reading;
    buttonChangedAt = now;
  }
  if (now - buttonChangedAt >= BUTTON_DEBOUNCE_MS && reading != buttonState) {
    buttonState = reading;
    if (buttonState == LOW) handleButtonPress();
  }
}

bool moveTo(const byte pose[5]) {
  bool neutralPose = true;
  for (byte i = 0; i < 5; i++) if (pose[i] != NEUTRAL[i]) neutralPose = false;

  movementActive = true;
  setAction("MOVING");
  publishTelemetry();
  digitalWrite(LED_BUILTIN, HIGH);

  if (neutralPose) {
    // Return to the standing pose one joint at a time, from the gripper back
    // toward the base: gripper, wrist, elbow, shoulder, base.
    for (int axis = 4; axis >= 0; axis--) {
      const byte desired = clampAngle(axis, pose[axis]);
      while (target[axis] != desired) {
        updateButton();
        if (neutralAfterButtonStop) {
          digitalWrite(LED_BUILTIN, LOW);
          movementActive = false;
          publishTelemetry();
          return false;
        }
        if (target[axis] < desired) target[axis]++;
        else target[axis]--;
        servos[axis].write(target[axis]);
        pollStop();
        delay(20);
      }
    }
  } else {
    bool moving = true;
    while (moving) {
      updateButton();
      if (neutralAfterButtonStop) {
        digitalWrite(LED_BUILTIN, LOW);
        movementActive = false;
        publishTelemetry();
        return false;
      }
      moving = false;
      pollStop();
      for (byte i = 0; i < 5; i++) {
        byte desired = clampAngle(i, pose[i]);
        if (target[i] < desired) { target[i]++; moving = true; }
        else if (target[i] > desired) { target[i]--; moving = true; }
        servos[i].write(target[i]);
      }
      delay(20);
    }
  }

  digitalWrite(LED_BUILTIN, LOW);
  movementActive = false;
  setAction("POSE DONE");
  publishTelemetry();
  return true;
}

void runCycle(const byte poses[][5], byte count) {
  unsigned long started = millis();
  bool ok = true;
  for (byte i = 0; i < count; i++) {
    activeSequenceStep = i + 1;
    if (!moveTo(poses[i])) { ok = false; break; }
    if (stopRequested && i + 1 < count) { ok = false; break; }
    delay(250);
  }
  lastCycleMs = millis() - started;
  cycleCount++;
  // A user-requested stop is an interrupted cycle, not evidence of a servo or
  // process failure. This controller has no sensors that can prove such faults.
  if (ok) successfulCycles++; else interruptedCycles++;
  activeSequenceStep = 0;
  publishTelemetry();
  if (neutralAfterButtonStop) {
    neutralAfterButtonStop = false;
    stopRequested = false;
    moveTo(NEUTRAL);
    program = IDLE;
    activeSequenceStep = 0;
    setAction("NEUTRAL 90");
    publishTelemetry();
    return;
  }
  if (stopRequested) { program = IDLE; stopRequested = false; }
}

void jog(byte axis, int delta) {
  program = IDLE;
  target[axis] = clampAngle(axis, target[axis] + delta);
  servos[axis].write(target[axis]);
  const char *increaseLabels[5] = {"BASE +", "SHOULDER +", "ELBOW +", "WRIST +", "GRIP +"};
  const char *decreaseLabels[5] = {"BASE -", "SHOULDER -", "ELBOW -", "WRIST -", "GRIP -"};
  setAction(delta > 0 ? increaseLabels[axis] : decreaseLabels[axis]);
  digitalWrite(LED_BUILTIN, HIGH);
  delay(80);
  digitalWrite(LED_BUILTIN, LOW);
  publishTelemetry();
}

void handleCommand(char command) {
  if (calibrationMode) {
    if (command == 'X') { calibrationMode = false; potentiometersMatched = false; setAction("CAL SAVED"); publishTelemetry(); }
    else if (command == 'A') { setAction("POSE A READY"); publishTelemetry(); }
    else if (command == 'B') { setAction("POSE B READY"); publishTelemetry(); }
    return;
  }
  switch (command) {
    case 'o': jog(0, 1); break; case 'p': jog(0, -1); break;
    case 'u': jog(1, 1); break; case 'i': jog(1, -1); break;
    case 't': jog(2, 1); break; case 'y': jog(2, -1); break;
    case 'e': jog(3, 1); break; case 'r': jog(3, -1); break;
    case 'q': jog(4, 10); break; case 'w': jog(4, -10); break;
    case 'N': program = IDLE; stopRequested = false; blinkStatus(1); moveTo(NEUTRAL); break;
    case 'P': program = PICK_AND_PLACE; stopRequested = false; setAction("PICK START"); blinkStatus(2); break;
    case 'D': program = DEMONSTRATION; stopRequested = false; setAction("DEMO START"); blinkStatus(3); break;
    case 'S': stopRequested = true; setAction("STOP REQUESTED"); digitalWrite(LED_BUILTIN, LOW); break;
    case 'C': program = IDLE; calibrationMode = true; potentiometersMatched = false; readPotentiometers(); setAction("MATCH POTS"); publishTelemetry(); break;
  }
}

void setup() {
  Serial.begin(9600);
  Wire.begin();
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  buttonState = lastButtonReading = digitalRead(BUTTON_PIN);
  buttonChangedAt = millis();
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  for (byte i = 0; i < 5; i++) { servos[i].attach(SERVO_PINS[i]); servos[i].write(NEUTRAL[i]); }
  delay(500);
  reportI2cDevices();
  display.begin(&Adafruit128x64, 0x3C);
  display.setFont(System5x7);
  oledReady = true;
  renderOled();
  publishTelemetry();
}

void loop() {
  updateButton();
  while (Serial.available()) handleCommand(Serial.read());
  if (calibrationMode) updateCalibration();
  else if (program == PICK_AND_PLACE) runCycle(PICK_POSES, sizeof(PICK_POSES) / sizeof(PICK_POSES[0]));
  else if (program == DEMONSTRATION) runCycle(DEMO_POSES, sizeof(DEMO_POSES) / sizeof(DEMO_POSES[0]));
  else if (neutralAfterButtonStop) {
    neutralAfterButtonStop = false;
    stopRequested = false;
    moveTo(NEUTRAL);
    setAction("NEUTRAL 90");
    publishTelemetry();
  }
  else if (millis() - lastPeriodicTelemetry >= PERIODIC_TELEMETRY_MS) {
    // Keep gateway/device freshness meaningful even while the arm is holding.
    // These are controller targets and state, not independent position proof.
    publishTelemetry();
  }
  if (program == IDLE && !calibrationMode) delay(5);
}
