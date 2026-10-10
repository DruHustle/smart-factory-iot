import { describe, expect, it } from "vitest";
import { resolveApiBase } from "../client/src/lib/api-base";

describe("browser API routing", () => {
  it("uses the production proxy even when provider configuration is malformed or points elsewhere", () => {
    for (const value of [undefined, "/api", "=/api", "https://backend.example/api"]) {
      expect(resolveApiBase(value, true)).toBe("/api");
    }
  });
  it("supports explicit development servers and rejects malformed bases", () => {
    expect(resolveApiBase(" http://localhost:3100/api/ ", false)).toBe("http://localhost:3100/api");
    for (const value of ["=/api", "javascript:alert(1)", "https://user:password@example.com/api"]) {
      expect(resolveApiBase(value, false)).toBe("/api");
    }
  });
});
