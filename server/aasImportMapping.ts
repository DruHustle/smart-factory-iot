type AasValueElement = Record<string, unknown>;

function textValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!Array.isArray(value)) return undefined;
  const entries = value.filter((item): item is { language?: string; text?: string } =>
    !!item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string",
  );
  return entries.find((entry) => entry.language?.toLowerCase().startsWith("en"))?.text?.trim()
    || entries[0]?.text?.trim()
    || undefined;
}

function findElementValue(elements: unknown, wanted: ReadonlySet<string>): string | undefined {
  if (!Array.isArray(elements)) return undefined;
  for (const candidate of elements) {
    if (!candidate || typeof candidate !== "object") continue;
    const element = candidate as AasValueElement;
    if (typeof element.idShort === "string" && wanted.has(element.idShort)) {
      const direct = textValue(element.value);
      if (direct) return direct;
    }
    const nested = findElementValue(element.value, wanted);
    if (nested) return nested;
  }
  return undefined;
}

/** Derive summary columns only from values present in imported AAS submodels. */
export function getImportedAssetSummary(submodels: Array<Record<string, unknown>>) {
  const elements = submodels.flatMap((submodel) => Array.isArray(submodel.submodelElements) ? submodel.submodelElements : []);
  return {
    manufacturer: findElementValue(elements, new Set(["ManufacturerName"])),
    model: findElementValue(elements, new Set(["ManufacturerProductDesignation", "Model"])),
  };
}
