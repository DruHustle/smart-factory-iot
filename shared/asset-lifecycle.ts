export const ASSET_LIFECYCLE_STAGES = [
  "planned",
  "engineered",
  "commissioned",
  "operational",
  "maintenance",
  "decommissioned",
] as const;

export type AssetLifecycleStage = (typeof ASSET_LIFECYCLE_STAGES)[number];

const transitions: Record<AssetLifecycleStage, readonly AssetLifecycleStage[]> = {
  planned: ["engineered", "decommissioned"],
  engineered: ["commissioned", "planned", "decommissioned"],
  commissioned: ["operational", "engineered", "decommissioned"],
  operational: ["maintenance", "decommissioned"],
  maintenance: ["operational", "decommissioned"],
  decommissioned: [],
};

export function getAllowedAssetTransitions(stage: AssetLifecycleStage) {
  return transitions[stage];
}
