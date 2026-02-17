import { bigint, boolean, integer, json, pgEnum, pgTable, real, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const deviceTypeEnum = pgEnum("device_type", ["sensor", "actuator", "controller", "gateway"]);
export const deviceStatusEnum = pgEnum("device_status", ["online", "offline", "maintenance", "error"]);
export const metricEnum = pgEnum("metric", ["temperature", "humidity", "vibration", "power", "pressure", "rpm"]);
export const alertTypeEnum = pgEnum("alert_type", ["threshold_exceeded", "device_offline", "firmware_update", "maintenance_required", "system_error"]);
export const alertSeverityEnum = pgEnum("alert_severity", ["info", "warning", "critical"]);
export const alertStatusEnum = pgEnum("alert_status", ["active", "acknowledged", "resolved"]);
export const otaStatusEnum = pgEnum("ota_status", ["pending", "downloading", "installing", "completed", "failed", "rolled_back"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  password: text("password"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Devices table - represents IoT edge devices in the factory
 */
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  deviceId: varchar("deviceId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  type: deviceTypeEnum("type").notNull(),
  status: deviceStatusEnum("status").default("offline").notNull(),
  location: varchar("location", { length: 255 }),
  zone: varchar("zone", { length: 100 }),
  firmwareVersion: varchar("firmwareVersion", { length: 50 }),
  lastSeen: timestamp("lastSeen", { withTimezone: true }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

/**
 * Sensor readings table - stores time-series sensor data
 */
export const sensorReadings = pgTable("sensor_readings", {
  id: serial("id").primaryKey(),
  deviceId: integer("deviceId").notNull(),
  temperature: real("temperature"),
  humidity: real("humidity"),
  vibration: real("vibration"),
  power: real("power"),
  pressure: real("pressure"),
  rpm: real("rpm"),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type SensorReading = typeof sensorReadings.$inferSelect;
export type InsertSensorReading = typeof sensorReadings.$inferInsert;

/**
 * Alert thresholds table - custom thresholds per device
 */
export const alertThresholds = pgTable("alert_thresholds", {
  id: serial("id").primaryKey(),
  deviceId: integer("deviceId").notNull(),
  metric: metricEnum("metric").notNull(),
  minValue: real("minValue"),
  maxValue: real("maxValue"),
  warningMin: real("warningMin"),
  warningMax: real("warningMax"),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type AlertThreshold = typeof alertThresholds.$inferSelect;
export type InsertAlertThreshold = typeof alertThresholds.$inferInsert;

/**
 * Alerts table - stores triggered alerts
 */
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  deviceId: integer("deviceId").notNull(),
  type: alertTypeEnum("type").notNull(),
  severity: alertSeverityEnum("severity").notNull(),
  metric: varchar("metric", { length: 50 }),
  value: real("value"),
  threshold: real("threshold"),
  message: text("message").notNull(),
  status: alertStatusEnum("status").default("active").notNull(),
  acknowledgedBy: integer("acknowledgedBy"),
  acknowledgedAt: timestamp("acknowledgedAt", { withTimezone: true }),
  resolvedAt: timestamp("resolvedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * Firmware versions table - available firmware for OTA updates
 */
export const firmwareVersions = pgTable("firmware_versions", {
  id: serial("id").primaryKey(),
  version: varchar("version", { length: 50 }).notNull().unique(),
  deviceType: deviceTypeEnum("deviceType").notNull(),
  releaseNotes: text("releaseNotes"),
  fileUrl: varchar("fileUrl", { length: 512 }),
  fileSize: integer("fileSize"),
  checksum: varchar("checksum", { length: 128 }),
  isStable: boolean("isStable").default(false).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type FirmwareVersion = typeof firmwareVersions.$inferSelect;
export type InsertFirmwareVersion = typeof firmwareVersions.$inferInsert;

/**
 * OTA deployments table - tracks firmware deployments to devices
 */
export const otaDeployments = pgTable("ota_deployments", {
  id: serial("id").primaryKey(),
  deviceId: integer("deviceId").notNull(),
  firmwareVersionId: integer("firmwareVersionId").notNull(),
  previousVersion: varchar("previousVersion", { length: 50 }),
  status: otaStatusEnum("status").default("pending").notNull(),
  progress: integer("progress").default(0),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt", { withTimezone: true }),
  completedAt: timestamp("completedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type OtaDeployment = typeof otaDeployments.$inferSelect;
export type InsertOtaDeployment = typeof otaDeployments.$inferInsert;
