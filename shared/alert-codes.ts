import type { InsertAlert } from "../drizzle/schema";

const metricCodes: Record<string, string> = {
  temperature: "TEMP",
  humidity: "HUM",
  vibration: "VIB",
  power: "POWER",
  pressure: "PRESS",
  rpm: "RPM",
};

/**
 * Build a stable platform classification when a vendor/controller code was not
 * supplied. These are Smart Factory codes, not manufacturer fault identifiers.
 */
export function getAlertErrorCode(alert: Pick<InsertAlert, "type" | "metric" | "severity" | "errorCode">) {
  if (alert.errorCode?.trim()) return alert.errorCode.trim().toUpperCase().slice(0, 64);
  if (alert.type === "threshold_exceeded") {
    const metric = metricCodes[alert.metric?.toLowerCase() ?? ""] ?? "OTHER";
    const severity = alert.severity === "critical" ? "CRIT" : alert.severity === "warning" ? "WARN" : "INFO";
    return `SF-THR-${metric}-${severity}`;
  }

  const codes: Record<InsertAlert["type"], string> = {
    threshold_exceeded: "SF-THR-OTHER-INFO",
    device_offline: "SF-COMM-001",
    firmware_update: "SF-FW-001",
    maintenance_required: "SF-MAINT-001",
    system_error: "SF-SYS-001",
  };
  return codes[alert.type];
}
