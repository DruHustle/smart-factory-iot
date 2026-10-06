export type AssetIdentity = {
  assetId: string;
  name: string;
  assetType: string;
  manufacturer?: string;
  model?: string;
  manufacturerStreet: string;
  manufacturerZipcode: string;
  manufacturerCityTown: string;
  manufacturerNationalCode: string;
  manufacturerArticleNumber?: string;
  orderCodeOfManufacturer?: string;
  serialNumber?: string;
  ratedValue?: string;
  ratedUnit?: string;
  /** Application revision, independent of the referenced IDTA template version. */
  aasVersion?: number;
  /** Expected current revision, checked by the .NET provisioner before PUT. */
  expectedAasVersion?: number;
};

const submodelDefinitions = [
  { idShort: "Nameplate", semanticId: "https://admin-shell.io/idta/nameplate/3/0/Nameplate" },
  { idShort: "TechnicalData", semanticId: "0173-1#01-AHX837#002" },
  { idShort: "MaintenanceInstructions", semanticId: "https://admin-shell.io/idta/SubmodelTemplate/MaintenanceInstructions/1/0" },
  { idShort: "DigitalProductPassport", semanticId: "https://smart-factory.example/aas/submodels/digital-product-passport/1/0" },
  { idShort: "OperationalData", semanticId: "https://smart-factory.example/aas/submodels/robot-operational-data/1/0" },
];

const nameplateSemantics: Record<string, { primary: string; supplemental?: string }> = {
  URIOfTheProduct: { primary: "0112/2///61987#ABN590#002", supplemental: "0173-1#02-ABH173#003" },
  ManufacturerName: { primary: "0112/2///61987#ABA565#009", supplemental: "0173-1#02-AAO677#004" },
  ManufacturerProductDesignation: { primary: "0112/2///61987#ABA567#009", supplemental: "0173-1#02-AAW338#003" },
  AddressInformation: { primary: "https://admin-shell.io/zvei/nameplate/1/0/ContactInformations/AddressInformation" },
  Street: { primary: "0173-1#02-AAO128#002" },
  Zipcode: { primary: "0173-1#02-AAO129#002" },
  CityTown: { primary: "0173-1#02-AAO132#002" },
  NationalCode: { primary: "0173-1#02-AAO134#002" },
  OrderCodeOfManufacturer: { primary: "0112/2///61987#ABA950#008", supplemental: "0173-1#02-AAO227#004" },
  ProductArticleNumberOfManufacturer: { primary: "0112/2///61987#ABA581#007", supplemental: "0173-1#02-AAO676#005" },
  SerialNumber: { primary: "0112/2///61987#ABA951#009", supplemental: "0173-1#02-AAM556#004" },
  TechnicalData: { primary: "0173-1#01-AHX837#002" },
  GeneralInformation: { primary: "0173-1#02-ABK161#002/0173-1#01-AHX838#002", supplemental: "https://api.eclass-cdp.com/0173-1-02-ABK161-002/0173-1-01-AHX838-002" },
  TechnicalPropertyAreas: { primary: "0173-1#02-ABK163#002", supplemental: "https://api.eclass-cdp.com/0173-1-02-ABK163-002" },
  MaintenanceFreeAsset: { primary: "https://admin-shell.io/idta/maintenanceinstructions/maintenancefreeasset/1/0" },
};

function toIdShort(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, "");
  return /^[a-zA-Z]/.test(cleaned) ? cleaned : `Asset${cleaned}`;
}

function aasProperty(idShort: string, value: string, valueType = "xs:string", semanticId?: string, supplementalSemanticId?: string) {
  return {
    modelType: "Property",
    idShort,
    valueType,
    value,
    ...(semanticId ? { semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: semanticId }] } } : {}),
    ...(supplementalSemanticId ? { supplementalSemanticIds: [{ type: "ExternalReference", keys: [{ type: "GlobalReference", value: supplementalSemanticId }] }] } : {}),
  };
}

function aasMultiLanguageProperty(idShort: string, value: string, semanticId: string, supplementalSemanticId?: string) {
  return {
    modelType: "MultiLanguageProperty",
    idShort,
    value: [{ language: "en", text: value }],
    semanticId: { type: "ExternalReference", keys: [{ type: "GlobalReference", value: semanticId }] },
    ...(supplementalSemanticId ? { supplementalSemanticIds: [{ type: "ExternalReference", keys: [{ type: "GlobalReference", value: supplementalSemanticId }] }] } : {}),
  };
}

function externalReference(value: string) {
  return { type: "ExternalReference", keys: [{ type: "GlobalReference", value }] };
}

