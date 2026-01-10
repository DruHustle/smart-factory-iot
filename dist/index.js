// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    console.log("[System] notifyOwner called:", input);
    return {
      success: true
    };
  })
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";

// server/db.ts
import { eq, and, gte, lte, desc, asc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, float, bigint, json, boolean } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  password: text("password"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: varchar("deviceId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["sensor", "actuator", "controller", "gateway"]).notNull(),
  status: mysqlEnum("status", ["online", "offline", "maintenance", "error"]).default("offline").notNull(),
  location: varchar("location", { length: 255 }),
  zone: varchar("zone", { length: 100 }),
  firmwareVersion: varchar("firmwareVersion", { length: 50 }),
  lastSeen: timestamp("lastSeen"),
  metadata: json("metadata").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var sensorReadings = mysqlTable("sensor_readings", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  temperature: float("temperature"),
  humidity: float("humidity"),
  vibration: float("vibration"),
  power: float("power"),
  pressure: float("pressure"),
  rpm: float("rpm"),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var alertThresholds = mysqlTable("alert_thresholds", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  metric: mysqlEnum("metric", ["temperature", "humidity", "vibration", "power", "pressure", "rpm"]).notNull(),
  minValue: float("minValue"),
  maxValue: float("maxValue"),
  warningMin: float("warningMin"),
  warningMax: float("warningMax"),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  type: mysqlEnum("type", ["threshold_exceeded", "device_offline", "firmware_update", "maintenance_required", "system_error"]).notNull(),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).notNull(),
  metric: varchar("metric", { length: 50 }),
  value: float("value"),
  threshold: float("threshold"),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["active", "acknowledged", "resolved"]).default("active").notNull(),
  acknowledgedBy: int("acknowledgedBy"),
  acknowledgedAt: timestamp("acknowledgedAt"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var firmwareVersions = mysqlTable("firmware_versions", {
  id: int("id").autoincrement().primaryKey(),
  version: varchar("version", { length: 50 }).notNull().unique(),
  deviceType: mysqlEnum("deviceType", ["sensor", "actuator", "controller", "gateway"]).notNull(),
  releaseNotes: text("releaseNotes"),
  fileUrl: varchar("fileUrl", { length: 512 }),
  fileSize: int("fileSize"),
  checksum: varchar("checksum", { length: 128 }),
  isStable: boolean("isStable").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var otaDeployments = mysqlTable("ota_deployments", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  firmwareVersionId: int("firmwareVersionId").notNull(),
  previousVersion: varchar("previousVersion", { length: 50 }),
  status: mysqlEnum("status", ["pending", "downloading", "installing", "completed", "failed", "rolled_back"]).default("pending").notNull(),
  progress: int("progress").default(0),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "smart-factory-iot",
  cookieSecret: process.env.JWT_SECRET ?? "default-secret-change-me",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "owner"
};

// server/db.ts
var _db = null;
async function getDb() {
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
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createUser(user) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values(user);
  return getUserByEmail(user.email);
}
async function createDevice(device) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(devices).values(device);
  const result = await db.select().from(devices).where(eq(devices.deviceId, device.deviceId)).limit(1);
  return result[0];
}
async function getDevices(filters) {
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
    query = query.where(and(...conditions));
  }
  return query.orderBy(desc(devices.updatedAt));
}
async function getDeviceById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
  return result[0];
}
async function getDeviceByDeviceId(deviceId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(devices).where(eq(devices.deviceId, deviceId)).limit(1);
  return result[0];
}
async function updateDevice(id, data) {
  const db = await getDb();
  if (!db) return void 0;
  await db.update(devices).set(data).where(eq(devices.id, id));
  return getDeviceById(id);
}
async function deleteDevice(id) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(devices).where(eq(devices.id, id));
  return true;
}
async function createSensorReading(reading) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(sensorReadings).values(reading);
}
async function createSensorReadingsBatch(readings) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (readings.length === 0) return;
  await db.insert(sensorReadings).values(readings);
}
async function getSensorReadings(deviceId, startTime, endTime, limit = 1e3) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Connection unavailable for getSensorReadings");
  }
  try {
    return db.select().from(sensorReadings).where(
      and(
        eq(sensorReadings.deviceId, deviceId),
        gte(sensorReadings.timestamp, startTime),
        lte(sensorReadings.timestamp, endTime)
      )
    ).orderBy(asc(sensorReadings.timestamp)).limit(limit);
  } catch (error) {
    console.error(`[Database] Failed to fetch sensor readings for device ${deviceId}:`, error);
    throw error;
  }
}
async function getLatestReading(deviceId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(sensorReadings).where(eq(sensorReadings.deviceId, deviceId)).orderBy(desc(sensorReadings.timestamp)).limit(1);
  return result[0];
}
async function createAlertThreshold(threshold) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(alertThresholds).values(threshold);
  const id = Number(result[0].insertId);
  const created = await db.select().from(alertThresholds).where(eq(alertThresholds.id, id)).limit(1);
  return created[0];
}
async function getAlertThresholds(deviceId) {
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
async function updateAlertThreshold(id, data) {
  const db = await getDb();
  if (!db) return void 0;
  await db.update(alertThresholds).set(data).where(eq(alertThresholds.id, id));
  const result = await db.select().from(alertThresholds).where(eq(alertThresholds.id, id)).limit(1);
  return result[0];
}
async function deleteAlertThreshold(id) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(alertThresholds).where(eq(alertThresholds.id, id));
  return true;
}
async function upsertAlertThresholds(deviceId, thresholds) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(alertThresholds).where(eq(alertThresholds.deviceId, deviceId));
  if (thresholds.length > 0) {
    await db.insert(alertThresholds).values(thresholds);
  }
}
async function createAlert(alert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(alerts).values(alert);
  const id = Number(result[0].insertId);
  const created = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
  return created[0];
}
async function getAlerts(filters) {
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
      query = query.where(and(...conditions));
    }
    return query.orderBy(desc(alerts.createdAt)).limit(filters?.limit ?? 100);
  } catch (error) {
    console.error(`[Database] Failed to fetch alerts:`, error);
    throw error;
  }
}
async function updateAlertStatus(id, status, userId) {
  const db = await getDb();
  if (!db) return void 0;
  const updateData = { status };
  if (status === "acknowledged" && userId) {
    updateData.acknowledgedBy = userId;
    updateData.acknowledgedAt = /* @__PURE__ */ new Date();
  }
  if (status === "resolved") {
    updateData.resolvedAt = /* @__PURE__ */ new Date();
  }
  await db.update(alerts).set(updateData).where(eq(alerts.id, id));
  const result = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
  return result[0];
}
async function getAlertStats() {
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
    warning: allAlerts.filter((a) => a.severity === "warning").length
  };
}
async function createFirmwareVersion(firmware) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(firmwareVersions).values(firmware);
  const id = Number(result[0].insertId);
  const created = await db.select().from(firmwareVersions).where(eq(firmwareVersions.id, id)).limit(1);
  return created[0];
}
async function getFirmwareVersions(deviceType) {
  const db = await getDb();
  if (!db) return [];
  if (deviceType) {
    return db.select().from(firmwareVersions).where(eq(firmwareVersions.deviceType, deviceType)).orderBy(desc(firmwareVersions.createdAt));
  }
  return db.select().from(firmwareVersions).orderBy(desc(firmwareVersions.createdAt));
}
async function getFirmwareVersionById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(firmwareVersions).where(eq(firmwareVersions.id, id)).limit(1);
  return result[0];
}
async function createOtaDeployment(deployment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(otaDeployments).values(deployment);
  const id = Number(result[0].insertId);
  const created = await db.select().from(otaDeployments).where(eq(otaDeployments.id, id)).limit(1);
  return created[0];
}
async function getOtaDeployments(filters) {
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
    query = query.where(and(...conditions));
  }
  return query.orderBy(desc(otaDeployments.createdAt)).limit(filters?.limit ?? 50);
}
async function updateOtaDeployment(id, data) {
  const db = await getDb();
  if (!db) return void 0;
  await db.update(otaDeployments).set(data).where(eq(otaDeployments.id, id));
  const result = await db.select().from(otaDeployments).where(eq(otaDeployments.id, id)).limit(1);
  return result[0];
}
async function getLatestDeploymentForDevice(deviceId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(otaDeployments).where(eq(otaDeployments.deviceId, deviceId)).orderBy(desc(otaDeployments.createdAt)).limit(1);
  return result[0];
}
async function getDeviceStats() {
  const db = await getDb();
  if (!db) {
    return { total: 0, online: 0, offline: 0, maintenance: 0, error: 0, byType: {} };
  }
  const allDevices = await db.select().from(devices);
  const byType = {};
  for (const device of allDevices) {
    byType[device.type] = (byType[device.type] || 0) + 1;
  }
  return {
    total: allDevices.length,
    online: allDevices.filter((d) => d.status === "online").length,
    offline: allDevices.filter((d) => d.status === "offline").length,
    maintenance: allDevices.filter((d) => d.status === "maintenance").length,
    error: allDevices.filter((d) => d.status === "error").length,
    byType
  };
}
async function getAggregatedReadings(deviceIds, startTime, endTime, intervalMs = 36e5) {
  const db = await getDb();
  if (!db || deviceIds.length === 0) return [];
  const readings = await db.select().from(sensorReadings).where(
    and(
      inArray(sensorReadings.deviceId, deviceIds),
      gte(sensorReadings.timestamp, startTime),
      lte(sensorReadings.timestamp, endTime)
    )
  ).orderBy(asc(sensorReadings.timestamp));
  const buckets = /* @__PURE__ */ new Map();
  for (const reading of readings) {
    const bucketTime = Math.floor(reading.timestamp / intervalMs) * intervalMs;
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, { temps: [], humids: [], vibs: [], powers: [] });
    }
    const bucket = buckets.get(bucketTime);
    if (reading.temperature !== null) bucket.temps.push(reading.temperature);
    if (reading.humidity !== null) bucket.humids.push(reading.humidity);
    if (reading.vibration !== null) bucket.vibs.push(reading.vibration);
    if (reading.power !== null) bucket.powers.push(reading.power);
  }
  const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  return Array.from(buckets.entries()).map(([timestamp2, data]) => ({
    timestamp: timestamp2,
    avgTemperature: avg(data.temps),
    avgHumidity: avg(data.humids),
    avgVibration: avg(data.vibs),
    avgPower: avg(data.powers)
  })).sort((a, b) => a.timestamp - b.timestamp);
}

