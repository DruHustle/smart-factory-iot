/**
 * Initialize Demo Accounts
 * 
 * This script creates demo accounts in the database for testing purposes.
 * Run this after database setup to enable demo account login.
 */

import { getDb, createUser, getUserByEmail, updateDemoAccount } from "./db";
import { sdk } from "./_core/sdk";
import { DEMO_ACCOUNTS, demoAccountsEnabled } from "../shared/demo-accounts";

export async function initializeDemoAccounts() {
  if (!demoAccountsEnabled()) {
    console.warn("[Demo Accounts] Disabled outside explicitly enabled non-production environments");
    return;
  }
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
      const hashedPassword = await sdk.hashPassword(account.password);
      if (existing) {
        await updateDemoAccount(existing.id, hashedPassword, account.role);
        console.log(`[Demo Accounts] Refreshed reserved development account: ${account.email}`);
        continue;
      }

      // Create user
      await createUser({
        email: account.email,
        password: hashedPassword,
        name: account.label,
        openId: `demo-${index}`,
        role: account.role,
      });

      console.log(`[Demo Accounts] Created account: ${account.email}`);
    } catch (error) {
      console.error(`[Demo Accounts] Failed to create account ${account.email}:`, error);
    }
  }

  console.log("[Demo Accounts] Initialization complete");
}
