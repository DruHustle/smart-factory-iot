import { eq, and, gte, lte, desc, asc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  devices,
  sensorReadings,
  alertThresholds,
  alerts,
  firmwareVersions,
  otaDeployments,
  Device,
  InsertDevice,
  SensorReading,
  InsertSensorReading,
  AlertThreshold,
  InsertAlertThreshold,
  Alert,
  InsertAlert,
  FirmwareVersion,
  InsertFirmwareVersion,
  OtaDeployment,
  InsertOtaDeployment,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User Functions ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(users).values(user);
  return getUserByEmail(user.email!);
}

// ============ Device Functions ============
export async function createDevice(device: InsertDevice): Promise<Device> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(devices).values(device);
  const result = await db.select().from(devices).where(eq(devices.deviceId, device.deviceId)).limit(1);
  return result[0];
}

export async function getDevices(filters?: {
  status?: Device["status"];
  type?: Device["type"];
  zone?: string;
}): Promise<Device[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(devices);
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(devices.status, filters.status));
  }
  if (filters?.type) {
    conditions.push(eq(devices.type, filters.type));
  }
  if (filters?.zone) {
    conditions.push(eq(devices.zone, filters.zone));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query.orderBy(desc(devices.updatedAt));
}

export async function getDeviceById(id: number): Promise<Device | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
  return result[0];
}

export async function getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(devices).where(eq(devices.deviceId, deviceId)).limit(1);
  return result[0];
}

export async function updateDevice(id: number, data: Partial<InsertDevice>): Promise<Device | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(devices).set(data).where(eq(devices.id, id));
  return getDeviceById(id);
}

export async function deleteDevice(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db.delete(devices).where(eq(devices.id, id));
  return true;
}

// ============ Sensor Reading Functions ============
export async function createSensorReading(reading: InsertSensorReading): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(sensorReadings).values(reading);
}

export async function createSensorReadingsBatch(readings: InsertSensorReading[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (readings.length === 0) return;
  await db.insert(sensorReadings).values(readings);
}

export async function getSensorReadings(
  deviceId: number,
  startTime: number,
  endTime: number,
  limit: number = 1000
): Promise<SensorReading[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Connection unavailable for getSensorReadings");
  }

  try {
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
  } catch (error) {
    console.error(`[Database] Failed to fetch sensor readings for device ${deviceId}:`, error);
    throw error;
  }
}

export async function getLatestReading(deviceId: number): Promise<SensorReading | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(sensorReadings)
    .where(eq(sensorReadings.deviceId, deviceId))
    .orderBy(desc(sensorReadings.timestamp))
    .limit(1);

  return result[0];
}

// ============ Alert Threshold Functions ============
export async function createAlertThreshold(threshold: InsertAlertThreshold): Promise<AlertThreshold> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(alertThresholds).values(threshold);
  const id = Number(result[0].insertId);
  const created = await db.select().from(alertThresholds).where(eq(alertThresholds.id, id)).limit(1);
  return created[0];
}

export async function getAlertThresholds(deviceId: number): Promise<AlertThreshold[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Connection unavailable for getAlertThresholds");
  }

  try {
    return db.select().from(alertThresholds).where(eq(alertThresholds.deviceId, deviceId));
  } catch (error) {
    console.error(`[Database] Failed to fetch alert thresholds for device ${deviceId}:`, error);
    throw error;
  }
}

export async function updateAlertThreshold(
  id: number,
  data: Partial<InsertAlertThreshold>
): Promise<AlertThreshold | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(alertThresholds).set(data).where(eq(alertThresholds.id, id));
  const result = await db.select().from(alertThresholds).where(eq(alertThresholds.id, id)).limit(1);
  return result[0];
}

export async function deleteAlertThreshold(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db.delete(alertThresholds).where(eq(alertThresholds.id, id));
  return true;
}

export async function upsertAlertThresholds(deviceId: number, thresholds: InsertAlertThreshold[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete existing thresholds for the device
  await db.delete(alertThresholds).where(eq(alertThresholds.deviceId, deviceId));

  // Insert new thresholds
  if (thresholds.length > 0) {
    await db.insert(alertThresholds).values(thresholds);
  }
}

// ============ Alert Functions ============
export async function createAlert(alert: InsertAlert): Promise<Alert> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(alerts).values(alert);
  const id = Number(result[0].insertId);
  const created = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
  return created[0];
}

export async function getAlerts(filters?: {
  deviceId?: number;
  status?: Alert["status"];
  severity?: Alert["severity"];
  startTime?: number;
  endTime?: number;
  limit?: number;
}): Promise<Alert[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Connection unavailable for getAlerts");
  }

  try {
    let query = db.select().from(alerts);
    const conditions = [];

    if (filters?.deviceId) {
      conditions.push(eq(alerts.deviceId, filters.deviceId));
    }
    if (filters?.status) {
      conditions.push(eq(alerts.status, filters.status));
    }
    if (filters?.severity) {
      conditions.push(eq(alerts.severity, filters.severity));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    return query.orderBy(desc(alerts.createdAt)).limit(filters?.limit ?? 100);
  } catch (error) {
    console.error(`[Database] Failed to fetch alerts:`, error);
    throw error;
  }
}

export async function updateAlertStatus(
  id: number,
  status: Alert["status"],
  userId?: number
): Promise<Alert | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const updateData: Partial<Alert> = { status };
  if (status === "acknowledged" && userId) {
    updateData.acknowledgedBy = userId;
    updateData.acknowledgedAt = new Date();
  }
  if (status === "resolved") {
    updateData.resolvedAt = new Date();
  }

  await db.update(alerts).set(updateData).where(eq(alerts.id, id));
  const result = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
  return result[0];
}

