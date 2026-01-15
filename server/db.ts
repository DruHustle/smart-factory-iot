import { eq, and, gte, lte, desc, asc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";
import { ENV } from "./_core/env";

const {
  users,
  devices,
  sensorReadings,
  alertThresholds,
  alerts,
  firmwareVersions,
  otaDeployments,
} = schema;

export type User = schema.User;
export type InsertUser = schema.InsertUser;
export type Device = schema.Device;
export type InsertDevice = schema.InsertDevice;
export type SensorReading = schema.SensorReading;
export type InsertSensorReading = schema.InsertSensorReading;
export type AlertThreshold = schema.AlertThreshold;
export type InsertAlertThreshold = schema.InsertAlertThreshold;
export type Alert = schema.Alert;
export type InsertAlert = schema.InsertAlert;
export type FirmwareVersion = schema.FirmwareVersion;
export type InsertFirmwareVersion = schema.InsertFirmwareVersion;
export type OtaDeployment = schema.OtaDeployment;
export type InsertOtaDeployment = schema.InsertOtaDeployment;

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL, { schema, mode: "default" });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Helper for DB operations
async function withDb<T>(fn: (db: NonNullable<ReturnType<typeof drizzle>>) => Promise<T>): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return fn(db as NonNullable<ReturnType<typeof drizzle>>);
}

// ============ User Functions ============
export async function getUserByOpenId(openId: string) {
  return withDb(async (db) => {
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result[0];
  });
}

export async function getUserByEmail(email: string) {
  return withDb(async (db) => {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  });
}

export async function createUser(user: InsertUser) {
  return withDb(async (db) => {
    await db.insert(users).values(user);
    return getUserByEmail(user.email!);
  });
}

// ============ Device Functions ============
export async function createDevice(device: InsertDevice): Promise<Device> {
  return withDb(async (db) => {
    await db.insert(devices).values(device);
    const result = await db.select().from(devices).where(eq(devices.deviceId, device.deviceId)).limit(1);
    return result[0];
  });
}

export async function getDevices(filters?: {
  status?: Device["status"];
  type?: Device["type"];
  zone?: string;
}): Promise<Device[]> {
  return withDb(async (db) => {
    let query = db.select().from(devices);
    const conditions = [];

    if (filters?.status) conditions.push(eq(devices.status, filters.status));
    if (filters?.type) conditions.push(eq(devices.type, filters.type));
    if (filters?.zone) conditions.push(eq(devices.zone, filters.zone));

    const finalQuery = conditions.length > 0 ? query.where(and(...conditions)) : query;
    return finalQuery.orderBy(desc(devices.updatedAt));
  });
}

export async function getDeviceById(id: number): Promise<Device | undefined> {
  return withDb(async (db) => {
    const result = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
    return result[0];
  });
}

export async function getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
  return withDb(async (db) => {
    const result = await db.select().from(devices).where(eq(devices.deviceId, deviceId)).limit(1);
    return result[0];
  });
}

export async function updateDevice(id: number, data: Partial<InsertDevice>): Promise<Device | undefined> {
  return withDb(async (db) => {
    await db.update(devices).set(data).where(eq(devices.id, id));
    return getDeviceById(id);
  });
}

export async function deleteDevice(id: number): Promise<boolean> {
  return withDb(async (db) => {
    await db.delete(devices).where(eq(devices.id, id));
    return true;
  });
}

export async function getDeviceStats() {
  return withDb(async (db) => {
    const allDevices = await db.select().from(devices);
    const stats = {
      total: allDevices.length,
      online: allDevices.filter(d => d.status === 'online').length,
      offline: allDevices.filter(d => d.status === 'offline').length,
      maintenance: allDevices.filter(d => d.status === 'maintenance').length,
      error: allDevices.filter(d => d.status === 'error').length,
      byType: {} as Record<string, number>
    };
    
    allDevices.forEach(d => {
      stats.byType[d.type] = (stats.byType[d.type] || 0) + 1;
    });
    
    return stats;
  });
}

