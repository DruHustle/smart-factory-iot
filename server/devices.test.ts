import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Create a mock context for testing
function createMockContext(authenticated = false): TrpcContext {
  const user = authenticated
    ? {
        id: 1,
        openId: "test-user",
        email: "test@example.com",
        name: "Test User",
        loginMethod: "manus",
        role: "admin" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }
    : null;

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Device Management", () => {
  describe("devices.list", () => {
    it("returns an array of devices", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const devices = await caller.devices.list();

      expect(Array.isArray(devices)).toBe(true);
    });

    it("can filter devices by status", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const onlineDevices = await caller.devices.list({ status: "online" });
      const offlineDevices = await caller.devices.list({ status: "offline" });

      expect(Array.isArray(onlineDevices)).toBe(true);
      expect(Array.isArray(offlineDevices)).toBe(true);

      // All returned devices should match the filter
      onlineDevices.forEach((device) => {
        expect(device.status).toBe("online");
      });
      offlineDevices.forEach((device) => {
        expect(device.status).toBe("offline");
      });
    });

    it("can filter devices by type", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const sensors = await caller.devices.list({ type: "sensor" });

      expect(Array.isArray(sensors)).toBe(true);
      sensors.forEach((device) => {
        expect(device.type).toBe("sensor");
      });
    });
  });

  describe("devices.getStats", () => {
    it("returns device statistics", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const stats = await caller.devices.getStats();

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("online");
      expect(stats).toHaveProperty("offline");
      expect(stats).toHaveProperty("maintenance");
      expect(stats).toHaveProperty("error");
      expect(stats).toHaveProperty("byType");

      expect(typeof stats.total).toBe("number");
      expect(typeof stats.online).toBe("number");
      expect(stats.total).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("Threshold Management", () => {
  describe("thresholds.getForDevice", () => {
    it("returns thresholds for a device", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // First get a device to test with
      const devices = await caller.devices.list();
      if (devices.length === 0) {
        // Skip test if no devices exist
        return;
      }

      const deviceId = devices[0].id;
      const thresholds = await caller.thresholds.getForDevice({ deviceId });

      expect(Array.isArray(thresholds)).toBe(true);
      thresholds.forEach((threshold) => {
        expect(threshold).toHaveProperty("deviceId");
        expect(threshold).toHaveProperty("metric");
        expect(threshold).toHaveProperty("enabled");
        expect(threshold.deviceId).toBe(deviceId);
      });
    });
  });

  describe("thresholds.upsert", () => {
    it("requires authentication", async () => {
      const ctx = createMockContext(false); // Not authenticated
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.thresholds.upsert({
          deviceId: 1,
          metric: "temperature",
          minValue: 0,
          maxValue: 100,
          enabled: true,
        })
      ).rejects.toThrow();
    });

    it("creates or updates a threshold when authenticated", async () => {
      const ctx = createMockContext(true); // Authenticated
      const caller = appRouter.createCaller(ctx);

      // First get a device to test with
      const devices = await caller.devices.list();
      if (devices.length === 0) {
        // Skip test if no devices exist
        return;
      }

      const deviceId = devices[0].id;
      const result = await caller.thresholds.upsert({
        deviceId,
        metric: "temperature",
        minValue: 10,
        maxValue: 50,
        warningMin: 15,
        warningMax: 45,
        enabled: true,
      });

      expect(result).toBeDefined();
      expect(result.deviceId).toBe(deviceId);
      expect(result.metric).toBe("temperature");
    });
  });
});

describe("Sensor Readings", () => {
  describe("readings.getForDevice", () => {
    it("returns readings within a time range", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // First get a device to test with
      const devices = await caller.devices.list();
      if (devices.length === 0) {
        return;
      }

      const deviceId = devices[0].id;
      const endTime = Date.now();
      const startTime = endTime - 24 * 60 * 60 * 1000; // 24 hours ago

      const readings = await caller.readings.getForDevice({
        deviceId,
        startTime,
        endTime,
      });

      expect(Array.isArray(readings)).toBe(true);
      readings.forEach((reading) => {
        expect(reading).toHaveProperty("timestamp");
        expect(reading.timestamp).toBeGreaterThanOrEqual(startTime);
        expect(reading.timestamp).toBeLessThanOrEqual(endTime);
      });
    });
  });

  describe("readings.getLatest", () => {
    it("returns the latest reading for a device", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // First get a device to test with
      const devices = await caller.devices.list();
      if (devices.length === 0) {
        return;
      }

      const deviceId = devices[0].id;
      const reading = await caller.readings.getLatest({ deviceId });

      // Reading may be null if no data exists
      if (reading) {
        expect(reading).toHaveProperty("timestamp");
        expect(reading).toHaveProperty("deviceId");
        expect(reading.deviceId).toBe(deviceId);
      }
    });
  });
});