export async function getAlertStats(): Promise<{
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  warning: number;
}> {
  const db = await getDb();
  if (!db) {
    return { total: 0, active: 0, acknowledged: 0, resolved: 0, critical: 0, warning: 0 };
  }

  const allAlerts = await db.select().from(alerts);
  return {
    total: allAlerts.length,
    active: allAlerts.filter((a) => a.status === "active").length,
    acknowledged: allAlerts.filter((a) => a.status === "acknowledged").length,
    resolved: allAlerts.filter((a) => a.status === "resolved").length,
    critical: allAlerts.filter((a) => a.severity === "critical").length,
    warning: allAlerts.filter((a) => a.severity === "warning").length,
  };
}

// ============ Firmware Version Functions ============
export async function createFirmwareVersion(firmware: InsertFirmwareVersion): Promise<FirmwareVersion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(firmwareVersions).values(firmware);
  const id = Number(result[0].insertId);
  const created = await db.select().from(firmwareVersions).where(eq(firmwareVersions.id, id)).limit(1);
  return created[0];
}

export async function getFirmwareVersions(deviceType?: FirmwareVersion["deviceType"]): Promise<FirmwareVersion[]> {
  const db = await getDb();
  if (!db) return [];

  if (deviceType) {
    return db
      .select()
      .from(firmwareVersions)
      .where(eq(firmwareVersions.deviceType, deviceType))
      .orderBy(desc(firmwareVersions.createdAt));
  }

  return db.select().from(firmwareVersions).orderBy(desc(firmwareVersions.createdAt));
}

export async function getFirmwareVersionById(id: number): Promise<FirmwareVersion | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(firmwareVersions).where(eq(firmwareVersions.id, id)).limit(1);
  return result[0];
}

// ============ OTA Deployment Functions ============
export async function createOtaDeployment(deployment: InsertOtaDeployment): Promise<OtaDeployment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(otaDeployments).values(deployment);
  const id = Number(result[0].insertId);
  const created = await db.select().from(otaDeployments).where(eq(otaDeployments.id, id)).limit(1);
  return created[0];
}

export async function getOtaDeployments(filters?: {
  deviceId?: number;
  status?: OtaDeployment["status"];
  limit?: number;
}): Promise<OtaDeployment[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(otaDeployments);
  const conditions = [];

  if (filters?.deviceId) {
    conditions.push(eq(otaDeployments.deviceId, filters.deviceId));
  }
  if (filters?.status) {
    conditions.push(eq(otaDeployments.status, filters.status));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query.orderBy(desc(otaDeployments.createdAt)).limit(filters?.limit ?? 50);
}

export async function updateOtaDeployment(
  id: number,
  data: Partial<InsertOtaDeployment>
): Promise<OtaDeployment | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(otaDeployments).set(data).where(eq(otaDeployments.id, id));
  const result = await db.select().from(otaDeployments).where(eq(otaDeployments.id, id)).limit(1);
  return result[0];
}

export async function getLatestDeploymentForDevice(deviceId: number): Promise<OtaDeployment | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(otaDeployments)
    .where(eq(otaDeployments.deviceId, deviceId))
    .orderBy(desc(otaDeployments.createdAt))
    .limit(1);

  return result[0];
}

// ============ Analytics Functions ============
export async function getDeviceStats(): Promise<{
  total: number;
  online: number;
  offline: number;
  maintenance: number;
  error: number;
  byType: Record<string, number>;
}> {
  const db = await getDb();
  if (!db) {
    return { total: 0, online: 0, offline: 0, maintenance: 0, error: 0, byType: {} };
  }

  const allDevices = await db.select().from(devices);
  const byType: Record<string, number> = {};

  for (const device of allDevices) {
    byType[device.type] = (byType[device.type] || 0) + 1;
  }

  return {
    total: allDevices.length,
    online: allDevices.filter((d) => d.status === "online").length,
    offline: allDevices.filter((d) => d.status === "offline").length,
    maintenance: allDevices.filter((d) => d.status === "maintenance").length,
    error: allDevices.filter((d) => d.status === "error").length,
    byType,
  };
}

export async function getAggregatedReadings(
  deviceIds: number[],
  startTime: number,
  endTime: number,
  intervalMs: number = 3600000 // 1 hour default
): Promise<
  Array<{
    timestamp: number;
    avgTemperature: number | null;
    avgHumidity: number | null;
    avgVibration: number | null;
    avgPower: number | null;
  }>
> {
  const db = await getDb();
  if (!db || deviceIds.length === 0) return [];

  // Get all readings in the range
  const readings = await db
    .select()
    .from(sensorReadings)
    .where(
      and(
        inArray(sensorReadings.deviceId, deviceIds),
        gte(sensorReadings.timestamp, startTime),
        lte(sensorReadings.timestamp, endTime)
      )
    )
    .orderBy(asc(sensorReadings.timestamp));

  // Aggregate by interval
  const buckets = new Map<
    number,
    { temps: number[]; humids: number[]; vibs: number[]; powers: number[] }
  >();

  for (const reading of readings) {
    const bucketTime = Math.floor(reading.timestamp / intervalMs) * intervalMs;
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, { temps: [], humids: [], vibs: [], powers: [] });
    }
    const bucket = buckets.get(bucketTime)!;
    if (reading.temperature !== null) bucket.temps.push(reading.temperature);
    if (reading.humidity !== null) bucket.humids.push(reading.humidity);
    if (reading.vibration !== null) bucket.vibs.push(reading.vibration);
    if (reading.power !== null) bucket.powers.push(reading.power);
  }

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  return Array.from(buckets.entries())
    .map(([timestamp, data]) => ({
      timestamp,
      avgTemperature: avg(data.temps),
      avgHumidity: avg(data.humids),
      avgVibration: avg(data.vibs),
      avgPower: avg(data.powers),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}