// ============ Sensor Reading Functions ============
export async function createSensorReading(reading: InsertSensorReading): Promise<void> {
  return withDb(async (db) => {
    await db.insert(sensorReadings).values(reading);
  });
}

export async function createSensorReadingsBatch(readings: InsertSensorReading[]): Promise<void> {
  if (readings.length === 0) return;
  return withDb(async (db) => {
    await db.insert(sensorReadings).values(readings);
  });
}

export async function getSensorReadings(
  deviceId: number,
  startTime: number,
  endTime: number,
  limit: number = 1000
): Promise<SensorReading[]> {
  return withDb(async (db) => {
    return db
      .select()
      .from(sensorReadings)
      .where(
        and(
          eq(sensorReadings.deviceId, deviceId),
          gte(sensorReadings.timestamp, startTime),
          lte(sensorReadings.timestamp, endTime)
        )
      )
      .orderBy(asc(sensorReadings.timestamp))
      .limit(limit);
  });
}

export async function getLatestReading(deviceId: number): Promise<SensorReading | undefined> {
  return withDb(async (db) => {
    const result = await db
      .select()
      .from(sensorReadings)
      .where(eq(sensorReadings.deviceId, deviceId))
      .orderBy(desc(sensorReadings.timestamp))
      .limit(1);
    return result[0];
  });
}

export async function getAggregatedReadings(
  deviceIds: number[],
  startTime: number,
  endTime: number,
  intervalMs: number = 3600000 // 1 hour default
) {
  return withDb(async (db) => {
    if (deviceIds.length === 0) return [];
    
    // Simple aggregation logic: group by interval
    const readings = await db
      .select()
      .from(sensorReadings)
      .where(
        and(
          inArray(sensorReadings.deviceId, deviceIds),
          gte(sensorReadings.timestamp, startTime),
          lte(sensorReadings.timestamp, endTime)
        )
      );

    const groups = new Map<number, SensorReading[]>();
    readings.forEach(r => {
      const bucket = Math.floor(r.timestamp / intervalMs) * intervalMs;
      if (!groups.has(bucket)) groups.set(bucket, []);
      groups.get(bucket)!.push(r);
    });

    return Array.from(groups.entries()).map(([timestamp, items]) => ({
      timestamp,
      avgTemperature: items.reduce((sum, i) => sum + (i.temperature || 0), 0) / items.length,
      avgHumidity: items.reduce((sum, i) => sum + (i.humidity || 0), 0) / items.length,
      avgPower: items.reduce((sum, i) => sum + (i.power || 0), 0) / items.length,
      avgVibration: items.reduce((sum, i) => sum + (i.vibration || 0), 0) / items.length,
      count: items.length
    })).sort((a, b) => a.timestamp - b.timestamp);
  });
}

// ============ Alert Threshold Functions ============
export async function getAlertThresholds(deviceId: number): Promise<AlertThreshold[]> {
  return withDb(async (db) => {
    return db.select().from(alertThresholds).where(eq(alertThresholds.deviceId, deviceId));
  });
}

export async function createAlertThreshold(threshold: InsertAlertThreshold): Promise<AlertThreshold> {
  return withDb(async (db) => {
    const result = await db.insert(alertThresholds).values(threshold);
    const id = Number(result[0].insertId);
    const created = await db.select().from(alertThresholds).where(eq(alertThresholds.id, id)).limit(1);
    return created[0];
  });
}

export async function updateAlertThreshold(id: number, data: Partial<InsertAlertThreshold>): Promise<AlertThreshold | undefined> {
  return withDb(async (db) => {
    await db.update(alertThresholds).set(data).where(eq(alertThresholds.id, id));
    const result = await db.select().from(alertThresholds).where(eq(alertThresholds.id, id)).limit(1);
    return result[0];
  });
}

export async function deleteAlertThreshold(id: number): Promise<boolean> {
  return withDb(async (db) => {
    await db.delete(alertThresholds).where(eq(alertThresholds.id, id));
    return true;
  });
}

