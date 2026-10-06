type Limits = {
  minValue: number | null;
  maxValue: number | null;
  warningMin: number | null;
  warningMax: number | null;
};

export function evaluateAlertThreshold(value: number | null | undefined, limits: Limits) {
  if (value === null || value === undefined || !Number.isFinite(value)) return undefined;

  if (limits.minValue !== null && value < limits.minValue) return { severity: "critical" as const, threshold: limits.minValue, direction: "below" as const };
  if (limits.maxValue !== null && value > limits.maxValue) return { severity: "critical" as const, threshold: limits.maxValue, direction: "above" as const };
  if (limits.warningMin !== null && value < limits.warningMin) return { severity: "warning" as const, threshold: limits.warningMin, direction: "below" as const };
  if (limits.warningMax !== null && value > limits.warningMax) return { severity: "warning" as const, threshold: limits.warningMax, direction: "above" as const };
  return undefined;
}
