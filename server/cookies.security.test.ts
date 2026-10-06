import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { getSessionCookieOptions } from "./_core/cookies";

afterEach(() => vi.unstubAllEnvs());
describe("session cookie transport policy", () => {
  it("keeps production cookies secure on a private HTTP proxy hop", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getSessionCookieOptions({ protocol: "http", headers: {} } as Request)).toMatchObject({ httpOnly: true, secure: true, sameSite: "none" });
  });
  it("ignores a forged forwarded protocol outside the Express trust boundary", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getSessionCookieOptions({ protocol: "http", headers: { "x-forwarded-proto": "https" } } as Request)).toMatchObject({ secure: false, sameSite: "lax" });
    expect(getSessionCookieOptions({ protocol: "https", headers: {} } as Request).secure).toBe(true);
  });
});
