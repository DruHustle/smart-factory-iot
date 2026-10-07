import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alerts, assets, devices, notificationInbox } from "../drizzle/schema";
import { getDb } from "./db";
import { demoDataEnabled } from "./demoData";

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Notification database unavailable");
  return db;
}

function visibleNotificationSourceCondition() {
  const visibleDevice = demoDataEnabled()
    ? eq(devices.id, alerts.deviceId)
    : and(eq(devices.id, alerts.deviceId), eq(devices.isDemo, false));
  const visibleAsset = demoDataEnabled()
    ? eq(assets.assetId, alerts.assetId)
    : and(eq(assets.assetId, alerts.assetId), eq(assets.isDemo, false));
  return sql`exists (
    select 1 from ${alerts}
    where ${alerts.id} = ${notificationInbox.alertId}
      and exists (select 1 from ${devices} where ${visibleDevice})
      and (${alerts.assetId} is null or exists (select 1 from ${assets} where ${visibleAsset}))
  )`;
}

export async function listNotifications(userId: number) {
  return (await database()).select().from(notificationInbox)
    .where(and(eq(notificationInbox.userId, userId), visibleNotificationSourceCondition()))
    .orderBy(desc(notificationInbox.id)).limit(100);
}
export async function readNotification(userId: number, id: number) {
  const [row] = await (await database()).update(notificationInbox).set({ readAt: new Date() })
    .where(and(eq(notificationInbox.userId, userId), eq(notificationInbox.id, id), visibleNotificationSourceCondition()))
    .returning({ id: notificationInbox.id });
  return row;
}
export async function retryNotification(userId: number, id: number) {
  const [row] = await (await database()).update(notificationInbox)
    .set({ emailStatus: "pending", attempts: 0, nextAttemptAt: new Date(), lastError: null })
    .where(and(eq(notificationInbox.userId, userId), eq(notificationInbox.id, id),
      visibleNotificationSourceCondition(),
      inArray(notificationInbox.emailStatus, ["failed", "no_recipient", "unconfigured"])))
    .returning({ id: notificationInbox.id });
  return row;
}
export function notificationConfiguration() {
  return [{ provider: "Resend", inboxEnabled: true,
    emailConfigured: ["RESEND_API_KEY", "RESEND_FROM", "RESEND_ALLOWED_RECIPIENT_DOMAINS"].every(key => Boolean(process.env[key])),
    workerEnabled: ["render-bundle", "compose", "local"].includes(process.env.BACKEND_DEPLOYMENT_MODE ?? "") }];
}
