import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role?: User["role"]): TrpcContext {
  const user = role
    ? ({
        id: 4,
        openId: `test-${role}`,
        email: `${role}@example.test`,
        name: `Test ${role}`,
        loginMethod: "password",
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } satisfies User)
    : null;

  return {
    user,
    req: { protocol: "http", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("role based access control", () => {
  it("requires a signed-in account before reading devices", async () => {
    const caller = appRouter.createCaller(contextFor());
    await expect(caller.devices.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.assistant.ask({ question: "How do I import an AASX package?" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("allows viewers to use the documentation assistant", async () => {
    const caller = appRouter.createCaller(contextFor("viewer"));
    const result = await caller.assistant.ask({ question: "How do I import an AASX package?" });
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it("lets viewers read the asset catalog but prevents shell and lifecycle access", async () => {
    const caller = appRouter.createCaller(contextFor("viewer"));
    await expect(caller.assets.getShell({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.assets.exportAas({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.assets.getLifecycle({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("limits operational mutations to operators and above", async () => {
    const caller = appRouter.createCaller(contextFor("viewer"));
    await expect(
      caller.alerts.updateStatus({ id: 1, status: "acknowledged" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.readings.create({ deviceId: 1, temperature: 42, timestamp: Date.now() }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const operator = appRouter.createCaller(contextFor("operator"));
    await expect(operator.alerts.resolve({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("limits engineering procedures to engineers and admins", async () => {
    const operator = appRouter.createCaller(contextFor("operator"));
    const engineer = appRouter.createCaller(contextFor("engineer"));
    await expect(operator.thresholds.getForDevice({ deviceId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(operator.assets.create({
      assetId: "asset-test",
      name: "Test asset",
      assetType: "compressor",
      manufacturer: "Test manufacturer",
      model: "Test model",
      manufacturerArticleNumber: "TEST-ART-001",
      orderCodeOfManufacturer: "TEST-001",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(engineer.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(engineer.assets.delete({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(engineer.devices.delete({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(operator.assets.controlAda031({ id: 1, command: { action: "jog", joint: "base", direction: "increase" } }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reserves user and notification administration for admins", async () => {
    const engineer = appRouter.createCaller(contextFor("engineer"));
    await expect(engineer.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(engineer.notifications.getConfigs()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(engineer.system.setDemoData({ enabled: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(engineer.users.create({ email: "unauthorized@example.com", name: "Blocked", password: "Blocked-password-123!", role: "admin" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
