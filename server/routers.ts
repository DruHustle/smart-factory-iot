import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import {
  generateRandomDevice,
  generateHistoricalReadings,
  generateDefaultThresholds,
  generateAlert,
  firmwareVersionsList,
} from "./mockData";
import {
  generateDeviceReportHtml,
  generateAnalyticsReportHtml,
  generateAlertHistoryReportHtml,
  type DeviceReportData,
  type AnalyticsReportData,
  type AlertHistoryReportData,
} from "./pdfExport";
import { notificationService, NotificationType, NotificationSeverity } from "./notifications";
import { deviceGroupingService, GroupType } from "./deviceGrouping";

const deviceTypeEnum = z.enum(["sensor", "actuator", "controller", "gateway"]);
const deviceStatusEnum = z.enum(["online", "offline", "maintenance", "error"]);
const alertStatusEnum = z.enum(["active", "acknowledged", "resolved"]);
const alertSeverityEnum = z.enum(["info", "warning", "critical"]);
const alertTypeEnum = z.enum([
  "threshold_exceeded",
  "device_offline",
  "firmware_update",
  "maintenance_required",
  "system_error",
]);
const metricEnum = z.enum(["temperature", "humidity", "vibration", "power", "pressure", "rpm"]);
const deploymentStatusEnum = z.enum([
  "pending",
  "downloading",
  "installing",
  "completed",
  "failed",
  "rolled_back",
]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Device Management
  devices: router({
    list: publicProcedure
      .input(
        z
          .object({
            status: deviceStatusEnum.optional(),
            type: deviceTypeEnum.optional(),
            zone: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.getDevices(input);
      }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getDeviceById(input.id);
    }),

    getByDeviceId: publicProcedure.input(z.object({ deviceId: z.string() })).query(async ({ input }) => {
      return db.getDeviceByDeviceId(input.deviceId);
    }),

    create: protectedProcedure
      .input(
        z.object({
          deviceId: z.string(),
          name: z.string(),
          type: deviceTypeEnum,
          status: deviceStatusEnum.optional(),
          location: z.string().optional(),
          zone: z.string().optional(),
          firmwareVersion: z.string().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createDevice(input);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          status: deviceStatusEnum.optional(),
          location: z.string().optional(),
          zone: z.string().optional(),
          firmwareVersion: z.string().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateDevice(id, data);
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteDevice(input.id);
    }),

    getStats: publicProcedure.query(async () => {
      return db.getDeviceStats();
    }),

    // Seed mock devices
    seedMockData: protectedProcedure.mutation(async () => {
      const types: Array<"sensor" | "actuator" | "controller" | "gateway"> = [
        "sensor",
        "actuator",
        "controller",
        "gateway",
      ];
      const createdDevices = [];

      for (let i = 0; i < 20; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const deviceData = generateRandomDevice(type);
        try {
          const device = await db.createDevice(deviceData);
          createdDevices.push(device);

          // Generate default thresholds for the device
          const thresholds = generateDefaultThresholds(device.id, type);
          await db.upsertAlertThresholds(device.id, thresholds);

          // Generate historical readings (last 24 hours)
          const now = Date.now();
          const readings = generateHistoricalReadings(
            device.id,
            type,
            now - 24 * 60 * 60 * 1000,
            now,
            5 * 60 * 1000 // 5 minute intervals
          );
          await db.createSensorReadingsBatch(readings);

          // Generate some alerts
          if (Math.random() > 0.7) {
            const severities: Array<"info" | "warning" | "critical"> = ["info", "warning", "critical"];
            const alertTypes: Array<
              "threshold_exceeded" | "device_offline" | "firmware_update" | "maintenance_required" | "system_error"
            > = ["threshold_exceeded", "device_offline", "firmware_update", "maintenance_required", "system_error"];
            const alertData = generateAlert(
              device.id,
              alertTypes[Math.floor(Math.random() * alertTypes.length)],
              severities[Math.floor(Math.random() * severities.length)]
            );
            await db.createAlert(alertData);
          }
        } catch (e) {
          console.error("Error creating device:", e);
        }
      }

      // Seed firmware versions
      for (const fw of firmwareVersionsList) {
        for (const type of types) {
          try {
            await db.createFirmwareVersion({
              version: `${fw.version}-${type}`,
              deviceType: type,
              releaseNotes: fw.releaseNotes,
              isStable: fw.isStable,
            });
          } catch (e) {
            // Ignore duplicate errors
          }
        }
      }

      return { created: createdDevices.length };
    }),
  }),

  // Sensor Readings
  readings: router({
    getForDevice: publicProcedure
      .input(
        z.object({
          deviceId: z.number(),
          startTime: z.number(),
          endTime: z.number(),
          limit: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return db.getSensorReadings(input.deviceId, input.startTime, input.endTime, input.limit);
      }),

    getLatest: publicProcedure.input(z.object({ deviceId: z.number() })).query(async ({ input }) => {
      return db.getLatestReading(input.deviceId);
    }),

    getAggregated: publicProcedure
      .input(
        z.object({
          deviceIds: z.array(z.number()),
          startTime: z.number(),
          endTime: z.number(),
          intervalMs: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return db.getAggregatedReadings(
          input.deviceIds,
          input.startTime,
          input.endTime,
          input.intervalMs
        );
      }),

    create: protectedProcedure
      .input(
        z.object({
          deviceId: z.number(),
          temperature: z.number().nullable().optional(),
          humidity: z.number().nullable().optional(),
          vibration: z.number().nullable().optional(),
          power: z.number().nullable().optional(),
          pressure: z.number().nullable().optional(),
          rpm: z.number().nullable().optional(),
          timestamp: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        await db.createSensorReading(input);
        return { success: true };
      }),
  }),

  // Alert Thresholds
  thresholds: router({
    getForDevice: publicProcedure.input(z.object({ deviceId: z.number() })).query(async ({ input }) => {
      return db.getAlertThresholds(input.deviceId);
    }),

    create: protectedProcedure
      .input(
        z.object({
          deviceId: z.number(),
          metric: metricEnum,
          minValue: z.number().nullable().optional(),
          maxValue: z.number().nullable().optional(),
          warningMin: z.number().nullable().optional(),
          warningMax: z.number().nullable().optional(),
          enabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createAlertThreshold(input);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          minValue: z.number().nullable().optional(),
          maxValue: z.number().nullable().optional(),
          warningMin: z.number().nullable().optional(),
          warningMax: z.number().nullable().optional(),
          enabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateAlertThreshold(id, data);
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      return db.deleteAlertThreshold(input.id);
    }),

    upsertForDevice: protectedProcedure
      .input(
        z.object({
          deviceId: z.number(),
          thresholds: z.array(
            z.object({
              deviceId: z.number(),
              metric: metricEnum,
              minValue: z.number().nullable().optional(),
              maxValue: z.number().nullable().optional(),
              warningMin: z.number().nullable().optional(),
              warningMax: z.number().nullable().optional(),
              enabled: z.boolean().optional(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        await db.upsertAlertThresholds(input.deviceId, input.thresholds);
        return { success: true };
      }),
  }),

  // Alerts
  alerts: router({
    list: publicProcedure
      .input(
        z
          .object({
            deviceId: z.number().optional(),
            status: alertStatusEnum.optional(),
            severity: alertSeverityEnum.optional(),
            limit: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.getAlerts(input);
      }),

    create: protectedProcedure
      .input(
        z.object({
          deviceId: z.number(),
          type: alertTypeEnum,
          severity: alertSeverityEnum,
          metric: z.string().optional(),
          value: z.number().optional(),
          threshold: z.number().optional(),
          message: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createAlert(input);
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: alertStatusEnum,
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.updateAlertStatus(input.id, input.status, ctx.user?.id);
      }),

    getStats: publicProcedure.query(async () => {
      return db.getAlertStats();
    }),
  }),

  // Firmware Versions
  firmware: router({
    list: publicProcedure
      .input(z.object({ deviceType: deviceTypeEnum.optional() }).optional())
      .query(async ({ input }) => {
        return db.getFirmwareVersions(input?.deviceType);
      }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getFirmwareVersionById(input.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          version: z.string(),
          deviceType: deviceTypeEnum,
          releaseNotes: z.string().optional(),
          fileUrl: z.string().optional(),
          fileSize: z.number().optional(),
          checksum: z.string().optional(),
          isStable: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createFirmwareVersion(input);
      }),
  }),

  // OTA Deployments
  ota: router({
    list: publicProcedure
      .input(
        z
          .object({
            deviceId: z.number().optional(),
            status: deploymentStatusEnum.optional(),
            limit: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.getOtaDeployments(input);
      }),

    getLatestForDevice: publicProcedure.input(z.object({ deviceId: z.number() })).query(async ({ input }) => {
      return db.getLatestDeploymentForDevice(input.deviceId);
    }),

    deploy: protectedProcedure
      .input(
        z.object({
          deviceId: z.number(),
          firmwareVersionId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        // Get the device to store previous version
        const device = await db.getDeviceById(input.deviceId);
        if (!device) {
          throw new Error("Device not found");
        }

        // Create deployment record
        const deployment = await db.createOtaDeployment({
          deviceId: input.deviceId,
          firmwareVersionId: input.firmwareVersionId,
          previousVersion: device.firmwareVersion,
          status: "pending",
          startedAt: new Date(),
        });

        // Simulate deployment progress (in real app, this would be handled by the device)
        setTimeout(async () => {
          await db.updateOtaDeployment(deployment.id, { status: "downloading", progress: 25 });
        }, 1000);

        setTimeout(async () => {
          await db.updateOtaDeployment(deployment.id, { status: "installing", progress: 75 });
        }, 3000);

        setTimeout(async () => {
          const success = Math.random() > 0.1; // 90% success rate
          if (success) {
            const firmware = await db.getFirmwareVersionById(input.firmwareVersionId);
            await db.updateOtaDeployment(deployment.id, {
              status: "completed",
              progress: 100,
              completedAt: new Date(),
            });
            if (firmware) {
              await db.updateDevice(input.deviceId, { firmwareVersion: firmware.version });
            }
          } else {
            await db.updateOtaDeployment(deployment.id, {
              status: "failed",
              errorMessage: "Installation failed: checksum mismatch",
            });
          }
        }, 5000);

        return deployment;
      }),

    rollback: protectedProcedure.input(z.object({ deploymentId: z.number() })).mutation(async ({ input }) => {
      const deployment = await db.getOtaDeployments({ limit: 1 });
      const currentDeployment = deployment.find((d) => d.id === input.deploymentId);

      if (!currentDeployment) {
        throw new Error("Deployment not found");
      }

      if (!currentDeployment.previousVersion) {
        throw new Error("No previous version to rollback to");
      }

      // Update deployment status
      await db.updateOtaDeployment(input.deploymentId, { status: "rolled_back" });

      // Restore previous firmware version
      await db.updateDevice(currentDeployment.deviceId, {
        firmwareVersion: currentDeployment.previousVersion,
      });

      return { success: true, restoredVersion: currentDeployment.previousVersion };
    }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: deploymentStatusEnum,
          progress: z.number().optional(),
          errorMessage: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateOtaDeployment(id, data);
      }),
  }),

  // Analytics
  analytics: router({
    getOverview: publicProcedure.query(async () => {
      const [deviceStats, alertStats] = await Promise.all([db.getDeviceStats(), db.getAlertStats()]);

      return {
        devices: deviceStats,
        alerts: alertStats,
      };
    }),

    getEnergyConsumption: publicProcedure
      .input(
        z.object({
          startTime: z.number(),
          endTime: z.number(),
          intervalMs: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const devices = await db.getDevices();
        const deviceIds = devices.map((d) => d.id);
        return db.getAggregatedReadings(deviceIds, input.startTime, input.endTime, input.intervalMs);
      }),

    getOEEMetrics: publicProcedure.query(async () => {
      // Simulated OEE metrics
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
          { date: "Sun", oee: 79.2 },
        ],
      };
    }),
  }),

  // PDF Export
  export: router({
    deviceReport: publicProcedure
      .input(
        z.object({
          deviceId: z.number(),
          startTime: z.number(),
          endTime: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const device = await db.getDeviceById(input.deviceId);
        if (!device) {
          throw new Error("Device not found");
        }

        const [readings, thresholds, alerts] = await Promise.all([
          db.getSensorReadings(input.deviceId, input.startTime, input.endTime),
          db.getAlertThresholds(input.deviceId),
          db.getAlerts({ deviceId: input.deviceId, limit: 50 }),
        ]);

        const reportData: DeviceReportData = {
          device,
          readings,
          thresholds,
          alerts,
          dateRange: {
            start: new Date(input.startTime),
            end: new Date(input.endTime),
          },
        };

        const html = generateDeviceReportHtml(reportData);
        return { html, filename: `device-report-${device.deviceId}-${Date.now()}.html` };
      }),

    analyticsReport: publicProcedure
      .input(
        z.object({
          startTime: z.number(),
          endTime: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const [deviceStats, alertStats] = await Promise.all([
          db.getDeviceStats(),
          db.getAlertStats(),
        ]);

        const devices = await db.getDevices();
        const deviceIds = devices.map((d) => d.id);
        const energyData = await db.getAggregatedReadings(
          deviceIds,
          input.startTime,
          input.endTime,
          86400000 // Daily intervals
        );

        const reportData: AnalyticsReportData = {
          overview: {
            totalDevices: deviceStats.total,
            onlineDevices: deviceStats.online,
            activeAlerts: alertStats.active,
            criticalAlerts: alertStats.critical,
          },
          oeeMetrics: {
            availability: 92.5,
            performance: 87.3,
            quality: 98.1,
            oee: 79.2,
          },
          energyData,
          dateRange: {
            start: new Date(input.startTime),
            end: new Date(input.endTime),
          },
        };

        const html = generateAnalyticsReportHtml(reportData);
        return { html, filename: `analytics-report-${Date.now()}.html` };
      }),

    alertHistoryReport: publicProcedure
      .input(
        z.object({
          startTime: z.number(),
          endTime: z.number(),
          severity: alertSeverityEnum.optional(),
        })
      )
      .mutation(async ({ input }) => {
        const alerts = await db.getAlerts({
          severity: input.severity,
          limit: 500,
        });

        // Filter by date range
        const filteredAlerts = alerts.filter((a) => {
          const alertTime = new Date(a.createdAt).getTime();
          return alertTime >= input.startTime && alertTime <= input.endTime;
        });

        // Get device names
        const devices = await db.getDevices();
        const deviceMap = new Map(devices.map((d) => [d.id, d.name]));

        const alertsWithDeviceNames = filteredAlerts.map((a) => ({
          ...a,
          deviceName: deviceMap.get(a.deviceId) ?? `Device ${a.deviceId}`,
        }));

        const summary = {
          total: filteredAlerts.length,
          critical: filteredAlerts.filter((a) => a.severity === "critical").length,
          warning: filteredAlerts.filter((a) => a.severity === "warning").length,
          info: filteredAlerts.filter((a) => a.severity === "info").length,
          resolved: filteredAlerts.filter((a) => a.status === "resolved").length,
        };

        const reportData: AlertHistoryReportData = {
          alerts: alertsWithDeviceNames,
          summary,
          dateRange: {
            start: new Date(input.startTime),
            end: new Date(input.endTime),
          },
        };

        const html = generateAlertHistoryReportHtml(reportData);
        return { html, filename: `alert-history-report-${Date.now()}.html` };
      }),
  }),

  // Notifications
  notifications: router({
    registerConfig: protectedProcedure
      .input(
        z.object({
          configId: z.string(),
          enabled: z.boolean(),
          type: z.enum([NotificationType.EMAIL, NotificationType.SMS, NotificationType.PUSH]),
          recipient: z.string(),
          severityFilter: z.array(z.enum([NotificationSeverity.INFO, NotificationSeverity.WARNING, NotificationSeverity.CRITICAL])).optional(),
          deviceFilter: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        notificationService.registerConfig(input.configId, input);
        return { success: true };
      }),

    getConfigs: publicProcedure.query(async () => {
      return notificationService.getConfigs();
    }),

    updateConfig: protectedProcedure
      .input(
        z.object({
          configId: z.string(),
          enabled: z.boolean().optional(),
          recipient: z.string().optional(),
          severityFilter: z.array(z.enum([NotificationSeverity.INFO, NotificationSeverity.WARNING, NotificationSeverity.CRITICAL])).optional(),
          deviceFilter: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { configId, ...updates } = input;
        notificationService.updateConfig(configId, updates);
        return { success: true };
      }),

    deleteConfig: protectedProcedure
      .input(z.object({ configId: z.string() }))
      .mutation(async ({ input }) => {
        notificationService.deleteConfig(input.configId);
        return { success: true };
      }),

    getQueueSize: publicProcedure.query(async () => {
      return { queueSize: notificationService.getQueueSize() };
    }),
  }),

  // Device Grouping
  groups: router({
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          type: z.enum([GroupType.ZONE, GroupType.PRODUCTION_LINE, GroupType.DEPARTMENT, GroupType.CUSTOM]),
          deviceIds: z.array(z.number()),
          description: z.string().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ input }) => {
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

    getById: publicProcedure
      .input(z.object({ groupId: z.string() }))
      .query(async ({ input }) => {
        return deviceGroupingService.getGroup(input.groupId);
      }),

    getByType: publicProcedure
      .input(z.object({ type: z.enum([GroupType.ZONE, GroupType.PRODUCTION_LINE, GroupType.DEPARTMENT, GroupType.CUSTOM]) }))
      .query(async ({ input }) => {
        return deviceGroupingService.getGroupsByType(input.type);
      }),

    getForDevice: publicProcedure
      .input(z.object({ deviceId: z.number() }))
      .query(async ({ input }) => {
        return deviceGroupingService.getGroupsForDevice(input.deviceId);
      }),

    update: protectedProcedure
      .input(
        z.object({
          groupId: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
          deviceIds: z.array(z.number()).optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { groupId, ...updates } = input;
        return deviceGroupingService.updateGroup(groupId, updates);
      }),

    delete: protectedProcedure
      .input(z.object({ groupId: z.string() }))
      .mutation(async ({ input }) => {
        const success = deviceGroupingService.deleteGroup(input.groupId);
        return { success };
      }),

    addDevices: protectedProcedure
      .input(
        z.object({
          groupId: z.string(),
          deviceIds: z.array(z.number()),
        })
      )
      .mutation(async ({ input }) => {
        return deviceGroupingService.addDevicesToGroup(input.groupId, input.deviceIds);
      }),

    removeDevices: protectedProcedure
      .input(
        z.object({
          groupId: z.string(),
          deviceIds: z.array(z.number()),
        })
      )
      .mutation(async ({ input }) => {
        return deviceGroupingService.removeDevicesFromGroup(input.groupId, input.deviceIds);
      }),

    createBatchOperation: protectedProcedure
      .input(
        z.object({
          groupId: z.string(),
          operation: z.string(),
          parameters: z.record(z.string(), z.unknown()),
        })
      )
      .mutation(async ({ input }) => {
        return deviceGroupingService.createBatchOperation(input.groupId, input.operation, input.parameters);
      }),

    getBatchOperation: publicProcedure
      .input(z.object({ operationId: z.string() }))
      .query(async ({ input }) => {
        return deviceGroupingService.getBatchOperation(input.operationId);
      }),

    getBatchOperations: publicProcedure
      .input(z.object({ groupId: z.string() }))
      .query(async ({ input }) => {
        return deviceGroupingService.getBatchOperationsForGroup(input.groupId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
