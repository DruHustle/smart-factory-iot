import { describe, expect, it } from "vitest";
import { userFacingApiError } from "../client/src/lib/errors";

describe("userFacingApiError", () => {
  const fallback = "The application service is temporarily unavailable. Check your connection and try again.";

  it("hides non-JSON proxy and transport parser errors", () => {
    expect(userFacingApiError(new Error(`Unexpected token 'A', "An error o"... is not valid JSON`), fallback)).toBe(fallback);
    expect(userFacingApiError(new Error("Failed to fetch"), fallback)).toBe(fallback);
    expect(userFacingApiError(new Error("503 Service Unavailable"), fallback)).toBe(fallback);
  });

  it("keeps short actionable application errors", () => {
    expect(userFacingApiError(new Error("You are not authorized to view these assets"), fallback))
      .toBe("You are not authorized to view these assets");
  });
});
