/** Build the stable parent-gateway/device identifier shown in connectivity views. */
export function getConnectivityRecordId(device: {
  deviceId: string;
  metadata?: Record<string, unknown> | null;
}) {
  const gatewayId = device.metadata?.gatewayId;
  if (typeof gatewayId === "string" && gatewayId && gatewayId !== device.deviceId) {
    return `${gatewayId}-${device.deviceId}`;
  }
  return device.deviceId;
}