export function buildAasDocuments(asset: AssetIdentity) {
  const aasVersion = asset.aasVersion ?? 1;
  const requiredValues = [
    asset.manufacturer,
    asset.model,
    asset.manufacturerStreet,
    asset.manufacturerZipcode,
    asset.manufacturerCityTown,
    asset.manufacturerNationalCode,
    asset.manufacturerArticleNumber,
    asset.orderCodeOfManufacturer,
  ];
  if (requiredValues.some((value) => !value?.trim())) {
    throw new Error("IDTA templates require manufacturer identity and postal address fields");
  }
  if (!/^[A-Z]{2}$/i.test(asset.manufacturerNationalCode)) {
    throw new Error("Manufacturer country code must use two ISO 3166-1 alpha-2 letters");
  }
  const manufacturerNationalCode = asset.manufacturerNationalCode.toUpperCase();

  const shell = {
    modelType: "AssetAdministrationShell",
    id: asset.assetId,
    idShort: toIdShort(asset.name),
    administration: { version: String(aasVersion), revision: "0" },
    assetInformation: {
      assetKind: "Instance",
      globalAssetId: asset.assetId,
      specificAssetIds: [{ name: "assetType", value: asset.assetType }],
    },
    submodels: submodelDefinitions.filter((submodel) => submodel.idShort !== "OperationalData" || asset.assetType === "robotic_arm").map((submodel) => ({
      type: "ModelReference",
      keys: [{ type: "Submodel", value: `${asset.assetId}/submodels/${submodel.idShort}` }],
    })),
  };

  const submodel = (idShort: string, elements: Array<Record<string, unknown>>) => {
    const definition = submodelDefinitions.find((item) => item.idShort === idShort)!;
    return {
      modelType: "Submodel",
      id: `${asset.assetId}/submodels/${idShort}`,
      idShort,
      kind: "Instance",
      ...(definition.semanticId ? { semanticId: {
        type: "ExternalReference",
        keys: [{ type: "GlobalReference", value: definition.semanticId }],
      } } : {}),
      administration: {
        version: String(aasVersion),
        revision: "0",
        templateId: idShort === "Nameplate"
          ? "https://admin-shell.io/idta-02006-3-0"
          : idShort === "TechnicalData"
            ? "https://admin-shell.io/idta-02003-2-0"
            : idShort === "MaintenanceInstructions"
              ? "https://admin-shell.io/idta-02018-1-0"
              : `https://smart-factory.example/aas/templates/${idShort}/1/0`,
      },
      submodelElements: elements,
    };
  };

  const nameplateOrderCode = asset.orderCodeOfManufacturer ?? "";
  const submodels = [
    submodel("Nameplate", [
      aasProperty("URIOfTheProduct", asset.assetId, "xs:anyURI", nameplateSemantics.URIOfTheProduct.primary, nameplateSemantics.URIOfTheProduct.supplemental),
      aasMultiLanguageProperty("ManufacturerName", asset.manufacturer ?? "", nameplateSemantics.ManufacturerName.primary, nameplateSemantics.ManufacturerName.supplemental),
      aasMultiLanguageProperty("ManufacturerProductDesignation", asset.model ?? "", nameplateSemantics.ManufacturerProductDesignation.primary, nameplateSemantics.ManufacturerProductDesignation.supplemental),
      {
        modelType: "SubmodelElementCollection",
        idShort: "AddressInformation",
        semanticId: externalReference(nameplateSemantics.AddressInformation.primary),
        supplementalSemanticIds: [
          "https://admin-shell.io/smt-dropin/smt-dropin-use/1/0",
          "0112/2///61360_7#AAS002#001",
          "0173-1#02-AAQ837#008/0173-1#01-ADR448#008",
        ].map(externalReference),
        value: [
          aasMultiLanguageProperty("Street", asset.manufacturerStreet, nameplateSemantics.Street.primary),
          aasMultiLanguageProperty("Zipcode", asset.manufacturerZipcode, nameplateSemantics.Zipcode.primary),
          aasMultiLanguageProperty("CityTown", asset.manufacturerCityTown, nameplateSemantics.CityTown.primary),
          aasMultiLanguageProperty("NationalCode", manufacturerNationalCode, nameplateSemantics.NationalCode.primary),
        ],
      },
      aasProperty("OrderCodeOfManufacturer", nameplateOrderCode, "xs:string", nameplateSemantics.OrderCodeOfManufacturer.primary, nameplateSemantics.OrderCodeOfManufacturer.supplemental),
      ...(asset.manufacturerArticleNumber ? [aasProperty("ProductArticleNumberOfManufacturer", asset.manufacturerArticleNumber, "xs:string", nameplateSemantics.ProductArticleNumberOfManufacturer.primary, nameplateSemantics.ProductArticleNumberOfManufacturer.supplemental)] : []),
      ...(asset.serialNumber ? [aasProperty("SerialNumber", asset.serialNumber, "xs:string", nameplateSemantics.SerialNumber.primary, nameplateSemantics.SerialNumber.supplemental)] : []),
    ]),
    submodel("TechnicalData", [
      {
        modelType: "SubmodelElementCollection",
        idShort: "GeneralInformation",
        semanticId: externalReference(nameplateSemantics.GeneralInformation.primary),
        supplementalSemanticIds: [externalReference(nameplateSemantics.GeneralInformation.supplemental!)],
        value: [
          aasProperty("ManufacturerName", asset.manufacturer ?? "", "xs:string", "0173-1#02-AAO677#004"),
          aasMultiLanguageProperty("ManufacturerProductDesignation", asset.model ?? "", "0173-1#02-AAW338#003", "https://api.eclass-cdp.com/0173-1-02-AAW338-003"),
          aasProperty("ManufacturerArticleNumber", asset.manufacturerArticleNumber ?? "", "xs:string", "0173-1#02-AAO676#005", "https://api.eclass-cdp.com/0173-1-02-AAO676-005"),
          aasProperty("ManufacturerOrderCode", asset.orderCodeOfManufacturer ?? "", "xs:string", "0173-1#02-AAO227#004", "https://api.eclass-cdp.com/0173-1-02-AAO227-004"),
          {
            modelType: "SubmodelElementList",
            idShort: "ProductImages",
            orderRelevant: false,
            typeValueListElement: "SubmodelElementCollection",
            semanticId: externalReference("0173-1#02-ABM220#001"),
            semanticIdListElement: externalReference("0173-1#02-ABM220#001/0173-1#01-AHY911#001"),
            value: [],
          },
        ],
      },
      {
        modelType: "SubmodelElementList",
        idShort: "ProductClassifications",
        orderRelevant: false,
        typeValueListElement: "SubmodelElementCollection",
        semanticId: externalReference("0173-1#02-ABK162#002"),
        semanticIdListElement: externalReference("0173-1#02-ABK162#002/0173-1#01-AHX839#002"),
        value: [],
      },
      {
        modelType: "SubmodelElementList", idShort: "TechnicalPropertyAreas", orderRelevant: false, typeValueListElement: "SubmodelElementCollection",
        semanticId: externalReference(nameplateSemantics.TechnicalPropertyAreas.primary),
        semanticIdListElement: externalReference("0173-1#02-ABL358#002/0173-1#01-AHX773#002"),
        supplementalSemanticIds: [externalReference(nameplateSemantics.TechnicalPropertyAreas.supplemental!)],
        value: (asset.ratedValue || asset.ratedUnit) ? [{
          modelType: "SubmodelElementCollection", idShort: "TechnicalPropertyAreas__00__",
          semanticId: externalReference("0173-1#02-ABL358#002/0173-1#01-AHX773#002"),
          value: [{ modelType: "SubmodelElementCollection", idShort: "RatedCharacteristics", displayName: [{ language: "en", text: "Rated characteristics" }], semanticId: externalReference("https://admin-shell.io/SMT/General/Arbitrary"), value: [
            ...(asset.ratedValue ? [{ ...aasProperty("RatedValue", asset.ratedValue, "xs:string", "https://admin-shell.io/SMT/General/Arbitrary"), displayName: [{ language: "en", text: "Rated value" }] }] : []),
            ...(asset.ratedUnit ? [{ ...aasProperty("RatedUnit", asset.ratedUnit, "xs:string", "https://admin-shell.io/SMT/General/Arbitrary"), displayName: [{ language: "en", text: "Rated unit" }] }] : []),
          ] }],
        }] : [],
      },
      {
        modelType: "SubmodelElementList",
        idShort: "SpecificDescriptions",
        orderRelevant: false,
        typeValueListElement: "SubmodelElementCollection",
        semanticId: externalReference("0173-1#02-ABM221#001"),
        semanticIdListElement: externalReference("0173-1#02-ABM221#001/0173-1#01-AHY912#001"),
        value: [],
      },
    ]),
    submodel("MaintenanceInstructions", [
      aasProperty("MaintenanceFreeAsset", "false", "xs:boolean", nameplateSemantics.MaintenanceFreeAsset.primary),
    ]),
    submodel("DigitalProductPassport", [
      aasProperty("UniqueProductIdentifier", asset.assetId, "xs:anyURI"),
      aasProperty("PassportLevel", asset.serialNumber ? "item" : "model"),
      aasProperty("Manufacturer", asset.manufacturer ?? ""),
      aasProperty("Model", asset.model ?? ""),
      ...(asset.serialNumber ? [aasProperty("SerialNumber", asset.serialNumber)] : []),
      aasProperty("DataFormat", "AAS 3.1 JSON"),
      aasProperty("RegulatoryStatus", "Voluntary prototype; product-group delegated-act requirements must be verified"),
    ]),
    ...(asset.assetType === "robotic_arm" ? [submodel("OperationalData", [
      aasProperty("SupportedProfilePickAndPlace", "pick_and_place_repeat", "xs:string"),
      aasProperty("SupportedProfileDemonstration", "demonstration_moves", "xs:string"),
      aasProperty("NeutralPositionDegrees", "90", "xs:integer"),
      aasProperty("TelemetrySignals", "cycle_count, successful_cycles, failed_cycles, cycle_time_ms, active_profile, sequence_step, movement_active, button_pressed, uptime_ms, calibration_mode, pots_matched, servo_1_deg..servo_5_deg, pot_1_deg..pot_5_deg", "xs:string"),
      aasProperty("PositionFeedback", "commanded-target telemetry only unless physical feedback sensors are fitted", "xs:string"),
      aasProperty("SafetyFunction", "none; software controls are not an emergency stop", "xs:string"),
    ])] : []),
  ];

  return { shell, submodels, conceptDescriptions: [] as Array<Record<string, unknown>> };
}
