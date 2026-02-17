import { beforeAll, describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { sdk } from "./_core/sdk";
import * as db from "./db";

type CookieCall = {
  name: string;
  value?: string;
  options?: Record<string, unknown>;
};

function createContext(opts?: {
  authenticated?: boolean;
  role?: "user" | "admin";
}): { ctx: TrpcContext; cookieCalls: CookieCall[]; clearedCookies: CookieCall[] } {
  const cookieCalls: CookieCall[] = [];
  const clearedCookies: CookieCall[] = [];

  const user =
    opts?.authenticated
      ? {
          id: 1,
          openId: "test-admin",
          email: "admin@test.local",
          name: "Test Admin",
          loginMethod: "password",
          role: opts.role ?? "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null;

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "http",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookieCalls.push({ name, value, options });
      },
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, cookieCalls, clearedCookies };
}

let testDeviceId = 0;
let testFirmwareId = 0;
let testDeploymentId = 0;
let testAlertId = 0;

beforeAll(async () => {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const { ctx } = createContext({ authenticated: true, role: "admin" });
  const caller = appRouter.createCaller(ctx);

  const createdDevice = await caller.devices.create({
    deviceId: `e2e-device-${unique}`,
    name: "E2E Device",
    type: "sensor",
    status: "online",
    location: "Factory A",
    zone: "Zone A",
  });
  testDeviceId = createdDevice.id;

  await caller.readings.create({
    deviceId: createdDevice.id,
    temperature: 33,
    timestamp: Date.now(),
  });

  const fw = await db.createFirmwareVersion({
    version: `v-e2e-${unique}`,
    deviceType: "sensor",
    releaseNotes: "Integration test release",
    isStable: true,
  });
  testFirmwareId = fw.id;

  const createdAlert = await db.createAlert({
    deviceId: createdDevice.id,
    type: "threshold_exceeded",
    severity: "warning",
    metric: "temperature",
    value: 33,
    threshold: 30,
    message: "Temperature warning",
    status: "active",
  });
  testAlertId = createdAlert.id;
});

