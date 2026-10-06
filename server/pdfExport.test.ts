import { describe, expect, it } from "vitest";
import { generateDeviceReportHtml } from "./pdfExport";

describe("downloaded device report", () => {
  it("escapes stored asset and incident content in text and class attributes", () => {
    const malicious = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
    const html = generateDeviceReportHtml({
      device: { id: 1, deviceId: malicious, name: malicious, type: malicious, status: malicious, zone: malicious, location: malicious, firmwareVersion: malicious, lastSeen: null },
      readings: [], thresholds: [{ metric: malicious, minValue: null, maxValue: null, warningMin: null, warningMax: null, enabled: true }],
      alerts: [{ id: 1, message: malicious, severity: malicious, status: malicious, createdAt: new Date() }],
      dateRange: { start: new Date(), end: new Date() },
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
});
