import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDatabase, getDb } from "../server/db";

try {
  const database = await getDb();
  if (!database) throw new Error("Database unavailable for migration");
  await migrate(database, { migrationsFolder: "./drizzle" });
} finally {
  await closeDatabase();
}
