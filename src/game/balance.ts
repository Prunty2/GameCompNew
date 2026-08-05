export type FishSpecies =
  | "reedfin"
  | "sunPerch"
  | "silverDart"
  | "needlePike"
  | "mossback"
  | "lanternEel"
  | "gloamGill"
  | "violetRay"
  | "abyssCrown";
export type HarborId = "brindle" | "gloam";
export type SpotId = "sunwardShoal" | "silverBay" | "needleRun" | "mosswaterPool" | "outerGloam" | "blackwaterTrench";
export type UpgradeId = "cargo" | "engine" | "lamp" | "line";
export type RegionId = "brindleCoast" | "mosswaterReach" | "violetGloam";

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
  requiredDepthTier: number;
  region: RegionId;
}

export interface FishDefinition {
  id: FishSpecies;
  name: string;
  shape: string;
  value: number;
  depthTier: number;
  atlasCell: readonly [number, number];
  hue: number;
  scale: number;
}

export interface RegionDefinition {
  id: RegionId;
  name: string;
  startX: number;
  endX: number;
  surfaceTint: string;
  shallow: string;
  middle: string;
  deep: string;
}

export const BALANCE = {
  horizontalThrust: 0.034,
  engineBoostThrust: 0.057,
  maxSurfaceSpeed: 0.05,
  brakeStrength: 0.72,
  waterDrag: 0.62,
  freshnessLifetime: 150,
  routeDistanceScaleKm: 18,
  routeFreshnessLossPerMinute: 2 / 3,
  safeRouteSpeedMultiplier: 0.92,
  fastRouteSpeedMultiplier: 1.12,
  dayLength: 210,
  nightStart: 140,
  fogLength: 48,
  cameraViewWidth: 0.3,
  dockRadius: 0.027,
  fishingRadius: 0.027,
  interactionMaxSpeed: 0.026,
  upgradeCosts: { cargo: 60, engine: 70, lamp: 70, line: 55 },
  permitCost: 85,
  maxUpgradeTier: 6,
  maxCargoTier: 7,
  baseCargoSlots: 3,
  maxCargoSlots: 10,
  repairDamagePerShell: 2,
} as const;

export const SURFACE_Y = 0.61;

export const HARBORS: readonly HarborDefinition[] = [
  { id: "brindle", name: "Brindle Harbor", subtitle: "First light. Straight work.", x: 0.055, y: SURFACE_Y },
  { id: "gloam", name: "Gloam Ferry", subtitle: "Last light before the outer water.", x: 0.945, y: SURFACE_Y },
];

export const FISH: Record<FishSpecies, FishDefinition> = {
  reedfin: { id: "reedfin", name: "Reedfin", shape: "Round body · fan fins", value: 18, depthTier: 0, atlasCell: [0, 0], hue: 0, scale: 0.86 },
  sunPerch: { id: "sunPerch", name: "Sun Perch", shape: "Tall body · bright crest", value: 22, depthTier: 0, atlasCell: [1, 0], hue: 0, scale: 0.78 },
  silverDart: { id: "silverDart", name: "Silver Dart", shape: "Slim body · split tail", value: 26, depthTier: 0, atlasCell: [2, 0], hue: 0, scale: 0.82 },
  needlePike: { id: "needlePike", name: "Needle Pike", shape: "Long body · pointed snout", value: 34, depthTier: 1, atlasCell: [0, 1], hue: 0, scale: 0.96 },
  mossback: { id: "mossback", name: "Mossback", shape: "Heavy hump · leaf fins", value: 46, depthTier: 2, atlasCell: [1, 1], hue: 0, scale: 1.02 },
  lanternEel: { id: "lanternEel", name: "Lantern Eel", shape: "Snake body · glowing lure", value: 58, depthTier: 2, atlasCell: [2, 1], hue: 0, scale: 1.04 },
  gloamGill: { id: "gloamGill", name: "Gloam Gill", shape: "Fork tail · eye mark", value: 72, depthTier: 3, atlasCell: [0, 2], hue: 0, scale: 1.02 },
  violetRay: { id: "violetRay", name: "Violet Ray", shape: "Wing fins · ribbon tail", value: 92, depthTier: 4, atlasCell: [1, 2], hue: 0, scale: 1.14 },
  abyssCrown: { id: "abyssCrown", name: "Abyss Crown", shape: "Crowned head · pale eye", value: 125, depthTier: 5, atlasCell: [2, 2], hue: 0, scale: 1.22 },
};

