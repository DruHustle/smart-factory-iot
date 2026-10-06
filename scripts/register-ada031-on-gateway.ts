import "dotenv/config";
import * as db from "../server/db";
import { provisionAas, publishEdgeConfiguration, removeProvisionedAas } from "../server/aasProvisioningClient";

const assetIdentity = {
  assetId: "urn:smart-factory:asset:ada031-v4-arm-01",
  name: "Adeept ADA031 V4 Robotic Arm",
  assetType: "robotic_arm",
  manufacturer: "Shenzhen Adeept Technology Co., Ltd.",
  model: "New Robotic Arm Kit for Arduino - V4.0",
  manufacturerStreet: "Rm. 8305, Building A, No. 2043-2, Bixin Road, Nanlian Community, Longgang Street, Longgang District",
  manufacturerZipcode: "518000",
  manufacturerCityTown: "Shenzhen",
  manufacturerNationalCode: "CN",
  manufacturerArticleNumber: "ADA031-V4.0",
  orderCodeOfManufacturer: "ADA031-V4.0",
  location: "ABB - Mannheim",
  zone: "Interview Demo",
};

const gatewayDeviceId = "pi-edge-01";
const serialDevicePath = process.env.ADA031_SERIAL_DEVICE_PATH?.trim();
if (!serialDevicePath || !serialDevicePath.startsWith("/dev/serial/by-id/")) {
  throw new Error("Set ADA031_SERIAL_DEVICE_PATH to the arm's exact /dev/serial/by-id/... path from the Raspberry Pi");
}
const serialEndpoint = `serial://${serialDevicePath}?baudrate=9600`;

async function main() {
  const existing = (await db.getAssets()).find((asset) => asset.assetId === assetIdentity.assetId);
  if (existing) {
    const connections = await db.getAssetConnections(existing.id);
    console.log(JSON.stringify({ status: "already_registered", asset: existing, connections }));
    return;
  }

  const gateway = (await db.getDevices({ type: "gateway" })).find((device) => device.deviceId === gatewayDeviceId && !device.isDemo);
  if (!gateway) throw new Error(`Live gateway ${gatewayDeviceId} was not found`);
  const administrator = await db.getUserByEmail("admin@dev.local");
  const { documents, remote } = await provisionAas(assetIdentity);
  try {
    const created = await db.createAsset({
      ...assetIdentity,
      lifecycleStage: "commissioned",
      isDemo: false,
      aasShell: documents.shell,
      aasSubmodels: documents.submodels,
    }, {
      mode: "gateway",
      deviceId: gateway.id,
      protocol: "ada031_v4_serial",
      endpoint: serialEndpoint,
      tagMappings: [],
    }, administrator?.id ?? 0);

    const configuration = { schemaVersion: 1 as const, gatewayDeviceId, assets: await db.getGatewayAssetConnections(gatewayDeviceId) };
    let edgeSync: "published" | "pending" = "pending";
    try {
      const result = await publishEdgeConfiguration(configuration);
      if (result.published) edgeSync = "published";
    } catch (error) {
      console.warn(`Edge profile publication is pending: ${error instanceof Error ? error.message : "unknown error"}`);
    }
    console.log(JSON.stringify({ status: "registered", asset: { id: created.id, assetId: created.assetId, name: created.name }, gateway: gatewayDeviceId, protocol: "ada031_v4_serial", endpoint: serialEndpoint, aasProvisioned: remote, edgeSync }));
  } catch (error) {
    if (remote) await removeProvisionedAas(assetIdentity).catch(() => undefined);
    throw error;
  }
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
