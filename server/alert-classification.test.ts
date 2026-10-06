import { describe, expect, it } from "vitest";
import { getAlertErrorCode } from "../shared/alert-codes";
import { evaluateAlertThreshold } from "../shared/alert-thresholds";

describe("alert classification and threshold rules", () => {
  it("creates readable internal codes and preserves supplied manufacturer codes", () => {
    expect(getAlertErrorCode({ type: "threshold_exceeded", metric: "temperature", severity: "critical" })).toBe("SF-THR-TEMP-CRIT");
    expect(getAlertErrorCode({ type: "device_offline", severity: "critical" })).toBe("SF-COMM-001");
    expect(getAlertErrorCode({ type: "system_error", severity: "warning", errorCode: " vendor-e17 " })).toBe("VENDOR-E17");
  });

  it("prioritizes critical limits and accepts values on configured boundaries", () => {
    const limits = { minValue: 10, maxValue: 60, warningMin: 15, warningMax: 55 };
    expect(evaluateAlertThreshold(70, limits)).toEqual({ severity: "critical", threshold: 60, direction: "above" });
    expect(evaluateAlertThreshold(58, limits)).toEqual({ severity: "warning", threshold: 55, direction: "above" });
    // The configured maximum is inclusive; at the exact max, the warning
    // band still applies because the reading is above its warning boundary.
    expect(evaluateAlertThreshold(60, limits)).toEqual({ severity: "warning", threshold: 55, direction: "above" });
    expect(evaluateAlertThreshold(undefined, limits)).toBeUndefined();
  });
});