export const FISHING_SPOTS: readonly FishingSpotDefinition[] = [
  { id: "sunwardShoal", name: "Sunward Shoal", species: "reedfin", requiresPermit: false, requiredDepthTier: 0, region: "brindleCoast", x: 0.2, y: SURFACE_Y },
  { id: "silverBay", name: "Silver Bay", species: "silverDart", requiresPermit: false, requiredDepthTier: 0, region: "brindleCoast", x: 0.34, y: SURFACE_Y },
  { id: "needleRun", name: "Needle Run", species: "needlePike", requiresPermit: false, requiredDepthTier: 1, region: "mosswaterReach", x: 0.49, y: SURFACE_Y },
  { id: "mosswaterPool", name: "Mosswater Pool", species: "mossback", requiresPermit: false, requiredDepthTier: 2, region: "mosswaterReach", x: 0.62, y: SURFACE_Y },
  { id: "outerGloam", name: "Outer Gloam", species: "gloamGill", requiresPermit: true, requiredDepthTier: 3, region: "violetGloam", x: 0.76, y: SURFACE_Y },
  { id: "blackwaterTrench", name: "Blackwater Trench", species: "abyssCrown", requiresPermit: true, requiredDepthTier: 5, region: "violetGloam", x: 0.87, y: SURFACE_Y },
];

export const SPOT_RESIDENTS: Record<SpotId, readonly FishSpecies[]> = {
  sunwardShoal: ["reedfin", "sunPerch", "silverDart"],
  silverBay: ["silverDart", "sunPerch", "needlePike"],
  needleRun: ["needlePike", "silverDart", "mossback"],
  mosswaterPool: ["mossback", "lanternEel", "needlePike"],
  outerGloam: ["gloamGill", "violetRay", "lanternEel"],
  blackwaterTrench: ["abyssCrown", "violetRay", "gloamGill"],
};

export const REGIONS: readonly RegionDefinition[] = [
  { id: "brindleCoast", name: "Brindle Coast", startX: 0, endX: 0.4, surfaceTint: "#2d91a0", shallow: "#3d9da4", middle: "#236874", deep: "#0b2c3b" },
  { id: "mosswaterReach", name: "Mosswater Reach", startX: 0.4, endX: 0.69, surfaceTint: "#4f876e", shallow: "#4c9078", middle: "#285f57", deep: "#102f37" },
  { id: "violetGloam", name: "Violet Gloam", startX: 0.69, endX: 1, surfaceTint: "#62527f", shallow: "#596f88", middle: "#383d69", deep: "#181b3d" },
];

export const BOAT_CLASSES = ["Skiff", "Wide skiff", "Lake cutter", "Cabin cutter", "Trawler", "Deepwater trawler", "Lakebreaker"] as const;

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

export function regionById(id: RegionId): RegionDefinition {
  const region = REGIONS.find((candidate) => candidate.id === id);
  if (!region) throw new Error(`Unknown region: ${id}`);
  return region;
}

export function regionAt(x: number): RegionDefinition {
  return REGIONS.find((region) => x >= region.startX && x < region.endX) ?? REGIONS[REGIONS.length - 1]!;
}

export function boatClassAt(tier: number): string {
  return BOAT_CLASSES[Math.max(0, Math.min(BOAT_CLASSES.length - 1, Math.floor(tier)))] ?? BOAT_CLASSES[0];
}

export function upgradeTierCap(upgrade: UpgradeId): number {
  return upgrade === "cargo" ? BALANCE.maxCargoTier : BALANCE.maxUpgradeTier;
}
