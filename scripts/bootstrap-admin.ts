import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb, closeDatabase } from "../server/db";
import { sdk } from "../server/_core/sdk";

// Run only as an audited private deployment task with temporary environment secrets.
const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320 || !password || password.length < 12 || Buffer.byteLength(password) > 72) {
  throw new Error("Set BOOTSTRAP_ADMIN_EMAIL and a 12–72-byte BOOTSTRAP_ADMIN_PASSWORD in the private task environment");
}
try {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const hash = await sdk.hashPassword(password);
  const id = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(20261006)`);
    if ((await tx.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1)).length) throw new Error("An administrator already exists. Use User access to manage accounts.");
    const existing = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) {
      // An existing account keeps its password; this task explicitly promotes it.
      await tx.update(users).set({ role: "admin", updatedAt: new Date() }).where(eq(users.id, existing[0].id));
      return existing[0].id;
    }
    const [created] = await tx.insert(users).values({ email, name: process.env.BOOTSTRAP_ADMIN_NAME || "Factory administrator", password: hash, openId: randomUUID(), role: "admin" }).returning({ id: users.id });
    return created.id;
  });
  console.log(`Administrator account ready (ID ${id}). Remove the temporary bootstrap secrets.`);
} finally { await closeDatabase(); }
