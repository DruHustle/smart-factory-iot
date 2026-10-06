import { describe, expect, it } from "vitest";
import { getImportedAssetSummary } from "./aasImportMapping";

describe("AASX asset list summary mapping", () => {
  it("reads manufacturer and model from nested imported Nameplate values", () => {
    const summary = getImportedAssetSummary([{
      idShort: "Nameplate",
      submodelElements: [{
        modelType: "SubmodelElementCollection",
        idShort: "Identity",
        value: [
          { modelType: "MultiLanguageProperty", idShort: "ManufacturerName", value: [{ language: "de", text: "Beispiel GmbH" }, { language: "en", text: "Example Works" }] },
          { modelType: "MultiLanguageProperty", idShort: "ManufacturerProductDesignation", value: [{ language: "en", text: "Wind generator WTG-1" }] },
        ],
      }],
    }]);

    expect(summary).toEqual({ manufacturer: "Example Works", model: "Wind generator WTG-1" });
  });

  it("does not invent values that are absent from the imported package", () => {
    expect(getImportedAssetSummary([{ idShort: "ExampleSubmodel", submodelElements: [] }]))
      .toEqual({ manufacturer: undefined, model: undefined });
  });
});
