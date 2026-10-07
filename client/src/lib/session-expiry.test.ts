import { describe, expect, it } from "vitest";
import { isUnauthorizedError } from "./session-expiry";

describe("session expiry detection", () => {
  it("recognizes tRPC authorization failures", () => {
    expect(isUnauthorizedError({ data: { code: "UNAUTHORIZED", httpStatus: 401 } })).toBe(true);
    expect(isUnauthorizedError({ data: { httpStatus: 401 } })).toBe(true);
  });

  it("does not end the session for unrelated request failures", () => {
    expect(isUnauthorizedError({ data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 } })).toBe(false);
    expect(isUnauthorizedError(new Error("network unavailable"))).toBe(false);
  });
});
