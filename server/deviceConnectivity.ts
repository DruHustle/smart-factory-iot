import type { Device } from "../drizzle/schema";

// A stored "online" value is only evidence of a past report. The local Pi
// publishes every five seconds; two minutes tolerates brief broker restarts.
export const DEVICE_OFFLINE_AFTER_MS = 120_000;

export function deviceWithCurrentStatus(device: Device, now = Date.now()): Device {
  if (device.isDemo || device.status !== "online") return device;
  const lastSeen = device.lastSeen?.getTime();
  if (lastSeen != null && lastSeen <= now && now - lastSeen <= DEVICE_OFFLINE_AFTER_MS) return device;
  return { ...device, status: "offline" };
}