describe("Alert Management", () => {
  describe("alerts.list", () => {
    it("returns an array of alerts", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const alerts = await caller.alerts.list({ limit: 10 });

      expect(Array.isArray(alerts)).toBe(true);
    });

    it("can filter alerts by severity", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const criticalAlerts = await caller.alerts.list({ severity: "critical" });

      expect(Array.isArray(criticalAlerts)).toBe(true);
      criticalAlerts.forEach((alert) => {
        expect(alert.severity).toBe("critical");
      });
    });

    it("can filter alerts by status", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const activeAlerts = await caller.alerts.list({ status: "active" });

      expect(Array.isArray(activeAlerts)).toBe(true);
      activeAlerts.forEach((alert) => {
        expect(alert.status).toBe("active");
      });
    });
  });

  describe("alerts.getStats", () => {
    it("returns alert statistics", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const stats = await caller.alerts.getStats();

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("active");
      expect(stats).toHaveProperty("acknowledged");
      expect(stats).toHaveProperty("resolved");
      expect(stats).toHaveProperty("critical");
      expect(stats).toHaveProperty("warning");

      expect(typeof stats.total).toBe("number");
      expect(typeof stats.active).toBe("number");
    });
  });
});

describe("Analytics", () => {
  describe("analytics.getOverview", () => {
    it("returns overview data", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const overview = await caller.analytics.getOverview();

      expect(overview).toHaveProperty("devices");
      expect(overview).toHaveProperty("alerts");
    });
  });

  describe("analytics.getOEEMetrics", () => {
    it("returns OEE metrics", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const oee = await caller.analytics.getOEEMetrics();

      expect(oee).toHaveProperty("availability");
      expect(oee).toHaveProperty("performance");
      expect(oee).toHaveProperty("quality");
      expect(oee).toHaveProperty("oee");
      expect(oee).toHaveProperty("trend");

      expect(typeof oee.availability).toBe("number");
      expect(typeof oee.performance).toBe("number");
      expect(typeof oee.quality).toBe("number");
      expect(typeof oee.oee).toBe("number");
      expect(Array.isArray(oee.trend)).toBe(true);
    });
  });

  describe("analytics.getEnergyConsumption", () => {
    it("returns energy consumption data", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const endTime = Date.now();
      const startTime = endTime - 7 * 24 * 60 * 60 * 1000; // 7 days ago

      const energyData = await caller.analytics.getEnergyConsumption({
        startTime,
        endTime,
        intervalMs: 86400000, // 1 day
      });

      expect(Array.isArray(energyData)).toBe(true);
    });
  });
});

describe("OTA Updates", () => {
  describe("ota.list", () => {
    it("returns an array of deployments", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const deployments = await caller.ota.list({ limit: 10 });

      expect(Array.isArray(deployments)).toBe(true);
    });
  });

  describe("firmware.list", () => {
    it("returns an array of firmware versions", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const firmwareVersions = await caller.firmware.list();

      expect(Array.isArray(firmwareVersions)).toBe(true);
      firmwareVersions.forEach((fw) => {
        expect(fw).toHaveProperty("id");
        expect(fw).toHaveProperty("version");
        expect(fw).toHaveProperty("deviceType");
      });
    });
  });
});

describe("Export Functionality", () => {
  describe("export.deviceReport", () => {
    it("generates HTML report for a device", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // First get a device to test with
      const devices = await caller.devices.list();
      if (devices.length === 0) {
        return;
      }

      const deviceId = devices[0].id;
      const endTime = Date.now();
      const startTime = endTime - 24 * 60 * 60 * 1000;

      const result = await caller.export.deviceReport({
        deviceId,
        startTime,
        endTime,
      });

      expect(result).toHaveProperty("html");
      expect(result).toHaveProperty("filename");
      expect(typeof result.html).toBe("string");
      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.filename).toContain("device-report");
    });
  });

  describe("export.analyticsReport", () => {
    it("generates HTML analytics report", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const endTime = Date.now();
      const startTime = endTime - 7 * 24 * 60 * 60 * 1000;

      const result = await caller.export.analyticsReport({
        startTime,
        endTime,
      });

      expect(result).toHaveProperty("html");
      expect(result).toHaveProperty("filename");
      expect(typeof result.html).toBe("string");
      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.filename).toContain("analytics-report");
    });
  });

  describe("export.alertHistoryReport", () => {
    it("generates HTML alert history report", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const endTime = Date.now();
      const startTime = endTime - 30 * 24 * 60 * 60 * 1000;

      const result = await caller.export.alertHistoryReport({
        startTime,
        endTime,
      });

      expect(result).toHaveProperty("html");
      expect(result).toHaveProperty("filename");
      expect(typeof result.html).toBe("string");
      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.filename).toContain("alert-history-report");
    });
  });
});
