import { describe, expect, it, vi } from "vitest";
import { demoAccountsEnabled, DEMO_ACCOUNTS } from "../shared/demo-accounts";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { sdk } from "./_core/sdk";
import * as db from "./db";

describe("demo accounts", () => {
  it("is enabled only by the explicit flag in every environment", () => {
    expect(demoAccountsEnabled({ NODE_ENV: "development", ENABLE_DEMO_ACCOUNTS: "true" })).toBe(true);
    expect(demoAccountsEnabled({ NODE_ENV: "test", ENABLE_DEMO_ACCOUNTS: "true" })).toBe(true);
    expect(demoAccountsEnabled({ NODE_ENV: "development", ENABLE_DEMO_ACCOUNTS: "false" })).toBe(false);
    expect(demoAccountsEnabled({ NODE_ENV: "production", ENABLE_DEMO_ACCOUNTS: "true" })).toBe(true);
  });

  it("provides the four requested demo roles in order", () => {
    expect(DEMO_ACCOUNTS.map(({ label, role }) => [label, role])).toEqual([
      ["Demo Admin", "admin"],
      ["Demo Operator", "operator"],
      ["Demo Engineer", "engineer"],
      ["Demo Viewer", "viewer"],
    ]);
  });

  it("exposes seeded demo login details through the API only when enabled", async () => {
    const previous = process.env.ENABLE_DEMO_ACCOUNTS;
    process.env.ENABLE_DEMO_ACCOUNTS = "true";
    try {
      const context = { user: null, req: { headers: {} }, res: {} } as TrpcContext;
      const accounts = await appRouter.createCaller(context).auth.demoAccounts();
      expect(accounts.map(({ role }) => role)).toEqual(["admin", "operator", "engineer", "viewer"]);
    } finally {
      if (previous === undefined) delete process.env.ENABLE_DEMO_ACCOUNTS;
      else process.env.ENABLE_DEMO_ACCOUNTS = previous;
    }
  });

  it("returns no demo login shortcuts when the environment flag is false", async () => {
    const previousFlag = process.env.ENABLE_DEMO_ACCOUNTS;
    const previousEnvironment = process.env.NODE_ENV;
    process.env.ENABLE_DEMO_ACCOUNTS = "false";
    process.env.NODE_ENV = "development";
    try {
      const context = { user: null, req: { headers: {} }, res: {} } as TrpcContext;
      await expect(appRouter.createCaller(context).auth.demoAccounts()).resolves.toEqual([]);
    } finally {
      if (previousFlag === undefined) delete process.env.ENABLE_DEMO_ACCOUNTS;
      else process.env.ENABLE_DEMO_ACCOUNTS = previousFlag;
      if (previousEnvironment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousEnvironment;
    }
  });

  it("rejects previously seeded demo accounts when the flag is disabled", async () => {
    const previousFlag = process.env.ENABLE_DEMO_ACCOUNTS;
    const previousEnvironment = process.env.NODE_ENV;
    process.env.ENABLE_DEMO_ACCOUNTS = "false";
    process.env.NODE_ENV = "development";
    const lookup = vi.spyOn(db, "getUserByEmail").mockResolvedValue({
      id: 1, openId: "old-demo", email: "admin@dev.local", password: "existing-hash", name: "Old Demo", role: "admin",
      loginMethod: "password", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    });
    const compare = vi.spyOn(sdk, "comparePassword").mockResolvedValue(true);
    try {
      const context = { user: null, req: { headers: {} }, res: { cookie: vi.fn() } } as unknown as TrpcContext;
      await expect(appRouter.createCaller(context).auth.login({ email: "admin@dev.local", password: "@agqJmbpaPtJ#5SM1#vJ" }))
        .rejects.toThrow("Invalid email or password");
      expect(lookup).toHaveBeenCalledOnce();
      expect(compare).not.toHaveBeenCalled();
    } finally {
      lookup.mockRestore();
      compare.mockRestore();
      if (previousFlag === undefined) delete process.env.ENABLE_DEMO_ACCOUNTS;
      else process.env.ENABLE_DEMO_ACCOUNTS = previousFlag;
      if (previousEnvironment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousEnvironment;
    }
  });
});