// server/_core/sdk.ts
import bcrypt from "bcryptjs";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var SDKServer = class {
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret || "default-secret-for-local-dev";
    return new TextEncoder().encode(secret);
  }
  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
  /**
   * Create a session token for a user
   */
  async createSessionToken(user, options = {}) {
    return this.signSession(
      {
        openId: user.openId,
        appId: ENV.appId || "default-app",
        name: user.name || "User",
        email: user.email || void 0,
        role: user.role
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
      email: payload.email,
      role: payload.role
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(token) {
    if (!token) {
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(token, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name, email, role } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        return null;
      }
      return {
        openId,
        appId,
        name,
        email: typeof email === "string" ? email : void 0,
        role: typeof role === "string" ? role : void 0
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async authenticateRequest(req) {
    const authHeader = req.headers.authorization;
    let token;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      const cookies = this.parseCookies(req.headers.cookie);
      token = cookies.get(COOKIE_NAME);
    }
    const session = await this.verifySession(token);
    if (!session) {
      const defaultUser = await getUserByOpenId("anonymous");
      if (defaultUser) return defaultUser;
      throw ForbiddenError("Invalid or missing authentication");
    }
    const user = await getUserByOpenId(session.openId);
    if (!user) {
      throw ForbiddenError("User not found");
    }
    return user;
  }
};
var sdk = new SDKServer();

// server/routers.ts
import { z as z2 } from "zod";

// server/mockData.ts
import { nanoid } from "nanoid";
var deviceConfigs = {
  sensor: {
    temperature: { min: 15, max: 85, unit: "\xB0C" },
    humidity: { min: 20, max: 80, unit: "%" },
    vibration: { min: 0, max: 10, unit: "mm/s" },
    power: { min: 0, max: 500, unit: "W" }
  },
  actuator: {
    temperature: { min: 20, max: 60, unit: "\xB0C" },
    power: { min: 50, max: 2e3, unit: "W" },
    rpm: { min: 0, max: 3e3, unit: "RPM" }
  },
  controller: {
    temperature: { min: 25, max: 45, unit: "\xB0C" },
    power: { min: 10, max: 100, unit: "W" }
  },
  gateway: {
    temperature: { min: 20, max: 50, unit: "\xB0C" },
    power: { min: 5, max: 30, unit: "W" }
  }
};
var zones = ["Assembly Line A", "Assembly Line B", "Packaging", "Quality Control", "Warehouse", "Maintenance Bay"];
var locations = ["Floor 1", "Floor 2", "Floor 3", "Outdoor", "Basement"];
function generateDeviceId() {
  return `DEV-${nanoid(8).toUpperCase()}`;
}
function generateRandomDevice(type) {
  const zone = zones[Math.floor(Math.random() * zones.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  const statuses = ["online", "offline", "maintenance", "error"];
  const statusWeights = [0.7, 0.15, 0.1, 0.05];
  let statusRandom = Math.random();
  let status = "online";
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
    lastSeen: status === "online" ? /* @__PURE__ */ new Date() : new Date(Date.now() - Math.random() * 864e5),
    metadata: {
      manufacturer: ["Siemens", "ABB", "Schneider", "Honeywell"][Math.floor(Math.random() * 4)],
      model: `Model-${nanoid(4).toUpperCase()}`,
      installDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1e3).toISOString()
    }
  };
}
function generateSensorReading(deviceId, deviceType, timestamp2) {
  const config = deviceConfigs[deviceType];
  const generateValue = (range) => {
    if (!range) return null;
    const base = range.min + Math.random() * (range.max - range.min);
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
    timestamp: timestamp2
  };
}
function generateHistoricalReadings(deviceId, deviceType, startTime, endTime, intervalMs = 6e4) {
  const readings = [];
  for (let t2 = startTime; t2 <= endTime; t2 += intervalMs) {
    readings.push(generateSensorReading(deviceId, deviceType, t2));
  }
  return readings;
}
function generateDefaultThresholds(deviceId, deviceType) {
  const config = deviceConfigs[deviceType];
  const thresholds = [];
  for (const [metric, range] of Object.entries(config)) {
    const spread = range.max - range.min;
    thresholds.push({
      deviceId,
      metric,
      minValue: range.min + spread * 0.1,
      maxValue: range.max - spread * 0.1,
      warningMin: range.min + spread * 0.2,
      warningMax: range.max - spread * 0.2,
      enabled: true
    });
  }
  return thresholds;
}
function generateAlert(deviceId, type, severity) {
  const messages = {
    threshold_exceeded: [
      "Temperature exceeded maximum threshold",
      "Vibration levels abnormally high",
      "Power consumption spike detected",
      "Humidity outside acceptable range"
    ],
    device_offline: ["Device connection lost", "No heartbeat received", "Communication timeout"],
    firmware_update: ["New firmware available", "Firmware update required for security patch"],
    maintenance_required: ["Scheduled maintenance due", "Component wear detected", "Calibration needed"],
    system_error: ["Internal sensor error", "Memory overflow detected", "Configuration corrupted"]
  };
  const messageList = messages[type];
  const message = messageList[Math.floor(Math.random() * messageList.length)];
  return {
    deviceId,
    type,
    severity,
    message,
    status: "active"
  };
}
var firmwareVersionsList = [
  { version: "v1.0.0", releaseNotes: "Initial release", isStable: true },
  { version: "v1.1.0", releaseNotes: "Bug fixes and performance improvements", isStable: true },
  { version: "v1.2.0", releaseNotes: "Added new sensor calibration features", isStable: true },
  { version: "v2.0.0", releaseNotes: "Major update with new communication protocol", isStable: true },
  { version: "v2.1.0-beta", releaseNotes: "Beta release with experimental features", isStable: false },
  { version: "v2.1.0", releaseNotes: "Stable release with enhanced security", isStable: true }
];

// server/pdfExport.ts
import { format } from "date-fns";
function generateDeviceReportHtml(data) {
  const { device, readings, thresholds, alerts: alerts2, dateRange } = data;
  const stats = calculateReadingStats(readings);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1a1a2e;
      line-height: 1.6;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #1a1a2e;
      font-size: 28px;
    }
    .header .subtitle {
      color: #64748b;
      font-size: 14px;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #3b82f6;
      font-size: 18px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .info-item {
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
    }
    .info-item .label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
    }
    .info-item .value {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    .stat-card {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-card .metric {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
    }
    .stat-card .value {
      font-size: 24px;
      font-weight: 700;
      color: #3b82f6;
    }
    .stat-card .range {
      font-size: 11px;
      color: #94a3b8;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-online { background: #dcfce7; color: #166534; }
    .status-offline { background: #f1f5f9; color: #475569; }
    .status-critical { background: #fee2e2; color: #991b1b; }
    .status-warning { background: #fef3c7; color: #92400e; }
    .status-info { background: #dbeafe; color: #1e40af; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Device Report: ${device.name}</h1>
    <div class="subtitle">
      Generated on ${format(/* @__PURE__ */ new Date(), "MMMM d, yyyy 'at' HH:mm")} | 
      Data from ${format(dateRange.start, "MMM d, yyyy")} to ${format(dateRange.end, "MMM d, yyyy")}
    </div>
  </div>

  <div class="section">
    <h2>Device Information</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="label">Device ID</div>
        <div class="value">${device.deviceId}</div>
      </div>
      <div class="info-item">
        <div class="label">Type</div>
        <div class="value">${device.type}</div>
      </div>
      <div class="info-item">
        <div class="label">Status</div>
        <div class="value"><span class="status-badge status-${device.status}">${device.status}</span></div>
      </div>
      <div class="info-item">
        <div class="label">Firmware</div>
        <div class="value">${device.firmwareVersion ?? "N/A"}</div>
      </div>
      <div class="info-item">
        <div class="label">Zone</div>
        <div class="value">${device.zone ?? "N/A"}</div>
      </div>
      <div class="info-item">
        <div class="label">Location</div>
        <div class="value">${device.location ?? "N/A"}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Sensor Statistics (${readings.length} readings)</h2>
    <div class="stats-grid">
      ${stats.temperature ? `
      <div class="stat-card">
        <div class="metric">Temperature</div>
        <div class="value">${stats.temperature.avg.toFixed(1)}\xB0C</div>
        <div class="range">${stats.temperature.min.toFixed(1)} - ${stats.temperature.max.toFixed(1)}\xB0C</div>
      </div>
      ` : ""}
      ${stats.humidity ? `
      <div class="stat-card">
        <div class="metric">Humidity</div>
        <div class="value">${stats.humidity.avg.toFixed(1)}%</div>
        <div class="range">${stats.humidity.min.toFixed(1)} - ${stats.humidity.max.toFixed(1)}%</div>
      </div>
      ` : ""}
      ${stats.power ? `
      <div class="stat-card">
        <div class="metric">Power</div>
        <div class="value">${stats.power.avg.toFixed(0)}W</div>
        <div class="range">${stats.power.min.toFixed(0)} - ${stats.power.max.toFixed(0)}W</div>
      </div>
      ` : ""}
      ${stats.vibration ? `
      <div class="stat-card">
        <div class="metric">Vibration</div>
        <div class="value">${stats.vibration.avg.toFixed(2)}</div>
        <div class="range">${stats.vibration.min.toFixed(2)} - ${stats.vibration.max.toFixed(2)}</div>
      </div>
      ` : ""}
      ${stats.rpm ? `
      <div class="stat-card">
        <div class="metric">RPM</div>
        <div class="value">${stats.rpm.avg.toFixed(0)}</div>
        <div class="range">${stats.rpm.min.toFixed(0)} - ${stats.rpm.max.toFixed(0)}</div>
      </div>
      ` : ""}
      ${stats.pressure ? `
      <div class="stat-card">
        <div class="metric">Pressure</div>
        <div class="value">${stats.pressure.avg.toFixed(2)} bar</div>
        <div class="range">${stats.pressure.min.toFixed(2)} - ${stats.pressure.max.toFixed(2)} bar</div>
      </div>
      ` : ""}
    </div>
  </div>

  ${thresholds.length > 0 ? `
  <div class="section">
    <h2>Alert Thresholds</h2>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Critical Min</th>
          <th>Critical Max</th>
          <th>Warning Min</th>
          <th>Warning Max</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${thresholds.map((t2) => `
        <tr>
          <td>${t2.metric}</td>
          <td>${t2.minValue ?? "\u2014"}</td>
          <td>${t2.maxValue ?? "\u2014"}</td>
          <td>${t2.warningMin ?? "\u2014"}</td>
          <td>${t2.warningMax ?? "\u2014"}</td>
          <td>${t2.enabled ? "Enabled" : "Disabled"}</td>
        </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  ${alerts2.length > 0 ? `
  <div class="section">
    <h2>Recent Alerts (${alerts2.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Severity</th>
          <th>Message</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${alerts2.slice(0, 20).map((a) => `
        <tr>
          <td>${format(new Date(a.createdAt), "MMM d, HH:mm")}</td>
          <td><span class="status-badge status-${a.severity}">${a.severity}</span></td>
          <td>${a.message}</td>
          <td>${a.status}</td>
        </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="footer">
    Smart Factory IoT Dashboard | Device Report | Page 1 of 1
  </div>
</body>
</html>
  `;
}
function generateAnalyticsReportHtml(data) {
  const { overview, oeeMetrics, energyData, dateRange } = data;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1a1a2e;
      line-height: 1.6;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #1a1a2e;
      font-size: 28px;
    }
    .header .subtitle {
      color: #64748b;
      font-size: 14px;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #3b82f6;
      font-size: 18px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
    }
    .kpi-card {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .kpi-card .label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
    }
    .kpi-card .value {
      font-size: 28px;
      font-weight: 700;
      color: #3b82f6;
    }
    .oee-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
    }
    .oee-card {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .oee-card .label {
      font-size: 12px;
      opacity: 0.8;
      text-transform: uppercase;
    }
    .oee-card .value {
      font-size: 32px;
      font-weight: 700;
    }
    .oee-card.highlight {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Analytics Report</h1>
    <div class="subtitle">
      Generated on ${format(/* @__PURE__ */ new Date(), "MMMM d, yyyy 'at' HH:mm")} | 
      Data from ${format(dateRange.start, "MMM d, yyyy")} to ${format(dateRange.end, "MMM d, yyyy")}
    </div>
  </div>

  <div class="section">
    <h2>System Overview</h2>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">Total Devices</div>
        <div class="value">${overview.totalDevices}</div>
      </div>
      <div class="kpi-card">
        <div class="label">Online</div>
        <div class="value" style="color: #10b981;">${overview.onlineDevices}</div>
      </div>
      <div class="kpi-card">
        <div class="label">Active Alerts</div>
        <div class="value" style="color: #f59e0b;">${overview.activeAlerts}</div>
      </div>
      <div class="kpi-card">
        <div class="label">Critical</div>
        <div class="value" style="color: #ef4444;">${overview.criticalAlerts}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>OEE Metrics</h2>
    <div class="oee-grid">
      <div class="oee-card">
        <div class="label">Availability</div>
        <div class="value">${oeeMetrics.availability}%</div>
      </div>
      <div class="oee-card">
        <div class="label">Performance</div>
        <div class="value">${oeeMetrics.performance}%</div>
      </div>
      <div class="oee-card">
        <div class="label">Quality</div>
        <div class="value">${oeeMetrics.quality}%</div>
      </div>
      <div class="oee-card highlight">
        <div class="label">Overall OEE</div>
        <div class="value">${oeeMetrics.oee}%</div>
      </div>
    </div>
  </div>

  ${energyData.length > 0 ? `
  <div class="section">
    <h2>Energy & Environmental Data</h2>
    <table>
      <thead>
        <tr>
          <th>Time Period</th>
          <th>Avg Power (W)</th>
          <th>Avg Temp (\xB0C)</th>
          <th>Avg Humidity (%)</th>
        </tr>
      </thead>
      <tbody>
        ${energyData.slice(0, 20).map((d) => `
        <tr>
          <td>${format(new Date(d.timestamp), "MMM d, HH:mm")}</td>
          <td>${d.avgPower?.toFixed(0) ?? "\u2014"}</td>
          <td>${d.avgTemperature?.toFixed(1) ?? "\u2014"}</td>
          <td>${d.avgHumidity?.toFixed(1) ?? "\u2014"}</td>
        </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="footer">
    Smart Factory IoT Dashboard | Analytics Report | Page 1 of 1
  </div>
</body>
</html>
  `;
}
function generateAlertHistoryReportHtml(data) {
  const { alerts: alerts2, summary, dateRange } = data;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1a1a2e;
      line-height: 1.6;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #f59e0b;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #1a1a2e;
      font-size: 28px;
    }
    .header .subtitle {
      color: #64748b;
      font-size: 14px;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #f59e0b;
      font-size: 18px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 15px;
    }
    .summary-card {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .summary-card .label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: 700;
    }
    .summary-card.critical .value { color: #ef4444; }
    .summary-card.warning .value { color: #f59e0b; }
    .summary-card.info .value { color: #3b82f6; }
    .summary-card.resolved .value { color: #10b981; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }
    .status-critical { background: #fee2e2; color: #991b1b; }
    .status-warning { background: #fef3c7; color: #92400e; }
    .status-info { background: #dbeafe; color: #1e40af; }
    .status-active { background: #fee2e2; color: #991b1b; }
    .status-acknowledged { background: #fef3c7; color: #92400e; }
    .status-resolved { background: #dcfce7; color: #166534; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Alert History Report</h1>
    <div class="subtitle">
      Generated on ${format(/* @__PURE__ */ new Date(), "MMMM d, yyyy 'at' HH:mm")} | 
      Data from ${format(dateRange.start, "MMM d, yyyy")} to ${format(dateRange.end, "MMM d, yyyy")}
    </div>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">Total</div>
        <div class="value">${summary.total}</div>
      </div>
      <div class="summary-card critical">
        <div class="label">Critical</div>
        <div class="value">${summary.critical}</div>
      </div>
      <div class="summary-card warning">
        <div class="label">Warning</div>
        <div class="value">${summary.warning}</div>
      </div>
      <div class="summary-card info">
        <div class="label">Info</div>
        <div class="value">${summary.info}</div>
      </div>
      <div class="summary-card resolved">
        <div class="label">Resolved</div>
        <div class="value">${summary.resolved}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Alert Details (${alerts2.length} alerts)</h2>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Device</th>
          <th>Severity</th>
          <th>Type</th>
          <th>Message</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${alerts2.map((a) => `
        <tr>
          <td>${format(new Date(a.createdAt), "MMM d, HH:mm")}</td>
          <td>${a.deviceName}</td>
          <td><span class="status-badge status-${a.severity}">${a.severity}</span></td>
          <td>${a.type.replace(/_/g, " ")}</td>
          <td>${a.message}</td>
          <td><span class="status-badge status-${a.status}">${a.status}</span></td>
        </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Smart Factory IoT Dashboard | Alert History Report | Page 1 of 1
  </div>
</body>
</html>
  `;
}
function calculateReadingStats(readings) {
  const stats = {
    temperature: null,
    humidity: null,
    vibration: null,
    power: null,
    rpm: null,
    pressure: null
  };
  const metrics = ["temperature", "humidity", "vibration", "power", "rpm", "pressure"];
  for (const metric of metrics) {
    const values = readings.map((r) => r[metric]).filter((v) => v !== null && v !== void 0);
    if (values.length > 0) {
      stats[metric] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length
      };
    }
  }
  return stats;
}

// server/notifications.ts
import { EventEmitter } from "events";
var EmailProvider = class {
  constructor() {
    this.configured = false;
    this.apiKey = null;
    this.apiKey = process.env.EMAIL_API_KEY || null;
    this.configured = !!this.apiKey;
  }
  async send(message) {
    if (!this.configured) {
      console.warn("[Email Provider] Not configured, skipping email");
      return;
    }
    try {
      console.log(`[Email] Sending to ${message.recipient}`);
      console.log(`  Subject: ${message.subject}`);
      console.log(`  Body: ${message.body}`);
      console.log(`  Severity: ${message.severity}`);
    } catch (error) {
      console.error("[Email Provider] Error:", error);
      throw error;
    }
  }
  isConfigured() {
    return this.configured;
  }
};
var SMSProvider = class {
  constructor() {
    this.configured = false;
    this.apiKey = null;
    this.apiKey = process.env.SMS_API_KEY || null;
    this.configured = !!this.apiKey;
  }
  async send(message) {
    if (!this.configured) {
      console.warn("[SMS Provider] Not configured, skipping SMS");
      return;
    }
    try {
      console.log(`[SMS] Sending to ${message.recipient}`);
      console.log(`  Body: ${message.body}`);
      console.log(`  Severity: ${message.severity}`);
    } catch (error) {
      console.error("[SMS Provider] Error:", error);
      throw error;
    }
  }
  isConfigured() {
    return this.configured;
  }
};
var PushProvider = class {
  constructor() {
    this.configured = false;
    this.configured = !!process.env.PUSH_ENABLED;
  }
  async send(message) {
    if (!this.configured) {
      console.warn("[Push Provider] Not configured, skipping push notification");
      return;
    }
    try {
      console.log(`[Push] Sending notification`);
      console.log(`  Body: ${message.body}`);
      console.log(`  Severity: ${message.severity}`);
    } catch (error) {
      console.error("[Push Provider] Error:", error);
      throw error;
    }
  }
  isConfigured() {
    return this.configured;
  }
};
var NotificationService = class extends EventEmitter {
  constructor() {
    super();
    this.configs = /* @__PURE__ */ new Map();
    this.messageQueue = [];
    this.isProcessing = false;
    this.emailProvider = new EmailProvider();
    this.smsProvider = new SMSProvider();
    this.pushProvider = new PushProvider();
  }
  /**
   * Register notification configuration
   */
  registerConfig(configId, config) {
    this.configs.set(configId, config);
    console.log(`[Notification Service] Registered config: ${configId}`);
  }
  /**
   * Send notification for alert
   */
  async sendAlertNotification(deviceId, alertId, severity, message, subject) {
    const applicableConfigs = Array.from(this.configs.values()).filter((config) => {
      if (!config.enabled) return false;
      if (config.deviceFilter && !config.deviceFilter.includes(deviceId)) return false;
      if (config.severityFilter && !config.severityFilter.includes(severity)) return false;
      return true;
    });
    for (const config of applicableConfigs) {
      const notification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: config.type,
        recipient: config.recipient,
        subject: subject || `Alert: Device ${deviceId}`,
        body: message,
        severity,
        deviceId,
        alertId,
        timestamp: Date.now(),
        status: "pending",
        retryCount: 0,
        maxRetries: 3
      };
      this.messageQueue.push(notification);
    }
    this.processQueue();
  }
  /**
   * Process notification queue
   */
  async processQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }
    this.isProcessing = true;
    while (this.messageQueue.length > 0) {
      const notification = this.messageQueue.shift();
      if (!notification) break;
      try {
        await this.sendNotification(notification);
        notification.status = "sent";
        this.emit("notification_sent", notification);
      } catch (error) {
        notification.retryCount++;
        if (notification.retryCount < notification.maxRetries) {
          this.messageQueue.push(notification);
          console.log(`[Notification Service] Queued for retry: ${notification.id}`);
        } else {
          notification.status = "failed";
          this.emit("notification_failed", notification);
          console.error(`[Notification Service] Failed to send notification: ${notification.id}`);
        }
      }
    }
    this.isProcessing = false;
  }
  /**
   * Send single notification
   */
  async sendNotification(notification) {
    switch (notification.type) {
      case "email" /* EMAIL */:
        await this.emailProvider.send(notification);
        break;
      case "sms" /* SMS */:
        await this.smsProvider.send(notification);
        break;
      case "push" /* PUSH */:
        await this.pushProvider.send(notification);
        break;
      default:
        throw new Error(`Unknown notification type: ${notification.type}`);
    }
  }
  /**
   * Get notification configurations
   */
  getConfigs() {
    return Array.from(this.configs.values());
  }
  /**
   * Update notification configuration
   */
  updateConfig(configId, config) {
    const existing = this.configs.get(configId);
    if (existing) {
      this.configs.set(configId, { ...existing, ...config });
      console.log(`[Notification Service] Updated config: ${configId}`);
    }
  }
  /**
   * Delete notification configuration
   */
  deleteConfig(configId) {
    this.configs.delete(configId);
    console.log(`[Notification Service] Deleted config: ${configId}`);
  }
  /**
   * Get queue size
   */
  getQueueSize() {
    return this.messageQueue.length;
  }
};
var notificationService = new NotificationService();

// server/deviceGrouping.ts
import { EventEmitter as EventEmitter2 } from "events";
var DeviceGroupingService = class extends EventEmitter2 {
  constructor() {
    super(...arguments);
    this.groups = /* @__PURE__ */ new Map();
    this.batchOperations = /* @__PURE__ */ new Map();
    this.deviceToGroups = /* @__PURE__ */ new Map();
  }
  /**
   * Create a new device group
   */
  createGroup(name, type, deviceIds, description, metadata) {
    const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const group = {
      id,
      name,
      type,
      description,
      deviceIds,
      metadata,
      createdAt: now,
      updatedAt: now
    };
    this.groups.set(id, group);
    for (const deviceId of deviceIds) {
      if (!this.deviceToGroups.has(deviceId)) {
        this.deviceToGroups.set(deviceId, /* @__PURE__ */ new Set());
      }
      this.deviceToGroups.get(deviceId).add(id);
    }
    this.emit("group_created", group);
    console.log(`[Device Grouping] Created group: ${name} (${id})`);
    return group;
  }
  /**
   * Get group by ID
   */
  getGroup(groupId) {
    return this.groups.get(groupId);
  }
  /**
   * Get all groups
   */
  getAllGroups() {
    return Array.from(this.groups.values());
  }
  /**
   * Get groups by type
   */
  getGroupsByType(type) {
    return Array.from(this.groups.values()).filter((g) => g.type === type);
  }
  /**
   * Get groups containing a device
   */
  getGroupsForDevice(deviceId) {
    const groupIds = this.deviceToGroups.get(deviceId) || /* @__PURE__ */ new Set();
    return Array.from(groupIds).map((id) => this.groups.get(id)).filter((g) => g !== void 0);
  }
  /**
   * Update group
   */
  updateGroup(groupId, updates) {
    const group = this.groups.get(groupId);
    if (!group) return void 0;
    if (updates.deviceIds) {
      const oldDeviceIds = group.deviceIds;
      const newDeviceIds = updates.deviceIds;
      for (const deviceId of oldDeviceIds) {
        if (!newDeviceIds.includes(deviceId)) {
          this.deviceToGroups.get(deviceId)?.delete(groupId);
        }
      }
      for (const deviceId of newDeviceIds) {
        if (!oldDeviceIds.includes(deviceId)) {
          if (!this.deviceToGroups.has(deviceId)) {
            this.deviceToGroups.set(deviceId, /* @__PURE__ */ new Set());
          }
          this.deviceToGroups.get(deviceId).add(groupId);
        }
      }
    }
    const updatedGroup = {
      ...group,
      ...updates,
      updatedAt: Date.now()
    };
    this.groups.set(groupId, updatedGroup);
    this.emit("group_updated", updatedGroup);
    console.log(`[Device Grouping] Updated group: ${groupId}`);
    return updatedGroup;
  }
  /**
   * Delete group
   */
  deleteGroup(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return false;
    for (const deviceId of group.deviceIds) {
      this.deviceToGroups.get(deviceId)?.delete(groupId);
    }
    this.groups.delete(groupId);
    this.emit("group_deleted", groupId);
    console.log(`[Device Grouping] Deleted group: ${groupId}`);
    return true;
  }
  /**
   * Add devices to group
   */
  addDevicesToGroup(groupId, deviceIds) {
    const group = this.groups.get(groupId);
    if (!group) return void 0;
    const newDeviceIds = [.../* @__PURE__ */ new Set([...group.deviceIds, ...deviceIds])];
    return this.updateGroup(groupId, { deviceIds: newDeviceIds });
  }
  /**
   * Remove devices from group
   */
  removeDevicesFromGroup(groupId, deviceIds) {
    const group = this.groups.get(groupId);
    if (!group) return void 0;
    const newDeviceIds = group.deviceIds.filter((id) => !deviceIds.includes(id));
    return this.updateGroup(groupId, { deviceIds: newDeviceIds });
  }
  /**
   * Create batch operation for group
   */
  createBatchOperation(groupId, operation, parameters) {
    const group = this.groups.get(groupId);
    if (!group) return void 0;
    const id = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const batchOp = {
      id,
      groupId,
      operation,
      parameters,
      status: "pending",
      progress: 0,
      createdAt: now
    };
    this.batchOperations.set(id, batchOp);
    this.emit("batch_operation_created", batchOp);
    console.log(`[Device Grouping] Created batch operation: ${id}`);
    return batchOp;
  }
  /**
   * Get batch operation
   */
  getBatchOperation(operationId) {
    return this.batchOperations.get(operationId);
  }
  /**
   * Update batch operation status
   */
  updateBatchOperation(operationId, updates) {
    const operation = this.batchOperations.get(operationId);
    if (!operation) return void 0;
    const updatedOperation = {
      ...operation,
      ...updates
    };
    this.batchOperations.set(operationId, updatedOperation);
    if (updates.status === "in_progress" && !operation.startedAt) {
      updatedOperation.startedAt = Date.now();
    }
    if ((updates.status === "completed" || updates.status === "failed") && !operation.completedAt) {
      updatedOperation.completedAt = Date.now();
    }
    this.emit("batch_operation_updated", updatedOperation);
    return updatedOperation;
  }
  /**
   * Get batch operations for group
   */
  getBatchOperationsForGroup(groupId) {
    return Array.from(this.batchOperations.values()).filter((op) => op.groupId === groupId);
  }
  /**
   * Calculate group analytics
   */
  calculateGroupAnalytics(groupId, deviceStats) {
    const group = this.groups.get(groupId);
    if (!group) return void 0;
    let onlineDevices = 0;
    let offlineDevices = 0;
    let errorDevices = 0;
    let maintenanceDevices = 0;
    let temperatureSum = 0;
    let humiditySum = 0;
    let powerSum = 0;
    let temperatureCount = 0;
    let humidityCount = 0;
    let powerCount = 0;
    let criticalAlerts = 0;
    let warningAlerts = 0;
    let infoAlerts = 0;
    const deviceIdsArray = Array.from(group.deviceIds);
    for (const deviceId of deviceIdsArray) {
      const stats = deviceStats.get(deviceId);
      if (!stats) continue;
      if (stats.status === "online") onlineDevices++;
      else if (stats.status === "offline") offlineDevices++;
      else if (stats.status === "error") errorDevices++;
      else if (stats.status === "maintenance") maintenanceDevices++;
      if (stats.temperature !== void 0) {
        temperatureSum += stats.temperature;
        temperatureCount++;
      }
      if (stats.humidity !== void 0) {
        humiditySum += stats.humidity;
        humidityCount++;
      }
      if (stats.power !== void 0) {
        powerSum += stats.power;
        powerCount++;
      }
      if (stats.alerts) {
        criticalAlerts += stats.alerts.critical || 0;
        warningAlerts += stats.alerts.warning || 0;
        infoAlerts += stats.alerts.info || 0;
      }
    }
    return {
      groupId,
      totalDevices: group.deviceIds.length,
      onlineDevices,
      offlineDevices,
      errorDevices,
      maintenanceDevices,
      averageTemperature: temperatureCount > 0 ? temperatureSum / temperatureCount : void 0,
      averageHumidity: humidityCount > 0 ? humiditySum / humidityCount : void 0,
      averagePower: powerCount > 0 ? powerSum / powerCount : void 0,
      criticalAlerts,
      warningAlerts,
      infoAlerts,
      lastUpdated: Date.now()
    };
  }
  /**
   * Get all batch operations
   */
  getAllBatchOperations() {
    return Array.from(this.batchOperations.values());
  }
  /**
   * Clear completed batch operations
   */
  clearCompletedOperations(olderThanMs = 24 * 60 * 60 * 1e3) {
    const cutoffTime = Date.now() - olderThanMs;
    let cleared = 0;
    const operationsArray = Array.from(this.batchOperations.entries());
    for (const [id, operation] of operationsArray) {
      if ((operation.status === "completed" || operation.status === "failed") && operation.completedAt && operation.completedAt < cutoffTime) {
        this.batchOperations.delete(id);
        cleared++;
      }
    }
    if (cleared > 0) {
      console.log(`[Device Grouping] Cleared ${cleared} old batch operations`);
    }
  }
};
var deviceGroupingService = new DeviceGroupingService();

// server/routers.ts
var deviceTypeEnum = z2.enum(["sensor", "actuator", "controller", "gateway"]);
var deviceStatusEnum = z2.enum(["online", "offline", "maintenance", "error"]);
var alertStatusEnum = z2.enum(["active", "acknowledged", "resolved"]);
var alertSeverityEnum = z2.enum(["info", "warning", "critical"]);
var alertTypeEnum = z2.enum([
  "threshold_exceeded",
  "device_offline",
  "firmware_update",
  "maintenance_required",
  "system_error"
]);
var metricEnum = z2.enum(["temperature", "humidity", "vibration", "power", "pressure", "rpm"]);
var deploymentStatusEnum = z2.enum([
  "pending",
  "downloading",
  "installing",
  "completed",
  "failed",
  "rolled_back"
]);
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    login: publicProcedure.input(z2.object({ email: z2.string().email(), password: z2.string() })).mutation(async ({ input, ctx }) => {
      const user = await getUserByEmail(input.email);
      if (!user || !user.password) {
        throw new Error("Invalid email or password");
      }
      const isValid = await sdk.comparePassword(input.password, user.password);
      if (!isValid) {
        throw new Error("Invalid email or password");
      }
      const token = await sdk.createSessionToken(user);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
      return { token, user };
    }),
    register: publicProcedure.input(z2.object({ email: z2.string().email(), password: z2.string(), name: z2.string() })).mutation(async ({ input }) => {
      const existing = await getUserByEmail(input.email);
      if (existing) {
        throw new Error("Email already registered");
      }
      const hashedPassword = await sdk.hashPassword(input.password);
      const user = await createUser({
        email: input.email,
        password: hashedPassword,
        name: input.name,
        openId: Math.random().toString(36).substring(7),
        role: "user"
      });
      return { success: true, user };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  // Device Management
  devices: router({
    list: publicProcedure.input(
      z2.object({
        status: deviceStatusEnum.optional(),
        type: deviceTypeEnum.optional(),
        zone: z2.string().optional()
      }).optional()
    ).query(async ({ input }) => {
      return getDevices(input);
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getDeviceById(input.id);
    }),
    getByDeviceId: publicProcedure.input(z2.object({ deviceId: z2.string() })).query(async ({ input }) => {
      return getDeviceByDeviceId(input.deviceId);
    }),
    create: protectedProcedure.input(
      z2.object({
        deviceId: z2.string(),
        name: z2.string(),
        type: deviceTypeEnum,
        status: deviceStatusEnum.optional(),
        location: z2.string().optional(),
        zone: z2.string().optional(),
        firmwareVersion: z2.string().optional(),
        metadata: z2.record(z2.string(), z2.unknown()).optional()
      })
    ).mutation(async ({ input }) => {
      return createDevice(input);
    }),
    update: protectedProcedure.input(
      z2.object({
        id: z2.number(),
        name: z2.string().optional(),
        status: deviceStatusEnum.optional(),
        location: z2.string().optional(),
        zone: z2.string().optional(),
        firmwareVersion: z2.string().optional(),
        metadata: z2.record(z2.string(), z2.unknown()).optional()
      })
    ).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateDevice(id, data);
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      return deleteDevice(input.id);
    }),
    getStats: publicProcedure.query(async () => {
      return getDeviceStats();
    }),
    // Seed mock devices
    seedMockData: protectedProcedure.mutation(async () => {
      const types = [
        "sensor",
        "actuator",
        "controller",
        "gateway"
      ];
      const createdDevices = [];
      for (let i = 0; i < 20; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const deviceData = generateRandomDevice(type);
        try {
          const device = await createDevice(deviceData);
          createdDevices.push(device);
          const thresholds = generateDefaultThresholds(device.id, type);
          await upsertAlertThresholds(device.id, thresholds);
          const now = Date.now();
          const readings = generateHistoricalReadings(
            device.id,
            type,
            now - 24 * 60 * 60 * 1e3,
            now,
            5 * 60 * 1e3
            // 5 minute intervals
          );
          await createSensorReadingsBatch(readings);
          if (Math.random() > 0.7) {
            const severities = ["info", "warning", "critical"];
            const alertTypes = ["threshold_exceeded", "device_offline", "firmware_update", "maintenance_required", "system_error"];
            const alertData = generateAlert(
              device.id,
              alertTypes[Math.floor(Math.random() * alertTypes.length)],
              severities[Math.floor(Math.random() * severities.length)]
            );
            await createAlert(alertData);
          }
        } catch (e) {
          console.error("Error creating device:", e);
        }
      }
      for (const fw of firmwareVersionsList) {
        for (const type of types) {
          try {
            await createFirmwareVersion({
              version: `${fw.version}-${type}`,
              deviceType: type,
              releaseNotes: fw.releaseNotes,
              isStable: fw.isStable
            });
          } catch (e) {
          }
        }
      }
      return { created: createdDevices.length };
    })
  }),
  // Sensor Readings
  readings: router({
    getForDevice: publicProcedure.input(
      z2.object({
        deviceId: z2.number(),
        startTime: z2.number(),
        endTime: z2.number(),
        limit: z2.number().optional()
      })
    ).query(async ({ input }) => {
      return getSensorReadings(input.deviceId, input.startTime, input.endTime, input.limit);
    }),
    getLatest: publicProcedure.input(z2.object({ deviceId: z2.number() })).query(async ({ input }) => {
      return getLatestReading(input.deviceId);
    }),
    getAggregated: publicProcedure.input(
      z2.object({
        deviceIds: z2.array(z2.number()),
        startTime: z2.number(),
        endTime: z2.number(),
        intervalMs: z2.number().optional()
      })
    ).query(async ({ input }) => {
      return getAggregatedReadings(
        input.deviceIds,
        input.startTime,
        input.endTime,
        input.intervalMs
      );
    }),
    create: protectedProcedure.input(
      z2.object({
        deviceId: z2.number(),
        temperature: z2.number().nullable().optional(),
        humidity: z2.number().nullable().optional(),
        vibration: z2.number().nullable().optional(),
        power: z2.number().nullable().optional(),
        pressure: z2.number().nullable().optional(),
        rpm: z2.number().nullable().optional(),
        timestamp: z2.number()
      })
    ).mutation(async ({ input }) => {
      await createSensorReading(input);
      return { success: true };
    })
  }),
  // Alert Thresholds
  thresholds: router({
    getForDevice: publicProcedure.input(z2.object({ deviceId: z2.number() })).query(async ({ input }) => {
      return getAlertThresholds(input.deviceId);
    }),
    create: protectedProcedure.input(
      z2.object({
        deviceId: z2.number(),
        metric: metricEnum,
        minValue: z2.number().nullable().optional(),
        maxValue: z2.number().nullable().optional(),
        warningMin: z2.number().nullable().optional(),
        warningMax: z2.number().nullable().optional(),
        enabled: z2.boolean().optional()
      })
    ).mutation(async ({ input }) => {
      return createAlertThreshold(input);
    }),
    update: protectedProcedure.input(
      z2.object({
        id: z2.number(),
        minValue: z2.number().nullable().optional(),
        maxValue: z2.number().nullable().optional(),
        warningMin: z2.number().nullable().optional(),
        warningMax: z2.number().nullable().optional(),
        enabled: z2.boolean().optional()
      })
    ).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateAlertThreshold(id, data);
    }),
    delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      return deleteAlertThreshold(input.id);
    }),
    upsertForDevice: protectedProcedure.input(
      z2.object({
        deviceId: z2.number(),
        thresholds: z2.array(
          z2.object({
            deviceId: z2.number(),
            metric: metricEnum,
            minValue: z2.number().nullable().optional(),
            maxValue: z2.number().nullable().optional(),
            warningMin: z2.number().nullable().optional(),
            warningMax: z2.number().nullable().optional(),
            enabled: z2.boolean().optional()
          })
        )
      })
    ).mutation(async ({ input }) => {
      await upsertAlertThresholds(input.deviceId, input.thresholds);
      return { success: true };
    })
  }),
  // Alerts
  alerts: router({
    list: publicProcedure.input(
      z2.object({
        deviceId: z2.number().optional(),
        status: alertStatusEnum.optional(),
        severity: alertSeverityEnum.optional(),
        limit: z2.number().optional()
      }).optional()
    ).query(async ({ input }) => {
      return getAlerts(input);
    }),
    create: protectedProcedure.input(
      z2.object({
        deviceId: z2.number(),
        type: alertTypeEnum,
        severity: alertSeverityEnum,
        metric: z2.string().optional(),
        value: z2.number().optional(),
        threshold: z2.number().optional(),
        message: z2.string()
      })
    ).mutation(async ({ input }) => {
      return createAlert(input);
    }),
    updateStatus: protectedProcedure.input(
      z2.object({
        id: z2.number(),
        status: alertStatusEnum
      })
    ).mutation(async ({ input, ctx }) => {
      return updateAlertStatus(input.id, input.status, ctx.user?.id);
    }),
    getStats: publicProcedure.query(async () => {
      return getAlertStats();
    })
  }),
  // Firmware Versions
  firmware: router({
    list: publicProcedure.input(z2.object({ deviceType: deviceTypeEnum.optional() }).optional()).query(async ({ input }) => {
      return getFirmwareVersions(input?.deviceType);
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getFirmwareVersionById(input.id);
    }),
    create: protectedProcedure.input(
      z2.object({
        version: z2.string(),
        deviceType: deviceTypeEnum,
        releaseNotes: z2.string().optional(),
        fileUrl: z2.string().optional(),
        fileSize: z2.number().optional(),
        checksum: z2.string().optional(),
        isStable: z2.boolean().optional()
      })
    ).mutation(async ({ input }) => {
      return createFirmwareVersion(input);
    })
  }),
  // OTA Deployments
  ota: router({
    list: publicProcedure.input(
      z2.object({
        deviceId: z2.number().optional(),
        status: deploymentStatusEnum.optional(),
        limit: z2.number().optional()
      }).optional()
    ).query(async ({ input }) => {
      return getOtaDeployments(input);
    }),
    getLatestForDevice: publicProcedure.input(z2.object({ deviceId: z2.number() })).query(async ({ input }) => {
      return getLatestDeploymentForDevice(input.deviceId);
    }),
    deploy: protectedProcedure.input(
      z2.object({
        deviceId: z2.number(),
        firmwareVersionId: z2.number()
      })
    ).mutation(async ({ input }) => {
      const device = await getDeviceById(input.deviceId);
      if (!device) {
        throw new Error("Device not found");
      }
      const deployment = await createOtaDeployment({
        deviceId: input.deviceId,
        firmwareVersionId: input.firmwareVersionId,
        previousVersion: device.firmwareVersion,
        status: "pending",
        startedAt: /* @__PURE__ */ new Date()
      });
      setTimeout(async () => {
        await updateOtaDeployment(deployment.id, { status: "downloading", progress: 25 });
      }, 1e3);
      setTimeout(async () => {
        await updateOtaDeployment(deployment.id, { status: "installing", progress: 75 });
      }, 3e3);
      setTimeout(async () => {
        const success = Math.random() > 0.1;
        if (success) {
          const firmware = await getFirmwareVersionById(input.firmwareVersionId);
          await updateOtaDeployment(deployment.id, {
            status: "completed",
            progress: 100,
            completedAt: /* @__PURE__ */ new Date()
          });
          if (firmware) {
            await updateDevice(input.deviceId, { firmwareVersion: firmware.version });
          }
        } else {
          await updateOtaDeployment(deployment.id, {
            status: "failed",
            errorMessage: "Installation failed: checksum mismatch"
          });
        }
      }, 5e3);
      return deployment;
    }),
    rollback: protectedProcedure.input(z2.object({ deploymentId: z2.number() })).mutation(async ({ input }) => {
      const deployment = await getOtaDeployments({ limit: 1 });
      const currentDeployment = deployment.find((d) => d.id === input.deploymentId);
      if (!currentDeployment) {
        throw new Error("Deployment not found");
      }
      if (!currentDeployment.previousVersion) {
        throw new Error("No previous version to rollback to");
      }
      await updateOtaDeployment(input.deploymentId, { status: "rolled_back" });
      await updateDevice(currentDeployment.deviceId, {
        firmwareVersion: currentDeployment.previousVersion
      });
      return { success: true, restoredVersion: currentDeployment.previousVersion };
    }),
    updateStatus: protectedProcedure.input(
      z2.object({
        id: z2.number(),
        status: deploymentStatusEnum,
        progress: z2.number().optional(),
        errorMessage: z2.string().optional()
      })
    ).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateOtaDeployment(id, data);
    })
  }),
  // Analytics
  analytics: router({
    getOverview: publicProcedure.query(async () => {
      const [deviceStats, alertStats] = await Promise.all([getDeviceStats(), getAlertStats()]);
      return {
        devices: deviceStats,
        alerts: alertStats
      };
    }),
    getEnergyConsumption: publicProcedure.input(
      z2.object({
        startTime: z2.number(),
        endTime: z2.number(),
        intervalMs: z2.number().optional()
      })
    ).query(async ({ input }) => {
      const devices2 = await getDevices();
      const deviceIds = devices2.map((d) => d.id);
      return getAggregatedReadings(deviceIds, input.startTime, input.endTime, input.intervalMs);
    }),
    getOEEMetrics: publicProcedure.query(async () => {
      return {
        availability: 92.5,
        performance: 87.3,
        quality: 98.1,
        oee: 79.2,
        trend: [
          { date: "Mon", oee: 78.5 },
          { date: "Tue", oee: 80.2 },
          { date: "Wed", oee: 77.8 },
          { date: "Thu", oee: 81.5 },
          { date: "Fri", oee: 79.2 },
          { date: "Sat", oee: 82.1 },
          { date: "Sun", oee: 79.2 }
        ]
      };
    })
  }),
  // PDF Export
  export: router({
    deviceReport: publicProcedure.input(
      z2.object({
        deviceId: z2.number(),
        startTime: z2.number(),
        endTime: z2.number()
      })
    ).mutation(async ({ input }) => {
      try {
        const device = await getDeviceById(input.deviceId);
        if (!device) {
          throw new Error("Device not found");
        }
        const [readings, thresholds, alerts2] = await Promise.all([
          getSensorReadings(input.deviceId, input.startTime, input.endTime),
          getAlertThresholds(input.deviceId),
          getAlerts({ deviceId: input.deviceId, limit: 50 })
        ]);
        const reportData = {
          device,
          readings,
          thresholds,
          alerts: alerts2,
          dateRange: {
            start: new Date(input.startTime),
            end: new Date(input.endTime)
          }
        };
        const html = generateDeviceReportHtml(reportData);
        return { html, filename: `device-report-${device.deviceId}-${Date.now()}.html` };
      } catch (error) {
        console.error(`[Export] Failed to generate device report for device ${input.deviceId}:`, error);
        throw new Error(`Failed to generate report: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),
    analyticsReport: publicProcedure.input(
      z2.object({
        startTime: z2.number(),
        endTime: z2.number()
      })
    ).mutation(async ({ input }) => {
      const [deviceStats, alertStats] = await Promise.all([
        getDeviceStats(),
        getAlertStats()
      ]);
      const devices2 = await getDevices();
      const deviceIds = devices2.map((d) => d.id);
      const energyData = await getAggregatedReadings(
        deviceIds,
        input.startTime,
        input.endTime,
        864e5
        // Daily intervals
      );
      const reportData = {
        overview: {
          totalDevices: deviceStats.total,
          onlineDevices: deviceStats.online,
          activeAlerts: alertStats.active,
          criticalAlerts: alertStats.critical
        },
        oeeMetrics: {
          availability: 92.5,
          performance: 87.3,
          quality: 98.1,
          oee: 79.2
        },
        energyData,
        dateRange: {
          start: new Date(input.startTime),
          end: new Date(input.endTime)
        }
      };
      const html = generateAnalyticsReportHtml(reportData);
      return { html, filename: `analytics-report-${Date.now()}.html` };
    }),
    alertHistoryReport: publicProcedure.input(
      z2.object({
        startTime: z2.number(),
        endTime: z2.number(),
        severity: alertSeverityEnum.optional()
      })
    ).mutation(async ({ input }) => {
      const alerts2 = await getAlerts({
        severity: input.severity,
        limit: 500
      });
      const filteredAlerts = alerts2.filter((a) => {
        const alertTime = new Date(a.createdAt).getTime();
        return alertTime >= input.startTime && alertTime <= input.endTime;
      });
      const devices2 = await getDevices();
      const deviceMap = new Map(devices2.map((d) => [d.id, d.name]));
      const alertsWithDeviceNames = filteredAlerts.map((a) => ({
        ...a,
        deviceName: deviceMap.get(a.deviceId) ?? `Device ${a.deviceId}`
      }));
      const summary = {
        total: filteredAlerts.length,
        critical: filteredAlerts.filter((a) => a.severity === "critical").length,
        warning: filteredAlerts.filter((a) => a.severity === "warning").length,
        info: filteredAlerts.filter((a) => a.severity === "info").length,
        resolved: filteredAlerts.filter((a) => a.status === "resolved").length
      };
      const reportData = {
        alerts: alertsWithDeviceNames,
        summary,
        dateRange: {
          start: new Date(input.startTime),
          end: new Date(input.endTime)
        }
      };
      const html = generateAlertHistoryReportHtml(reportData);
      return { html, filename: `alert-history-report-${Date.now()}.html` };
    })
  }),
  // Notifications
  notifications: router({
    registerConfig: protectedProcedure.input(
      z2.object({
        configId: z2.string(),
        enabled: z2.boolean(),
        type: z2.enum(["email" /* EMAIL */, "sms" /* SMS */, "push" /* PUSH */]),
        recipient: z2.string(),
        severityFilter: z2.array(z2.enum(["info" /* INFO */, "warning" /* WARNING */, "critical" /* CRITICAL */])).optional(),
        deviceFilter: z2.array(z2.number()).optional()
      })
    ).mutation(async ({ input }) => {
      notificationService.registerConfig(input.configId, input);
      return { success: true };
    }),
    getConfigs: publicProcedure.query(async () => {
      return notificationService.getConfigs();
    }),
    updateConfig: protectedProcedure.input(
      z2.object({
        configId: z2.string(),
        enabled: z2.boolean().optional(),
        recipient: z2.string().optional(),
        severityFilter: z2.array(z2.enum(["info" /* INFO */, "warning" /* WARNING */, "critical" /* CRITICAL */])).optional(),
        deviceFilter: z2.array(z2.number()).optional()
      })
    ).mutation(async ({ input }) => {
      const { configId, ...updates } = input;
      notificationService.updateConfig(configId, updates);
      return { success: true };
    }),
    deleteConfig: protectedProcedure.input(z2.object({ configId: z2.string() })).mutation(async ({ input }) => {
      notificationService.deleteConfig(input.configId);
      return { success: true };
    }),
    getQueueSize: publicProcedure.query(async () => {
      return { queueSize: notificationService.getQueueSize() };
    })
  }),
  // Device Grouping
  groups: router({
    create: protectedProcedure.input(
      z2.object({
        name: z2.string(),
        type: z2.enum(["zone" /* ZONE */, "production_line" /* PRODUCTION_LINE */, "department" /* DEPARTMENT */, "custom" /* CUSTOM */]),
        deviceIds: z2.array(z2.number()),
        description: z2.string().optional(),
        metadata: z2.record(z2.string(), z2.unknown()).optional()
      })
    ).mutation(async ({ input }) => {
      const group = deviceGroupingService.createGroup(
        input.name,
        input.type,
        input.deviceIds,
        input.description,
        input.metadata
      );
      return group;
    }),
    list: publicProcedure.query(async () => {
      return deviceGroupingService.getAllGroups();
    }),
    getById: publicProcedure.input(z2.object({ groupId: z2.string() })).query(async ({ input }) => {
      return deviceGroupingService.getGroup(input.groupId);
    }),
    getByType: publicProcedure.input(z2.object({ type: z2.enum(["zone" /* ZONE */, "production_line" /* PRODUCTION_LINE */, "department" /* DEPARTMENT */, "custom" /* CUSTOM */]) })).query(async ({ input }) => {
      return deviceGroupingService.getGroupsByType(input.type);
    }),
    getForDevice: publicProcedure.input(z2.object({ deviceId: z2.number() })).query(async ({ input }) => {
      return deviceGroupingService.getGroupsForDevice(input.deviceId);
    }),
    update: protectedProcedure.input(
      z2.object({
        groupId: z2.string(),
        name: z2.string().optional(),
        description: z2.string().optional(),
        deviceIds: z2.array(z2.number()).optional(),
        metadata: z2.record(z2.string(), z2.unknown()).optional()
      })
    ).mutation(async ({ input }) => {
      const { groupId, ...updates } = input;
      return deviceGroupingService.updateGroup(groupId, updates);
    }),
    delete: protectedProcedure.input(z2.object({ groupId: z2.string() })).mutation(async ({ input }) => {
      const success = deviceGroupingService.deleteGroup(input.groupId);
      return { success };
    }),
    addDevices: protectedProcedure.input(
      z2.object({
        groupId: z2.string(),
        deviceIds: z2.array(z2.number())
      })
    ).mutation(async ({ input }) => {
      return deviceGroupingService.addDevicesToGroup(input.groupId, input.deviceIds);
    }),
    removeDevices: protectedProcedure.input(
      z2.object({
        groupId: z2.string(),
        deviceIds: z2.array(z2.number())
      })
    ).mutation(async ({ input }) => {
      return deviceGroupingService.removeDevicesFromGroup(input.groupId, input.deviceIds);
    }),
    createBatchOperation: protectedProcedure.input(
      z2.object({
        groupId: z2.string(),
        operation: z2.string(),
        parameters: z2.record(z2.string(), z2.unknown())
      })
    ).mutation(async ({ input }) => {
      return deviceGroupingService.createBatchOperation(input.groupId, input.operation, input.parameters);
    }),
    getBatchOperation: publicProcedure.input(z2.object({ operationId: z2.string() })).query(async ({ input }) => {
      return deviceGroupingService.getBatchOperation(input.operationId);
    }),
    getBatchOperations: publicProcedure.input(z2.object({ groupId: z2.string() })).query(async ({ input }) => {
      return deviceGroupingService.getBatchOperationsForGroup(input.groupId);
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
var plugins = [react(), tailwindcss(), jsxLocPlugin()];
var vite_config_default = defineConfig({
  base: "/smart-factory-iot/",
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/websocket.ts
import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter as EventEmitter3 } from "events";
var WebSocketManager = class extends EventEmitter3 {
  constructor() {
    super(...arguments);
    this.wss = null;
    this.clients = /* @__PURE__ */ new Map();
    this.heartbeatInterval = null;
  }
  /**
   * Initialize WebSocket server
   */
  initialize(server, path3 = "/ws") {
    this.wss = new WebSocketServer({ server, path: path3 });
    this.wss.on("connection", (ws) => {
      this.handleConnection(ws);
    });
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 3e4);
    console.log("[WebSocket] Server initialized");
  }
  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws) {
    const clientId = this.generateClientId();
    console.log(`[WebSocket] Client connected: ${clientId}`);
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(clientId, ws, message);
      } catch (error) {
        console.error(`[WebSocket] Failed to parse message:`, error);
        this.sendError(ws, "Invalid message format");
      }
    });
    ws.on("close", () => {
      this.handleDisconnection(clientId);
    });
    ws.on("error", (error) => {
      console.error(`[WebSocket] Client error (${clientId}):`, error);
    });
  }
  /**
   * Handle incoming WebSocket message
   */
  handleMessage(clientId, ws, message) {
    if (message.type === "subscribe") {
      const { channels } = message;
      if (Array.isArray(channels)) {
        this.subscribe(clientId, ws, channels);
      }
    } else if (message.type === "unsubscribe") {
      const { channels } = message;
      if (Array.isArray(channels)) {
        this.unsubscribe(clientId, channels);
      }
    }
  }
  /**
   * Subscribe client to channels
   */
  subscribe(clientId, ws, channels) {
    for (const channel of channels) {
      if (!this.clients.has(channel)) {
        this.clients.set(channel, /* @__PURE__ */ new Set());
      }
      this.clients.get(channel).add(ws);
    }
    this.send(ws, {
      type: "subscription_confirm" /* SUBSCRIPTION_CONFIRM */,
      data: { channels },
      timestamp: Date.now()
    });
    console.log(`[WebSocket] Client ${clientId} subscribed to: ${channels.join(", ")}`);
  }
  /**
   * Unsubscribe client from channels
   */
  unsubscribe(clientId, channels) {
    for (const channel of channels) {
      const clients = this.clients.get(channel);
      if (clients) {
        for (const ws of clients) {
          if (ws.readyState === WebSocket.OPEN) {
            clients.delete(ws);
          }
        }
      }
    }
  }
  /**
   * Handle client disconnection
   */
  handleDisconnection(clientId) {
    for (const [, clients] of this.clients) {
      for (const ws of clients) {
        if (ws.readyState === WebSocket.CLOSED) {
          clients.delete(ws);
        }
      }
    }
    console.log(`[WebSocket] Client disconnected: ${clientId}`);
  }
  /**
   * Broadcast sensor data to subscribed clients
   */
  broadcastSensorData(deviceId, data) {
    const channel = `device:${deviceId}:sensor`;
    const message = {
      type: "sensor_data" /* SENSOR_DATA */,
      data: {
        deviceId,
        ...data,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };
    this.broadcast(channel, message);
  }
  /**
   * Broadcast alert to subscribed clients
   */
  broadcastAlert(deviceId, alert) {
    const channel = `device:${deviceId}:alert`;
    const alertChannel = "alerts:all";
    const message = {
      type: "alert" /* ALERT */,
      data: {
        alertId: alert.id,
        deviceId,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };
    this.broadcast(channel, message);
    this.broadcast(alertChannel, message);
  }
  /**
   * Broadcast device status change
   */
  broadcastDeviceStatus(deviceId, status) {
    const channel = `device:${deviceId}:status`;
    const message = {
      type: "device_status" /* DEVICE_STATUS */,
      data: {
        deviceId,
        status,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };
    this.broadcast(channel, message);
  }
  /**
   * Broadcast message to all clients in a channel
   */
  broadcast(channel, message) {
    const clients = this.clients.get(channel);
    if (clients) {
      const clientArray = Array.from(clients);
      for (const ws of clientArray) {
        this.send(ws, message);
      }
    }
  }
  /**
   * Send message to specific client
   */
  send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  /**
   * Send error message to client
   */
  sendError(ws, error) {
    this.send(ws, {
      type: "error" /* ERROR */,
      data: { error },
      timestamp: Date.now()
    });
  }
  /**
   * Broadcast heartbeat to all connected clients
   */
  broadcastHeartbeat() {
    const channelsArray = Array.from(this.clients.entries());
    for (const [, clients] of channelsArray) {
      const clientArray = Array.from(clients);
      for (const ws of clientArray) {
        this.send(ws, {
          type: "heartbeat" /* HEARTBEAT */,
          data: {},
          timestamp: Date.now()
        });
      }
    }
  }
  /**
   * Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Shutdown WebSocket server
   */
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.wss) {
      this.wss.close(() => {
        console.log("[WebSocket] Server shut down");
      });
    }
    this.clients.clear();
  }
  /**
   * Get number of connected clients
   */
  getConnectedClientsCount() {
    let count = 0;
    const clientsArray = Array.from(this.clients.values());
    for (const clients of clientsArray) {
      count += clients.size;
    }
    return count;
  }
  /**
   * Get number of subscribed channels
   */
  getSubscribedChannelsCount() {
    return this.clients.size;
  }
};
var wsManager = new WebSocketManager();

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  wsManager.initialize(server, "/ws");
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    wsManager.shutdown();
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
}
startServer().catch(console.error);