describe("App Function Coverage", () => {
  it("covers system procedures", async () => {
    const { ctx } = createContext({ authenticated: true, role: "admin" });
    const caller = appRouter.createCaller(ctx);

    const health = await caller.system.health({ timestamp: Date.now() });
    expect(health.ok).toBe(true);

    const notified = await caller.system.notifyOwner({
      title: "Test",
      content: "System coverage check",
    });
    expect(notified.success).toBe(true);
  });

  it("covers auth register/login/me/logout", async () => {
    const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const email = `e2e-auth-${unique}@test.local`;
    const password = "P@ssw0rd!123";

    const registration = createContext({ authenticated: false });
    const registerCaller = appRouter.createCaller(registration.ctx);
    const registered = await registerCaller.auth.register({
      email,
      password,
      name: "E2E User",
    });

    expect(registered.user?.email).toBe(email);
    expect(typeof registered.token).toBe("string");
    expect(registration.cookieCalls.length).toBeGreaterThan(0);

    const loginContext = createContext({ authenticated: false });
    const loginCaller = appRouter.createCaller(loginContext.ctx);
    const loginResult = await loginCaller.auth.login({ email, password });

    expect(loginResult.user?.email).toBe(email);
    expect(typeof loginResult.token).toBe("string");
    expect(loginContext.cookieCalls.length).toBeGreaterThan(0);

    const meContext = createContext({ authenticated: true, role: "user" });
    const meCaller = appRouter.createCaller(meContext.ctx);
    const me = await meCaller.auth.me();
    expect(me?.openId).toBe("test-admin");

    const logout = createContext({ authenticated: true, role: "user" });
    const logoutCaller = appRouter.createCaller(logout.ctx);
    const loggedOut = await logoutCaller.auth.logout();
    expect(loggedOut.success).toBe(true);
    expect(logout.clearedCookies.length).toBe(1);
  });

  it("covers device/readings/threshold/alert/ota procedures", async () => {
    const { ctx } = createContext({ authenticated: true, role: "admin" });
    const caller = appRouter.createCaller(ctx);

    const device = await caller.devices.getById({ id: testDeviceId });
    expect(device?.id).toBe(testDeviceId);

    const updated = await caller.devices.update({ id: testDeviceId, status: "maintenance" });
    expect(updated?.status).toBe("maintenance");

    const thresholds = await caller.thresholds.upsertForDevice({
      deviceId: testDeviceId,
      thresholds: [
        {
          deviceId: testDeviceId,
          metric: "temperature",
          minValue: 10,
          maxValue: 60,
          warningMin: 15,
          warningMax: 55,
          enabled: true,
        },
      ],
    });
    expect(thresholds.length).toBeGreaterThan(0);

    const readings = await caller.readings.getForDevice({
      deviceId: testDeviceId,
      startTime: Date.now() - 1000 * 60 * 60,
      endTime: Date.now(),
      limit: 100,
    });
    expect(Array.isArray(readings)).toBe(true);

    const latest = await caller.readings.getLatest({ deviceId: testDeviceId });
    expect(latest?.deviceId).toBe(testDeviceId);

    const alertStatusUpdated = await caller.alerts.updateStatus({
      id: testAlertId,
      status: "acknowledged",
    });
    expect(alertStatusUpdated?.status).toBe("acknowledged");

    const updatedAlert = await caller.alerts.update({
      id: testAlertId,
      status: "resolved",
      acknowledgedBy: 1,
    });
    expect(updatedAlert?.status).toBe("resolved");

    const deployed = await caller.ota.deploy({
      deviceId: testDeviceId,
      firmwareVersionId: testFirmwareId,
    });
    testDeploymentId = deployed.id;
    expect(deployed.status).toBe("pending");

    const rolledBack = await caller.ota.rollback({ deploymentId: testDeploymentId });
    expect(rolledBack.success).toBe(true);
  });

  it("covers analytics/export/firmware/notifications/groups procedures", async () => {
    const { ctx } = createContext({ authenticated: true, role: "admin" });
    const caller = appRouter.createCaller(ctx);

    const overview = await caller.analytics.getOverview();
    expect(overview.devices.total).toBeGreaterThanOrEqual(0);

    const startTime = Date.now() - 1000 * 60 * 60 * 24;
    const endTime = Date.now();

    const energy = await caller.analytics.getEnergy({ startTime, endTime });
    expect(Array.isArray(energy)).toBe(true);

    const energyConsumption = await caller.analytics.getEnergyConsumption({ startTime, endTime });
    expect(Array.isArray(energyConsumption)).toBe(true);

    const oee = await caller.analytics.getOEEMetrics();
    expect(typeof oee.oee).toBe("number");

    const firmwareList = await caller.firmware.list({ deviceType: "sensor" });
    expect(Array.isArray(firmwareList)).toBe(true);

    const deploys = await caller.ota.list({ deviceId: testDeviceId, limit: 10 });
    expect(deploys.some((d) => d.id === testDeploymentId)).toBe(true);

    const deviceReport = await caller.export.deviceReport({ deviceId: testDeviceId, startTime, endTime });
    expect(deviceReport.filename).toContain("device-report-");

    const analyticsReport = await caller.export.analyticsReport({ startTime, endTime });
    expect(analyticsReport.filename).toContain("analytics-report-");

    const alertHistory = await caller.export.alertHistoryReport({
      startTime,
      endTime,
      severity: "warning",
    });
    expect(alertHistory.filename).toContain("alert-history-report-");

    const configs = await caller.notifications.getConfigs();
    expect(Array.isArray(configs)).toBe(true);

    const notificationUpdate = await caller.notifications.updateConfig({
      configId: "missing-config",
      enabled: true,
      recipient: "owner@test.local",
    });
    expect(notificationUpdate.success).toBe(true);

    const group = await caller.groups.create({
      name: "E2E Group",
      type: "custom",
      deviceIds: [testDeviceId],
    });
    expect(group.deviceIds).toContain(testDeviceId);

    const groups = await caller.groups.list();
    expect(groups.some((g) => g.id === group.id)).toBe(true);
  });

  it("covers auth helper functions", async () => {
    const hashed = await sdk.hashPassword("sample-pass");
    const valid = await sdk.comparePassword("sample-pass", hashed);
    expect(valid).toBe(true);

    const sessionToken = await sdk.signSession({
      openId: "manual-open-id",
      appId: "smart-factory-iot",
      name: "Manual User",
      email: "manual@test.local",
      role: "user",
    });
    expect(typeof sessionToken).toBe("string");
  });
});
