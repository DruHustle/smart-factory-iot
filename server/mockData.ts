import { nanoid } from "nanoid";

// Device types and their typical sensor ranges
const deviceConfigs = {
  sensor: {
    temperature: { min: 15, max: 85, unit: "°C" },
    humidity: { min: 20, max: 80, unit: "%" },
    vibration: { min: 0, max: 10, unit: "mm/s" },
    power: { min: 0, max: 500, unit: "W" },
  },
  actuator: {
    temperature: { min: 20, max: 60, unit: "°C" },
    power: { min: 50, max: 2000, unit: "W" },
    rpm: { min: 0, max: 3000, unit: "RPM" },
  },
  controller: {
    temperature: { min: 25, max: 45, unit: "°C" },
    power: { min: 10, max: 100, unit: "W" },
  },
  gateway: {
    temperature: { min: 20, max: 50, unit: "°C" },
    power: { min: 5, max: 30, unit: "W" },
  },
};

const zones = ["Assembly Line A", "Assembly Line B", "Packaging", "Quality Control", "Warehouse", "Maintenance Bay"];
const locations = ["Floor 1", "Floor 2", "Floor 3", "Outdoor", "Basement"];

export function generateDeviceId(): string {
  return `DEV-${nanoid(8).toUpperCase()}`;
}

export function generateRandomDevice(type: keyof typeof deviceConfigs) {
  const zone = zones[Math.floor(Math.random() * zones.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  const statuses = ["online", "offline", "maintenance", "error"] as const;
  const statusWeights = [0.7, 0.15, 0.1, 0.05];
  
  let statusRandom = Math.random();
  let status: typeof statuses[number] = "online";
  let cumulative = 0;
  for (let i = 0; i < statuses.length; i++) {
    cumulative += statusWeights[i];
    if (statusRandom < cumulative) {
      status = statuses[i];
      break;
    }
  }

  return {
    deviceId: generateDeviceId(),
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${zone} ${Math.floor(Math.random() * 100)}`,
    type,
    status,
    location,
    zone,
    firmwareVersion: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 20)}`,
    lastSeen: status === "online" ? new Date() : new Date(Date.now() - Math.random() * 86400000),
    metadata: {
      manufacturer: ["Siemens", "ABB", "Schneider", "Honeywell"][Math.floor(Math.random() * 4)],
      model: `Model-${nanoid(4).toUpperCase()}`,
      installDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
  };
}

export function generateSensorReading(deviceId: number, deviceType: keyof typeof deviceConfigs, timestamp: number) {
  const config = deviceConfigs[deviceType];
  
  const generateValue = (range: { min: number; max: number } | undefined) => {
    if (!range) return null;
    const base = range.min + Math.random() * (range.max - range.min);
    // Add some noise
    const noise = (Math.random() - 0.5) * (range.max - range.min) * 0.1;
    return Math.round((base + noise) * 100) / 100;
  };

  return {
    deviceId,
    temperature: generateValue(config.temperature),
    humidity: "humidity" in config ? generateValue(config.humidity) : null,
    vibration: "vibration" in config ? generateValue(config.vibration) : null,
    power: generateValue(config.power),
    pressure: null,
    rpm: "rpm" in config ? generateValue(config.rpm) : null,
    timestamp,
  };
}

export function generateHistoricalReadings(
  deviceId: number,
  deviceType: keyof typeof deviceConfigs,
  startTime: number,
  endTime: number,
  intervalMs: number = 60000 // 1 minute default
) {
  const readings = [];
  for (let t = startTime; t <= endTime; t += intervalMs) {
    readings.push(generateSensorReading(deviceId, deviceType, t));
  }
  return readings;
}

export function generateDefaultThresholds(deviceId: number, deviceType: keyof typeof deviceConfigs) {
  const config = deviceConfigs[deviceType];
  const thresholds = [];

  for (const [metric, range] of Object.entries(config)) {
    const spread = range.max - range.min;
    thresholds.push({
      deviceId,
      metric: metric as "temperature" | "humidity" | "vibration" | "power" | "pressure" | "rpm",
      minValue: range.min + spread * 0.1,
      maxValue: range.max - spread * 0.1,
      warningMin: range.min + spread * 0.2,
      warningMax: range.max - spread * 0.2,
      enabled: true,
    });
  }

  return thresholds;
}

export function generateAlert(
  deviceId: number,
  type: "threshold_exceeded" | "device_offline" | "firmware_update" | "maintenance_required" | "system_error",
  severity: "info" | "warning" | "critical"
) {
  const messages = {
    threshold_exceeded: [
      "Temperature exceeded maximum threshold",
      "Vibration levels abnormally high",
      "Power consumption spike detected",
      "Humidity outside acceptable range",
    ],
    device_offline: ["Device connection lost", "No heartbeat received", "Communication timeout"],
    firmware_update: ["New firmware available", "Firmware update required for security patch"],
    maintenance_required: ["Scheduled maintenance due", "Component wear detected", "Calibration needed"],
    system_error: ["Internal sensor error", "Memory overflow detected", "Configuration corrupted"],
  };

  const messageList = messages[type];
  const message = messageList[Math.floor(Math.random() * messageList.length)];

  return {
    deviceId,
    type,
    severity,
    message,
    status: "active" as const,
  };
}

export const firmwareVersionsList = [
  { version: "v1.0.0", releaseNotes: "Initial release", isStable: true },
  { version: "v1.1.0", releaseNotes: "Bug fixes and performance improvements", isStable: true },
  { version: "v1.2.0", releaseNotes: "Added new sensor calibration features", isStable: true },
  { version: "v2.0.0", releaseNotes: "Major update with new communication protocol", isStable: true },
  { version: "v2.1.0-beta", releaseNotes: "Beta release with experimental features", isStable: false },
  { version: "v2.1.0", releaseNotes: "Stable release with enhanced security", isStable: true },
];
