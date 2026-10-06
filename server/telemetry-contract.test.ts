import { describe, expect, it } from "vitest";
import { edgeTelemetrySchema } from "./telemetrySchema";

describe("edge telemetry wire contract", () => {
  it("normalizes the .NET bridge's nullable assetSignals field", () => {
    const parsed = edgeTelemetrySchema.parse({
      deviceId: "esp32-wrover-01",
      gatewayId: "pi-edge-01",
      assetId: null,
      sensorType: "DHT11",
      sensorStatus: "ok",
      assetSignals: null,
      timestamp: 1_791_222_498_582,
      temperature: 25.7,
      humidity: 35,
      vibration: null,
      power: null,
      pressure: null,
      rpm: null,
    });

    expect(parsed.assetSignals).toBeUndefined();
    expect(parsed.sensorType).toBe("DHT11");
    expect(parsed.sensorStatus).toBe("ok");
  });

  it("rejects impossible relative-humidity values", () => {
    const sample = {
      deviceId: "esp32-wrover-01",
      gatewayId: "pi-edge-01",
      timestamp: 1_791_222_498_582,
      temperature: 25.7,
    };

    expect(edgeTelemetrySchema.safeParse({ ...sample, humidity: -0.1 }).success).toBe(false);
    expect(edgeTelemetrySchema.safeParse({ ...sample, humidity: 100.1 }).success).toBe(false);
    expect(edgeTelemetrySchema.safeParse({ ...sample, humidity: 0 }).success).toBe(true);
    expect(edgeTelemetrySchema.safeParse({ ...sample, humidity: 100 }).success).toBe(true);
  });

  it("rejects unknown sensor health states and control characters", () => {
    const sample = { deviceId: "esp32-wrover-01", timestamp: 1_791_222_498_582 };
    expect(edgeTelemetrySchema.safeParse({ ...sample, sensorStatus: "healthy" }).success).toBe(false);
    expect(edgeTelemetrySchema.safeParse({ ...sample, sensorType: "DHT11\nspoofed" }).success).toBe(false);
  });

  it("requires internally consistent DHT11 health and measurement fields", () => {
    const sample = { deviceId: "esp32-wrover-01", sensorType: "DHT11", timestamp: 1_791_222_498_582 };

    expect(edgeTelemetrySchema.safeParse({ ...sample, temperature: 25, humidity: 40 }).success).toBe(false);
    expect(edgeTelemetrySchema.safeParse({ ...sample, sensorStatus: "ok", temperature: 25 }).success).toBe(false);
    expect(edgeTelemetrySchema.safeParse({ ...sample, sensorStatus: "read_error", temperature: 25, humidity: 40 }).success).toBe(false);
    expect(edgeTelemetrySchema.safeParse({ ...sample, sensorStatus: "ok", temperature: 25, humidity: 40 }).success).toBe(true);
    expect(edgeTelemetrySchema.safeParse({ ...sample, sensorStatus: "read_error", temperature: null, humidity: null }).success).toBe(true);
  });

  it("accepts the full Arduino uint32 counter range", () => {
    const sample = { deviceId: "ada031-v4-arm-01", timestamp: 1_791_222_498_582 };
    expect(edgeTelemetrySchema.safeParse({ ...sample, assetSignals: { uptime_ms: 4_294_967_295 } }).success).toBe(true);
    expect(edgeTelemetrySchema.safeParse({ ...sample, assetSignals: { uptime_ms: 4_294_967_296 } }).success).toBe(false);
  });
});
