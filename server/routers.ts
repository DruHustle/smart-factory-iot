import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { sdk } from "./_core/sdk";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import * as mock from "./mockData";
import * as pdf from "./pdfExport";
import { notificationService, NotificationType, NotificationSeverity } from "./notifications";
import { deviceGroupingService, GroupType } from "./deviceGrouping";

// Enums
const deviceTypeEnum = z.enum(["sensor", "actuator", "controller", "gateway"]);
const deviceStatusEnum = z.enum(["online", "offline", "maintenance", "error"]);
const alertSeverityEnum = z.enum(["info", "warning", "critical"]);
const deploymentStatusEnum = z.enum(["pending", "downloading", "installing", "completed", "failed", "rolled_back"]);
const metricEnum = z.enum(["temperature", "humidity", "vibration", "power", "pressure", "rpm"]);

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
      .mutation(async ({ input }) => {
        if (await db.getUserByEmail(input.email)) throw new Error("Email already registered");
        const user = await db.createUser({
          email: input.email,
          password: await sdk.hashPassword(input.password),
          name: input.name,
          openId: Math.random().toString(36).substring(7),
          role: "user",
        });
        return { success: true, user };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
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

  alerts: router({
    list: publicProcedure.input(z.object({ deviceId: z.number().optional(), status: z.enum(["active", "acknowledged", "resolved"]).optional(), severity: alertSeverityEnum.optional(), limit: z.number().optional() }).optional()).query(({ input }) => db.getAlerts(input)),
    update: protectedProcedure.input(z.object({ id: z.number(), status: z.enum(["active", "acknowledged", "resolved"]), acknowledgedBy: z.number().optional() })).mutation(({ input: { id, ...data } }) => db.updateAlert(id, data)),
    getStats: publicProcedure.query(() => db.getAlertStats()),
  }),

  ota: router({
    deploy: protectedProcedure.input(z.object({ deviceId: z.number(), firmwareVersionId: z.number() })).mutation(async ({ input }) => db.createOtaDeployment({ ...input, status: "pending" })),
    list: publicProcedure.input(z.object({ deviceId: z.number().optional() }).optional()).query(({ input }) => db.getOtaDeployments(input)),
  }),

  analytics: router({
    getOverview: publicProcedure.query(async () => ({ devices: await db.getDeviceStats(), alerts: await db.getAlertStats() })),
    getEnergy: publicProcedure.input(z.object({ startTime: z.number(), endTime: z.number(), intervalMs: z.number().optional() })).query(async ({ input }) => {
      const devices = await db.getDevices();
      return db.getAggregatedReadings(devices.map(d => d.id), input.startTime, input.endTime, input.intervalMs);
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
      return { html: pdf.generateDeviceReportHtml({ device, readings, thresholds, alerts, dateRange: { start: new Date(input.startTime), end: new Date(input.endTime) } }), filename: `report-${device.deviceId}.html` };
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
