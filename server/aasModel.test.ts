import { describe, expect, it } from "vitest";
import { getAllowedAssetTransitions } from "../shared/asset-lifecycle";
import { buildAasDocuments } from "./aasModel";

describe("AAS documents", () => {
  it("builds a shell with references to modeled submodels", () => {
    const { shell, submodels } = buildAasDocuments({
      assetId: "urn:test:compressor-01",
      name: "Compressor 01",
      assetType: "compressor",
      manufacturer: "Example Works",
      model: "CX-1",
      manufacturerStreet: "Industrial Road 1",
      manufacturerZipcode: "10000",
      manufacturerCityTown: "Demo City",
      manufacturerNationalCode: "DE",
      manufacturerArticleNumber: "CX-1-ART",
      orderCodeOfManufacturer: "CX-1-ORDER",
    });

    expect(shell.modelType).toBe("AssetAdministrationShell");
    expect(shell.assetInformation.globalAssetId).toBe("urn:test:compressor-01");
    expect(shell.submodels).toHaveLength(submodels.length);
    expect(submodels.map((item) => item.modelType)).toEqual(Array(4).fill("Submodel"));
    expect(submodels.every((item) => Array.isArray(item.submodelElements))).toBe(true);
    const nameplate = submodels[0];
    expect(nameplate.idShort).toBe("Nameplate");
    expect(nameplate.semanticId?.keys[0]?.value).toBe("https://admin-shell.io/idta/nameplate/3/0/Nameplate");
    expect(nameplate.administration?.templateId).toBe("https://admin-shell.io/idta-02006-3-0");
    expect(nameplate.submodelElements.map((element) => element.idShort)).toContain("OrderCodeOfManufacturer");
    const address = nameplate.submodelElements.find((element) => element.idShort === "AddressInformation");
    expect(address?.semanticId?.keys[0]?.value).toBe("https://admin-shell.io/zvei/nameplate/1/0/ContactInformations/AddressInformation");
    expect(address?.value.map((element) => element.idShort)).toEqual(["Street", "Zipcode", "CityTown", "NationalCode"]);
    const technicalData = submodels[1];
    const generalInformation = technicalData.submodelElements.find((element) => element.idShort === "GeneralInformation");
    const productImages = generalInformation?.value.find((element) => element.idShort === "ProductImages");
    expect(productImages?.semanticIdListElement?.keys[0]?.value).toBe("0173-1#02-ABM220#001/0173-1#01-AHY911#001");
  });

  it("increments the AAS administration revision without changing template identity", () => {
    const { shell, submodels } = buildAasDocuments({
      assetId: "urn:test:compressor-versioned",
      name: "Versioned Compressor",
      assetType: "compressor",
      manufacturer: "Example Works",
      model: "CX-1",
      manufacturerStreet: "Industrial Road 1",
      manufacturerZipcode: "10115",
      manufacturerCityTown: "Berlin",
      manufacturerNationalCode: "DE",
      manufacturerArticleNumber: "CX-1-ART",
      orderCodeOfManufacturer: "CX-1-ORDER",
      aasVersion: 7,
    });

    expect(shell.administration).toEqual({ version: "7", revision: "0" });
    expect(submodels.map((item) => item.administration?.version)).toEqual(["7", "7", "7", "7"]);
    expect(submodels[0].administration?.templateId).toBe("https://admin-shell.io/idta-02006-3-0");
  });

  it("models robotic-arm operations and its product passport", () => {
    const { shell, submodels } = buildAasDocuments({
      assetId: "urn:test:arm:ada301", name: "ADA301 Arm", assetType: "robotic_arm",
      manufacturer: "Adeept", model: "ADA301", manufacturerStreet: "Example 1",
      manufacturerZipcode: "10115", manufacturerCityTown: "Berlin", manufacturerNationalCode: "DE",
      manufacturerArticleNumber: "ADA301", orderCodeOfManufacturer: "ADA301", serialNumber: "ARM-001",
    });
    expect(shell.submodels).toHaveLength(5);
    expect(submodels.map((item) => item.idShort)).toContain("DigitalProductPassport");
    expect(submodels.map((item) => item.idShort)).toContain("OperationalData");
  });

  it("does not export a template instance with missing required postal information", () => {
    expect(() => buildAasDocuments({
      assetId: "urn:test:compressor-02",
      name: "Compressor 02",
      assetType: "compressor",
      manufacturer: "Example Works",
      model: "CX-2",
      manufacturerStreet: "",
      manufacturerZipcode: "10000",
      manufacturerCityTown: "Demo City",
      manufacturerNationalCode: "DE",
      manufacturerArticleNumber: "CX-2-ART",
      orderCodeOfManufacturer: "CX-2-ORDER",
    })).toThrow(/postal address fields/);
  });

  it("only permits valid lifecycle progression and makes decommissioned terminal", () => {
    expect(getAllowedAssetTransitions("planned")).toContain("engineered");
    expect(getAllowedAssetTransitions("planned")).not.toContain("operational");
    expect(getAllowedAssetTransitions("maintenance")).toEqual(["operational", "decommissioned"]);
    expect(getAllowedAssetTransitions("decommissioned")).toEqual([]);
  });
});
