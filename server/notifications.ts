import { and, desc, eq, inArray } from "drizzle-orm";
import { notificationInbox } from "../drizzle/schema";
import { getDb } from "./db";

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Notification database unavailable");
  return db;
}
export async function listNotifications(userId: number) {
  return (await database()).select().from(notificationInbox)
    .where(eq(notificationInbox.userId, userId)).orderBy(desc(notificationInbox.id)).limit(100);
}
export async function readNotification(userId: number, id: number) {
  const [row] = await (await database()).update(notificationInbox).set({ readAt: new Date() })
    .where(and(eq(notificationInbox.userId, userId), eq(notificationInbox.id, id))).returning({ id: notificationInbox.id });
  return row;
}
export async function retryNotification(userId: number, id: number) {
  const [row] = await (await database()).update(notificationInbox)
    .set({ emailStatus: "pending", attempts: 0, nextAttemptAt: new Date(), lastError: null })
    .where(and(eq(notificationInbox.userId, userId), eq(notificationInbox.id, id),
      inArray(notificationInbox.emailStatus, ["failed", "no_recipient", "unconfigured"])))
    .returning({ id: notificationInbox.id });
  return row;
}
export function notificationConfiguration() {
  return [{ provider: "Resend", inboxEnabled: true,
    emailConfigured: ["RESEND_API_KEY", "RESEND_FROM", "RESEND_ALLOWED_RECIPIENT_DOMAINS"].every(key => Boolean(process.env[key])),
    workerEnabled: ["render-bundle", "compose", "local"].includes(process.env.BACKEND_DEPLOYMENT_MODE ?? "") }];
}
