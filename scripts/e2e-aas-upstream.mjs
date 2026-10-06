import { createServer } from "node:http";


function aasDocuments(asset) {
  const submodelId = `${asset.assetId}/submodels/Nameplate`;
  const text = (language, value) => [{ language, text: value }];
  const semantic = (value) => ({ type: "ExternalReference", keys: [{ type: "GlobalReference", value }] });
  const shell = {
    modelType: "AssetAdministrationShell",
    id: asset.assetId,
    idShort: asset.name.replace(/[^a-zA-Z0-9]/g, "") || "Asset",
    assetInformation: { assetKind: "Instance", globalAssetId: asset.assetId },
    submodels: [{ type: "ModelReference", keys: [{ type: "Submodel", value: submodelId }] }],
  };
  const submodels = [{
    modelType: "Submodel",
    id: submodelId,
    idShort: "Nameplate",
    kind: "Instance",
    semanticId: semantic("https://admin-shell.io/idta/nameplate/3/0/Nameplate"),
    administration: { version: "3", revision: "0", templateId: "https://admin-shell.io/idta-02006-3-0" },
    submodelElements: [
      { modelType: "MultiLanguageProperty", idShort: "ManufacturerName", value: text("en", asset.manufacturer) },
      { modelType: "MultiLanguageProperty", idShort: "ManufacturerProductDesignation", value: text("en", asset.model) },
      { modelType: "SubmodelElementCollection", idShort: "AddressInformation", value: [
        { modelType: "MultiLanguageProperty", idShort: "Street", value: text("en", asset.manufacturerStreet) },
        { modelType: "MultiLanguageProperty", idShort: "Zipcode", value: text("en", asset.manufacturerZipcode) },
        { modelType: "MultiLanguageProperty", idShort: "CityTown", value: text("en", asset.manufacturerCityTown) },
        { modelType: "MultiLanguageProperty", idShort: "NationalCode", value: text("en", asset.manufacturerNationalCode) },
      ] },
      { modelType: "Property", idShort: "OrderCodeOfManufacturer", valueType: "xs:string", value: asset.orderCodeOfManufacturer },
    ],
  }];
  return { shell, submodels, repositoryRegistered: true, registryRegistered: true };
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "text/plain" }).end("ready");
    return;
  }

  if (request.method === "POST" && request.url === "/token") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const fields = new URLSearchParams(body);
    if (fields.get("client_id") !== "local-e2e-client" || fields.get("client_secret") !== "local-e2e-client-secret") {
      response.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ error: "invalid_client" }));
      return;
    }
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" })
      .end(JSON.stringify({ access_token: "local-e2e-aas-service-token", expires_in: 300, token_type: "Bearer" }));
    return;
  }

  if (["/api/assets", "/api/assets/"].includes(request.url ?? "") && ["POST", "PUT", "DELETE"].includes(request.method ?? "")) {
    if (request.headers["x-aas-provisioning-token"] !== "local-e2e-provisioning-secret-at-least-32-bytes") {
      response.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    let body = "";
    for await (const chunk of request) body += chunk;
    if (request.method === "DELETE") {
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ deleted: true }));
      return;
    }
    const asset = JSON.parse(body);
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(aasDocuments(asset)));
    return;
  }

  if (["/api/assets/import", "/api/assets/sync"].includes(request.url ?? "") && ["POST", "DELETE"].includes(request.method ?? "")) {
    if (request.headers["x-aas-provisioning-token"] !== "local-e2e-provisioning-secret-at-least-32-bytes") {
      response.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    if (request.url === "/api/assets/sync") {
      for await (const _chunk of request) { /* Consume the private configuration request. */ }
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ published: true }));
      return;
    }
    if (request.method === "DELETE") {
      for await (const _chunk of request) { /* Consume the compensating cleanup receipt. */ }
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ rolledBack: true }));
      return;
    }
    let packageBytes = 0;
    for await (const chunk of request) packageBytes += chunk.length;
    if (packageBytes === 0 || !request.headers["content-type"]?.startsWith("multipart/form-data;")) {
      response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: "expected AASX multipart" }));
      return;
    }
    // A fixed shell id lets E2E verify duplicate imports are rejected without
    // replacing the first vendor model.
    const assetId = "urn:e2e:aasx:vendor-pump-01";
    const submodelId = `${assetId}/submodels/Nameplate`;
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({
      packageId: "e2e-package-vendor-pump-01",
      assetAdministrationShells: [{ modelType: "AssetAdministrationShell", id: assetId, idShort: "Vendor Pump 1", assetInformation: { assetKind: "Instance", globalAssetId: assetId, specificAssetIds: [{ name: "assetType", value: "pump" }] }, submodels: [{ type: "ModelReference", keys: [{ type: "Submodel", value: submodelId }] }] }],
      submodels: [{ modelType: "Submodel", id: submodelId, idShort: "Nameplate", kind: "Instance", submodelElements: [] }],
      conceptDescriptions: [{ modelType: "ConceptDescription", id: "urn:e2e:concept:pump" }],
    }));
    return;
  }

  // Safe DeviceService stand-in for browser control tests. It validates the
  // short-lived engineer bearer path and acknowledges publication only; no
  // serial device, MQTT broker, Pi, or physical arm is reachable here.
  if (request.method === "POST" && request.url === "/api/assets/control") {
    if (!request.headers.authorization?.startsWith("Bearer ")) {
      response.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    let body = "";
    for await (const chunk of request) body += chunk;
    const command = JSON.parse(body);
    const supportedActions = new Set(["jog", "set_profile", "neutral", "stop_program"]);
    if (command.schemaVersion !== 2 || !supportedActions.has(command.action) || typeof command.commandId !== "string") {
      response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: "invalid_command" }));
      return;
    }
    response.writeHead(202, { "content-type": "application/json" }).end(JSON.stringify({ published: true }));
    return;
  }

  if (request.headers.authorization !== "Bearer local-e2e-aas-service-token") {
    response.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  if (request.method === "GET" && request.url === "/aas/description") {
    response.writeHead(200, { "content-type": "application/json", "aas-api-version": "3.2" })
      .end(JSON.stringify({ profiles: ["https://admin-shell.io/aas/API/3/2/AssetAdministrationShellRepositoryServiceSpecification/SSP-001"] }));
    return;
  }

  if (request.method === "GET" && request.url?.startsWith("/aas/shells")) {
    response.writeHead(200, { "content-type": "application/json", "aas-api-version": "3.2" })
      .end(JSON.stringify({ result: [], paging_metadata: {} }));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ error: "not_found" }));
});

server.listen(18443, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
