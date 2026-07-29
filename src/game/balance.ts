export type FishSpecies = "reedfin" | "needlePike" | "gloamGill";
export type HarborId = "brindle" | "gloam";
export type SpotId = "sunwardShoal" | "needleRun" | "outerGloam";
export type UpgradeId = "cargo" | "engine" | "lamp";

export interface WorldPoint {
  x: number;
  y: number;
}

export interface HarborDefinition extends WorldPoint {
  id: HarborId;
  name: string;
  subtitle: string;
}

export interface FishingSpotDefinition extends WorldPoint {
  id: SpotId;
  name: string;
  species: FishSpecies;
  requiresPermit: boolean;
}

export interface FishDefinition {
  id: FishSpecies;
  name: string;
  shape: string;
  value: number;
}

export const BALANCE = {
  horizontalThrust: 0.055,
  engineBoostThrust: 0.085,
  maxSurfaceSpeed: 0.08,
  brakeStrength: 0.72,
  waterDrag: 0.62,
  freshnessLifetime: 150,
  dayLength: 210,
  nightStart: 140,
  fogLength: 48,
  cameraViewWidth: 0.59,
  dockRadius: 0.052,
  fishingRadius: 0.052,
  interactionMaxSpeed: 0.042,
  upgradeCosts: { cargo: 60, engine: 70, lamp: 70 },
  permitCost: 85,
  maxUpgradeTier: 2,
  repairDamagePerShell: 2,
} as const;

export const SURFACE_Y = 0.61;

export const HARBORS: readonly HarborDefinition[] = [
  { id: "brindle", name: "Brindle Harbor", subtitle: "First light. Straight work.", x: 0.055, y: SURFACE_Y },
  { id: "gloam", name: "Gloam Ferry", subtitle: "Last light before the outer water.", x: 0.945, y: SURFACE_Y },
];

export const FISH: Record<FishSpecies, FishDefinition> = {
  reedfin: { id: "reedfin", name: "Reedfin", shape: "Round body · fan fins", value: 18 },
  needlePike: { id: "needlePike", name: "Needle Pike", shape: "Long body · pointed snout", value: 30 },
  gloamGill: { id: "gloamGill", name: "Gloam Gill", shape: "Fork tail · eye mark", value: 52 },
};

export const FISHING_SPOTS: readonly FishingSpotDefinition[] = [
  { id: "sunwardShoal", name: "Sunward Shoal", species: "reedfin", requiresPermit: false, x: 0.27, y: SURFACE_Y },
  { id: "needleRun", name: "Needle Run", species: "needlePike", requiresPermit: false, x: 0.52, y: SURFACE_Y },
  { id: "outerGloam", name: "Outer Gloam", species: "gloamGill", requiresPermit: true, x: 0.76, y: SURFACE_Y },
];

export function harborById(id: HarborId): HarborDefinition {
  const harbor = HARBORS.find((candidate) => candidate.id === id);
  if (!harbor) throw new Error(`Unknown harbor: ${id}`);
  return harbor;
}

export function spotById(id: SpotId): FishingSpotDefinition {
  const spot = FISHING_SPOTS.find((candidate) => candidate.id === id);
  if (!spot) throw new Error(`Unknown fishing spot: ${id}`);
  return spot;
}
