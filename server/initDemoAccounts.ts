/**
 * Initialize Demo Accounts
 * 
 * This script creates demo accounts in the database for testing purposes.
 * Run this after database setup to enable demo account login.
 */

import { getDb, createUser, getUserByEmail } from "./db";
import { sdk } from "./_core/sdk";
import { DEMO_ACCOUNTS } from "../shared/demo-accounts";

export async function initializeDemoAccounts() {
  const db = await getDb();
  if (!db) {
    console.warn("[Demo Accounts] Database not available, skipping initialization");
    return;
  }

  console.log("[Demo Accounts] Initializing demo accounts...");

  for (let index = 0; index < DEMO_ACCOUNTS.length; index++) {
    const account = DEMO_ACCOUNTS[index];
    try {
      // Check if user already exists
      const existing = await getUserByEmail(account.email);
      if (existing) {
        console.log(`[Demo Accounts] Account already exists: ${account.email}`);
        continue;
      }

      // Hash password
      const hashedPassword = await sdk.hashPassword(account.password);

      // Create user
      await createUser({
        email: account.email,
        password: hashedPassword,
        name: account.label,
        openId: `demo-${index}`,
        role: "user",
      });

      console.log(`[Demo Accounts] Created account: ${account.email}`);
    } catch (error) {
      console.error(`[Demo Accounts] Failed to create account ${account.email}:`, error);
    }
  }

  console.log("[Demo Accounts] Initialization complete");
}

// Run if called directly
if (require.main === module) {
  initializeDemoAccounts()
    .then(() => {
      console.log("[Demo Accounts] Done");
      process.exit(0);
    })
    .catch((error) => {
      console.error("[Demo Accounts] Error:", error);
      process.exit(1);
    });
}
