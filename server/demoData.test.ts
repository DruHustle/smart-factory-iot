import { afterEach, describe, expect, it } from "vitest";
import { demoDataEnabled, setRuntimeDemoDataEnabled, visibleWhenDemoDataEnabled } from "./demoData";

afterEach(() => setRuntimeDemoDataEnabled(undefined));

describe("demo data visibility", () => {
  it("is disabled unless explicitly enabled", () => {
    expect(demoDataEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(demoDataEnabled({ ENABLE_DEMO_DATA: "false" } as NodeJS.ProcessEnv)).toBe(false);
    expect(demoDataEnabled({ ENABLE_DEMO_DATA: "true" } as NodeJS.ProcessEnv)).toBe(true);
  });

  it("uses the persisted runtime override ahead of the deployment default", () => {
    setRuntimeDemoDataEnabled(true);
    expect(demoDataEnabled({ ENABLE_DEMO_DATA: "false" } as NodeJS.ProcessEnv)).toBe(true);
    setRuntimeDemoDataEnabled(false);
    expect(demoDataEnabled({ ENABLE_DEMO_DATA: "true" } as NodeJS.ProcessEnv)).toBe(false);
  });

  it("always retains live records and hides simulated records when disabled", () => {
    const disabled = { ENABLE_DEMO_DATA: "false" } as NodeJS.ProcessEnv;
    expect(visibleWhenDemoDataEnabled({ isDemo: false }, disabled)).toBe(true);
    expect(visibleWhenDemoDataEnabled({ isDemo: true }, disabled)).toBe(false);
    expect(visibleWhenDemoDataEnabled({ isDemo: true }, { ENABLE_DEMO_DATA: "true" } as NodeJS.ProcessEnv)).toBe(true);
  });
});
