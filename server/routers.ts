import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { sdk } from "./_core/sdk";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as mock from "./mockData";
import * as pdf from "./pdfExport";
import { notificationService } from "./notifications";
import { deviceGroupingService, GroupType } from "./deviceGrouping";

const deviceTypeEnum = z.enum(["sensor", "actuator", "controller", "gateway"]);
const deviceStatusEnum = z.enum(["online", "offline", "maintenance", "error"]);
const alertSeverityEnum = z.enum(["info", "warning", "critical"]);
const deploymentStatusEnum = z.enum(["pending", "downloading", "installing", "completed", "failed", "rolled_back"]);
const metricEnum = z.enum(["temperature", "humidity", "vibration", "power", "pressure", "rpm"]);

const thresholdInputSchema = z.object({
  deviceId: z.number(),
  metric: metricEnum,
  minValue: z.number().nullable().optional(),
  maxValue: z.number().nullable().optional(),
  warningMin: z.number().nullable().optional(),
  warningMax: z.number().nullable().optional(),
  enabled: z.boolean().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.password || !(await sdk.comparePassword(input.password, user.password))) {
          throw new Error("Invalid email or password");
        }
        const token = await sdk.createSessionToken(user);
        ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
        return { token, user };
      }),
    register: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string(), name: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (await db.getUserByEmail(input.email)) throw new Error("Email already registered");
        const user = await db.createUser({
          email: input.email,
          password: await sdk.hashPassword(input.password),
          name: input.name,
          openId: Math.random().toString(36).substring(7),
          role: "user",
        });

        const token = await sdk.createSessionToken(user);
        ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
        return { token, user };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return { success: true };
    }),
  }),

  devices: router({
    list: publicProcedure.input(z.object({ status: deviceStatusEnum.optional(), type: deviceTypeEnum.optional(), zone: z.string().optional() }).optional()).query(({ input }) => db.getDevices(input)),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getDeviceById(input.id)),
    create: protectedProcedure.input(z.object({ deviceId: z.string(), name: z.string(), type: deviceTypeEnum, status: deviceStatusEnum.optional(), location: z.string().optional(), zone: z.string().optional() })).mutation(({ input }) => db.createDevice(input)),
    update: protectedProcedure.input(z.object({ id: z.number(), name: z.string().optional(), status: deviceStatusEnum.optional() })).mutation(({ input: { id, ...data } }) => db.updateDevice(id, data)),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteDevice(input.id)),
    getStats: publicProcedure.query(() => db.getDeviceStats()),
    seed: protectedProcedure.mutation(async () => {
      for (let i = 0; i < 10; i++) {
        const device = await db.createDevice(mock.generateRandomDevice("sensor"));
        await db.upsertAlertThresholds(device.id, mock.generateDefaultThresholds(device.id, "sensor"));
      }
      return { success: true };
    }),
  }),

  readings: router({
    getForDevice: publicProcedure.input(z.object({ deviceId: z.number(), startTime: z.number(), endTime: z.number(), limit: z.number().optional() })).query(({ input }) => db.getSensorReadings(input.deviceId, input.startTime, input.endTime, input.limit)),
    getLatest: publicProcedure.input(z.object({ deviceId: z.number() })).query(({ input }) => db.getLatestReading(input.deviceId)),
    create: protectedProcedure.input(z.object({ deviceId: z.number(), temperature: z.number().optional(), timestamp: z.number() })).mutation(async ({ input }) => { await db.createSensorReading(input); return { success: true }; }),
  }),

  thresholds: router({
    getForDevice: publicProcedure
      .input(z.object({ deviceId: z.number() }))
      .query(({ input }) => db.getAlertThresholds(input.deviceId)),
    upsert: protectedProcedure
      .input(thresholdInputSchema)
      .mutation(async ({ input }) => {
        const existing = await db.getAlertThresholds(input.deviceId);
        const match = existing.find((x) => x.metric === input.metric);
        if (match) {
          return db.updateAlertThreshold(match.id, {
            minValue: input.minValue ?? null,
            maxValue: input.maxValue ?? null,
            warningMin: input.warningMin ?? null,
            warningMax: input.warningMax ?? null,
            enabled: input.enabled ?? true,
          });
        }

        return db.createAlertThreshold({
          deviceId: input.deviceId,
          metric: input.metric,
          minValue: input.minValue ?? null,
          maxValue: input.maxValue ?? null,
          warningMin: input.warningMin ?? null,
          warningMax: input.warningMax ?? null,
          enabled: input.enabled ?? true,
        });
      }),
    upsertForDevice: protectedProcedure
      .input(z.object({
        deviceId: z.number(),
        thresholds: z.array(thresholdInputSchema),
      }))
      .mutation(async ({ input }) => {
        await db.upsertAlertThresholds(input.deviceId, input.thresholds.map((t) => ({
          deviceId: t.deviceId,
          metric: t.metric,
          minValue: t.minValue ?? null,
          maxValue: t.maxValue ?? null,
          warningMin: t.warningMin ?? null,
          warningMax: t.warningMax ?? null,
          enabled: t.enabled ?? true,
        })));

        return db.getAlertThresholds(input.deviceId);
      }),
  }),

  alerts: router({
    list: publicProcedure.input(z.object({ deviceId: z.number().optional(), status: z.enum(["active", "acknowledged", "resolved"]).optional(), severity: alertSeverityEnum.optional(), limit: z.number().optional() }).optional()).query(({ input }) => db.getAlerts(input)),
    update: protectedProcedure.input(z.object({ id: z.number(), status: z.enum(["active", "acknowledged", "resolved"]), acknowledgedBy: z.number().optional() })).mutation(({ input: { id, ...data } }) => db.updateAlert(id, data)),
    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["active", "acknowledged", "resolved"]) }))
      .mutation(({ input }) => db.updateAlert(input.id, { status: input.status })),
    getStats: publicProcedure.query(() => db.getAlertStats()),
  }),

  firmware: router({
    list: publicProcedure
      .input(z.object({ deviceType: deviceTypeEnum.optional() }).optional())
      .query(({ input }) => db.getFirmwareVersions(input?.deviceType)),
  }),

  ota: router({
    deploy: protectedProcedure.input(z.object({ deviceId: z.number(), firmwareVersionId: z.number() })).mutation(async ({ input }) => db.createOtaDeployment({ ...input, status: "pending" })),
    list: publicProcedure.input(z.object({ deviceId: z.number().optional(), limit: z.number().optional() }).optional()).query(({ input }) => db.getOtaDeployments(input)),
    rollback: protectedProcedure
      .input(z.object({ deploymentId: z.number() }))
      .mutation(async ({ input }) => {
        const deployments = await db.getOtaDeployments();
        const deployment = deployments.find((d) => d.id === input.deploymentId);
        if (!deployment) {
          throw new Error("Deployment not found");
        }

        await db.updateOtaDeployment(input.deploymentId, { status: "rolled_back" });

        return {
          success: true,
          restoredVersion: deployment.firmwareVersionId,
        };
      }),
  }),

  analytics: router({
    getOverview: publicProcedure.query(async () => ({ devices: await db.getDeviceStats(), alerts: await db.getAlertStats() })),
    getEnergy: publicProcedure.input(z.object({ startTime: z.number(), endTime: z.number(), intervalMs: z.number().optional() })).query(async ({ input }) => {
      const devices = await db.getDevices();
      return db.getAggregatedReadings(devices.map(d => d.id), input.startTime, input.endTime, input.intervalMs);
    }),
    getEnergyConsumption: publicProcedure.input(z.object({ startTime: z.number(), endTime: z.number(), intervalMs: z.number().optional() })).query(async ({ input }) => {
      const devices = await db.getDevices();
      return db.getAggregatedReadings(devices.map(d => d.id), input.startTime, input.endTime, input.intervalMs);
    }),
    getOEEMetrics: publicProcedure.query(async () => {
      const availability = 92;
      const performance = 88;
      const quality = 96;
      const oee = Number(((availability * performance * quality) / 10000).toFixed(2));
      const trend = Array.from({ length: 7 }, (_, i) => ({
        day: i + 1,
        value: Number((oee - 2 + Math.random() * 4).toFixed(2)),
      }));

      return { availability, performance, quality, oee, trend };
    }),
  }),

  export: router({
    deviceReport: publicProcedure.input(z.object({ deviceId: z.number(), startTime: z.number(), endTime: z.number() })).mutation(async ({ input }) => {
      const device = await db.getDeviceById(input.deviceId);
      if (!device) throw new Error("Device not found");
      const [readings, thresholds, alerts] = await Promise.all([
        db.getSensorReadings(input.deviceId, input.startTime, input.endTime),
        db.getAlertThresholds(input.deviceId),
        db.getAlerts({ deviceId: input.deviceId, limit: 50 }),
      ]);
      return { html: pdf.generateDeviceReportHtml({ device, readings, thresholds, alerts, dateRange: { start: new Date(input.startTime), end: new Date(input.endTime) } }), filename: `device-report-${device.deviceId}.html` };
    }),
    analyticsReport: publicProcedure.input(z.object({ startTime: z.number(), endTime: z.number() })).mutation(async ({ input }) => {
      const [deviceStats, alertStats, devices] = await Promise.all([
        db.getDeviceStats(),
        db.getAlertStats(),
        db.getDevices(),
      ]);
      const energyData = await db.getAggregatedReadings(devices.map((d) => d.id), input.startTime, input.endTime);

      const oeeMetrics = {
        availability: 92,
        performance: 88,
        quality: 96,
        oee: Number(((92 * 88 * 96) / 10000).toFixed(2)),
      };

      return {
        html: pdf.generateAnalyticsReportHtml({
          overview: {
            totalDevices: deviceStats.total,
            onlineDevices: deviceStats.online,
            activeAlerts: alertStats.active,
            criticalAlerts: alertStats.critical,
          },
          oeeMetrics,
          energyData,
          dateRange: { start: new Date(input.startTime), end: new Date(input.endTime) },
        }),
        filename: `analytics-report-${Date.now()}.html`,
      };
    }),
    alertHistoryReport: publicProcedure.input(z.object({ startTime: z.number(), endTime: z.number(), severity: alertSeverityEnum.optional() })).mutation(async ({ input }) => {
      const allAlerts = await db.getAlerts({ limit: 500 });
      const filtered = allAlerts.filter((a) => {
        const createdAtMs = new Date(a.createdAt).getTime();
        const inRange = createdAtMs >= input.startTime && createdAtMs <= input.endTime;
        const matchesSeverity = !input.severity || a.severity === input.severity;
        return inRange && matchesSeverity;
      });

      const alerts = filtered.map((a) => ({
        id: a.id,
        deviceName: `Device ${a.deviceId}`,
        message: a.message,
        type: a.type,
        severity: a.severity,
        status: a.status,
        createdAt: a.createdAt,
        resolvedAt: a.resolvedAt,
      }));

      const summary = {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
        resolved: alerts.filter((a) => a.status === "resolved").length,
      };

      return {
        html: pdf.generateAlertHistoryReportHtml({
          alerts,
          summary,
          dateRange: { start: new Date(input.startTime), end: new Date(input.endTime) },
        }),
        filename: `alert-history-report-${Date.now()}.html`,
      };
    }),
  }),

  notifications: router({
    getConfigs: publicProcedure.query(() => notificationService.getConfigs()),
    updateConfig: protectedProcedure.input(z.object({ configId: z.string(), enabled: z.boolean().optional(), recipient: z.string().optional() })).mutation(({ input: { configId, ...updates } }) => { notificationService.updateConfig(configId, updates); return { success: true }; }),
  }),

  groups: router({
    list: publicProcedure.query(() => deviceGroupingService.getAllGroups()),
    create: protectedProcedure.input(z.object({ name: z.string(), type: z.nativeEnum(GroupType), deviceIds: z.array(z.number()) })).mutation(({ input }) => deviceGroupingService.createGroup(input.name, input.type, input.deviceIds)),
  }),
});

export type AppRouter = typeof appRouter;
