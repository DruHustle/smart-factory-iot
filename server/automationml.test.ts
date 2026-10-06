import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildAutomationMlPlantLayout } from "./automationml";

describe("AutomationML CAEX export", () => {
  it("exports database asset identity under a stable zone and location hierarchy", () => {
    const asset = {
      assetId: "urn:factory:compressor:1",
      name: "Main <Compressor>",
      assetType: "compressor",
      manufacturer: "ACME & Sons",
      model: "C-42",
      serialNumber: "S-001",
      zone: "Utilities",
      location: "Room 4",
      lifecycleStage: "operational",
      aasVersion: 3,
    } as const;

    const first = buildAutomationMlPlantLayout([asset]);
    const second = buildAutomationMlPlantLayout([asset]);

    expect(first.match(/ID="ie_[a-f0-9]+"/)?.[0]).toBe(second.match(/ID="ie_[a-f0-9]+"/)?.[0]);
    expect(first).toContain('xmlns="http://www.dke.de/CAEX"');
    expect(first).toContain('SchemaVersion="3.0"');
    expect(first).toContain('Name="Utilities"');
    expect(first).toContain('Name="Room 4"');
    expect(first).toContain("Main &lt;Compressor&gt;");
    expect(first).toContain("ACME &amp; Sons");
    expect(first).toContain("urn:factory:compressor:1");
    expect(first).toContain("AASVersion");
    expect(first).toContain("SourceDocumentInformation");
  });

  it("exports an empty hierarchy when the API has no assets", () => {
    expect(buildAutomationMlPlantLayout([])).toContain('<InstanceHierarchy Name="Smart Factory"></InstanceHierarchy>');
  });

  const hasXmlLint = spawnSync("xmllint", ["--version"], { encoding: "utf8" }).status === 0;
  it.skipIf(!hasXmlLint)("validates generated CAEX 3.0 against the published schema", () => {
    const xml = buildAutomationMlPlantLayout([{ assetId: "urn:example:compressor:01", name: "Compressor 01", assetType: "compressor", zone: "Line 1", location: "Utility Room", lifecycleStage: "commissioned", aasVersion: 2 }]);
    const schema = fileURLToPath(new URL("../docs/schemas/CAEX_ClassModel_V.3.0.xsd", import.meta.url));
    execFileSync("xmllint", ["--nonet", "--noout", "--schema", schema, "-"], { input: xml, stdio: ["pipe", "pipe", "pipe"] });
  });
});