export async function upsertAlertThresholds(deviceId: number, thresholds: InsertAlertThreshold[]): Promise<void> {
  return withDb(async (db) => {
    await db.delete(alertThresholds).where(eq(alertThresholds.deviceId, deviceId));
    if (thresholds.length > 0) {
      await db.insert(alertThresholds).values(thresholds);
    }
  });
}

// ============ Alert Functions ============
export async function createAlert(alert: InsertAlert): Promise<Alert> {
  return withDb(async (db) => {
    const result = await db.insert(alerts).values(alert);
    const id = Number(result[0].insertId);
    const created = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
    return created[0];
  });
}

export async function getAlerts(filters?: {
  deviceId?: number;
  status?: Alert["status"];
  severity?: Alert["severity"];
  limit?: number;
}) {
  return withDb(async (db) => {
    let query = db.select().from(alerts);
    const conditions = [];

    if (filters?.deviceId) conditions.push(eq(alerts.deviceId, filters.deviceId));
    if (filters?.status) conditions.push(eq(alerts.status, filters.status));
    if (filters?.severity) conditions.push(eq(alerts.severity, filters.severity));

    const finalQuery = conditions.length > 0 ? query.where(and(...conditions)) : query;
    return finalQuery.orderBy(desc(alerts.createdAt)).limit(filters?.limit || 100);
  });
}

export async function updateAlert(id: number, data: Partial<InsertAlert>): Promise<Alert | undefined> {
  return withDb(async (db) => {
    await db.update(alerts).set(data).where(eq(alerts.id, id));
    const result = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
    return result[0];
  });
}

export async function getAlertStats() {
  return withDb(async (db) => {
    const allAlerts = await db.select().from(alerts);
    return {
      total: allAlerts.length,
      active: allAlerts.filter(a => a.status === 'active').length,
      acknowledged: allAlerts.filter(a => a.status === 'acknowledged').length,
      resolved: allAlerts.filter(a => a.status === 'resolved').length,
      critical: allAlerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
      warning: allAlerts.filter(a => a.severity === 'warning' && a.status === 'active').length,
      info: allAlerts.filter(a => a.severity === 'info' && a.status === 'active').length,
    };
  });
}

// ============ Firmware & OTA Functions ============
export async function createFirmwareVersion(fw: InsertFirmwareVersion): Promise<FirmwareVersion> {
  return withDb(async (db) => {
    await db.insert(firmwareVersions).values(fw);
    const result = await db.select().from(firmwareVersions).where(eq(firmwareVersions.version, fw.version)).limit(1);
    return result[0];
  });
}

export async function getFirmwareVersions(deviceType?: Device["type"]) {
  return withDb(async (db) => {
    let query = db.select().from(firmwareVersions);
    if (deviceType) query = query.where(eq(firmwareVersions.deviceType, deviceType)) as typeof query;
    return query.orderBy(desc(firmwareVersions.createdAt));
  });
}

export async function createOtaDeployment(deployment: InsertOtaDeployment): Promise<OtaDeployment> {
  return withDb(async (db) => {
    const result = await db.insert(otaDeployments).values(deployment);
    const id = Number(result[0].insertId);
    const created = await db.select().from(otaDeployments).where(eq(otaDeployments.id, id)).limit(1);
    return created[0];
  });
}

export async function getOtaDeployments(filters?: { deviceId?: number; limit?: number }) {
  return withDb(async (db) => {
    let query = db.select().from(otaDeployments);
    if (filters?.deviceId) query = query.where(eq(otaDeployments.deviceId, filters.deviceId)) as typeof query;
    return query.orderBy(desc(otaDeployments.createdAt)).limit(filters?.limit || 50);
  });
}

export async function updateOtaDeployment(id: number, data: Partial<InsertOtaDeployment>): Promise<OtaDeployment | undefined> {
  return withDb(async (db) => {
    await db.update(otaDeployments).set(data).where(eq(otaDeployments.id, id));
    const result = await db.select().from(otaDeployments).where(eq(otaDeployments.id, id)).limit(1);
    return result[0];
  });
}
