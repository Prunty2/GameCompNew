export type FishSpecies =
  | "bluegill"
  | "yellowPerch"
  | "emeraldShiner"
  | "northernPike"
  | "largemouthBass"
  | "bowfin"
  | "lakeTrout"
  | "burbot"
  | "lakeSturgeon"
  | "seaMullet"
  | "yellowfinBream"
  | "sandWhiting"
  | "duskyFlathead"
  | "luderick"
  | "easternAustralianSalmon"
  | "snapper"
  | "yellowtailKingfish"
  | "mulloway";
export type HarborId = "brindle" | "gloam";
export type SpotId = "sunwardShoal" | "mosswaterPool" | "outerGloam";
export type UpgradeId = "cargo" | "engine" | "line";
export type WorldId = "lake" | "beach";
export type RegionId = "brindleCoast" | "mosswaterReach" | "violetGloam";
export type FishRarity = "common" | "uncommon" | "rare" | "legendary";

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
  rarity: FishRarity;
}

export interface FishingFightProfile {
  reelProgressPerSecond: number;
  tensionPerSecond: number;
  tensionRecoveryPerSecond: number;
  slipPerSecond: number;
  staminaDrainPerSecond: number;
  staminaRecoveryPerSecond: number;
  struggleCycleSeconds: number;
  struggleFraction: number;
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
  normalBrakeMultiplier: 1.15,
  boostBrakeMultiplier: 1.25,
  maxSurfaceSpeed: 0.05,
  waterDrag: 0.62,
  freshnessLifetime: 150,
  contractFreshnessMinimum: 80,
  contractFreshnessMaximum: 95,
  contractFreshnessStep: 5,
  contractRouteSafetyMargin: 4,
  contractAdditionalFishSafetyMargin: 2,
  routeDistanceScaleKm: 18,
  routeFreshnessLossPerMinute: 2 / 3,
  safeRouteSpeedMultiplier: 0.92,
  fastRouteSpeedMultiplier: 1.12,
  dayLength: 210,
  nightStart: 140,
  nightFadeLength: 25,
  fogLength: 48,
  cameraViewWidth: 0.3,
  boostCameraViewMultiplier: 1.18,
  boostCameraPullRate: 1.8,
  dockRadius: 0.027,
  fishingRadius: 0.027,
  interactionMaxSpeed: 0.026,
  fishingHookHorizontalSpeed: 0.25,
  fishingHookUpSpeed: 0.35,
  fishingHookDownSpeed: 0.25,
  fishingLineStrengthPerTier: 0.12,
  fishingCriticalTension: 0.9,
  fishingBreakGraceSeconds: 0.7,
  upgradeCosts: { cargo: 60, engine: 70, line: 55 },
  permitCost: 85,
  beachAccessCost: 120,
  boostUnlockCost: 300,
  boostSpeedMultiplier: 1.35,
  boostThrustMultiplier: 1.75,
  boostHeatSeconds: 8,
  boostCoolingSeconds: 10,
  boostRecoveryThreshold: 0.25,
  maxUpgradeTier: 6,
  engineSpeedPerTier: 0.11,
  maxEngineSpeedMultiplier: 1.95,
  maxCargoTier: 7,
  baseCargoSlots: 3,
  maxCargoSlots: 10,
  repairDamagePerShell: 2,
} as const;

/** Rates are fractions of their respective fight meter per second. */
export const FISHING_FIGHT_PROFILES: Record<FishRarity, FishingFightProfile> = {
  common: {
    reelProgressPerSecond: 0.34,
    tensionPerSecond: 0.68,
    tensionRecoveryPerSecond: 0.78,
    slipPerSecond: 0.035,
    staminaDrainPerSecond: 0.23,
    staminaRecoveryPerSecond: 0.035,
    struggleCycleSeconds: 2.2,
    struggleFraction: 0.42,
  },
  uncommon: {
    reelProgressPerSecond: 0.29,
    tensionPerSecond: 0.76,
    tensionRecoveryPerSecond: 0.73,
    slipPerSecond: 0.045,
    staminaDrainPerSecond: 0.19,
    staminaRecoveryPerSecond: 0.04,
    struggleCycleSeconds: 2,
    struggleFraction: 0.48,
  },
  rare: {
    reelProgressPerSecond: 0.25,
    tensionPerSecond: 0.84,
    tensionRecoveryPerSecond: 0.68,
    slipPerSecond: 0.055,
    staminaDrainPerSecond: 0.16,
    staminaRecoveryPerSecond: 0.045,
    struggleCycleSeconds: 1.8,
    struggleFraction: 0.54,
  },
  legendary: {
    reelProgressPerSecond: 0.22,
    tensionPerSecond: 0.94,
    tensionRecoveryPerSecond: 0.64,
    slipPerSecond: 0.065,
    staminaDrainPerSecond: 0.13,
    staminaRecoveryPerSecond: 0.05,
    struggleCycleSeconds: 1.65,
    struggleFraction: 0.6,
  },
};

export const SURFACE_Y = 0.61;

export const HARBORS: readonly HarborDefinition[] = [
  { id: "brindle", name: "Brindle Harbor", subtitle: "First light. Straight work.", x: 0.055, y: SURFACE_Y },
  { id: "gloam", name: "Gloam Ferry", subtitle: "Last light before the outer water.", x: 0.945, y: SURFACE_Y },
];

// Base whole-fish values: depth tier is the primary driver, rarity/order
// separates fish that share a depth, and Beach peers sit ~20% above Lake.
export const FISH: Record<FishSpecies, FishDefinition> = {
  bluegill: { id: "bluegill", name: "Bluegill", shape: "Deep body · dark ear flap", value: 18, depthTier: 0, atlasCell: [0, 0], hue: 0, scale: 0.86, rarity: "common" },
  yellowPerch: { id: "yellowPerch", name: "Yellow Perch", shape: "Golden flank · dark bars", value: 22, depthTier: 0, atlasCell: [1, 0], hue: 0, scale: 0.82, rarity: "common" },
  emeraldShiner: { id: "emeraldShiner", name: "Emerald Shiner", shape: "Silver body · forked tail", value: 28, depthTier: 0, atlasCell: [2, 0], hue: 0, scale: 0.76, rarity: "uncommon" },
  northernPike: { id: "northernPike", name: "Northern Pike", shape: "Long body · duckbill snout", value: 40, depthTier: 1, atlasCell: [0, 1], hue: 0, scale: 1, rarity: "uncommon" },
  largemouthBass: { id: "largemouthBass", name: "Largemouth Bass", shape: "Heavy jaw · dark side band", value: 52, depthTier: 2, atlasCell: [1, 1], hue: 0, scale: 1.02, rarity: "uncommon" },
  bowfin: { id: "bowfin", name: "Bowfin", shape: "Long dorsal fin · rounded tail", value: 64, depthTier: 2, atlasCell: [2, 1], hue: 0, scale: 1.06, rarity: "rare" },
  lakeTrout: { id: "lakeTrout", name: "Lake Trout", shape: "Pale spots · forked tail", value: 80, depthTier: 3, atlasCell: [0, 2], hue: 0, scale: 1.04, rarity: "rare" },
  burbot: { id: "burbot", name: "Burbot", shape: "Mottled body · chin barbel", value: 100, depthTier: 4, atlasCell: [1, 2], hue: 0, scale: 1.12, rarity: "rare" },
  lakeSturgeon: { id: "lakeSturgeon", name: "Lake Sturgeon", shape: "Bony scutes · four barbels", value: 130, depthTier: 5, atlasCell: [2, 2], hue: 0, scale: 1.24, rarity: "legendary" },
  seaMullet: { id: "seaMullet", name: "Sea Mullet", shape: "Striped silver body · two dorsal fins", value: 22, depthTier: 0, atlasCell: [0, 0], hue: 0, scale: 0.86, rarity: "common" },
  yellowfinBream: { id: "yellowfinBream", name: "Yellowfin Bream", shape: "Deep silver body · yellow fins", value: 26, depthTier: 0, atlasCell: [1, 0], hue: 0, scale: 0.9, rarity: "common" },
  sandWhiting: { id: "sandWhiting", name: "Sand Whiting", shape: "Slender silver body · yellow lower fins", value: 34, depthTier: 0, atlasCell: [2, 0], hue: 0, scale: 0.78, rarity: "uncommon" },
  duskyFlathead: { id: "duskyFlathead", name: "Dusky Flathead", shape: "Flat wedge head · mottled tail", value: 48, depthTier: 1, atlasCell: [0, 1], hue: 0, scale: 1.04, rarity: "uncommon" },
  luderick: { id: "luderick", name: "Luderick", shape: "Deep barred body · small mouth", value: 62, depthTier: 2, atlasCell: [1, 1], hue: 0, scale: 0.96, rarity: "uncommon" },
  easternAustralianSalmon: { id: "easternAustralianSalmon", name: "Eastern Australian Salmon", shape: "Silver body · powerful forked tail", value: 76, depthTier: 2, atlasCell: [2, 1], hue: 0, scale: 1.06, rarity: "rare" },
  snapper: { id: "snapper", name: "Snapper", shape: "Pink flank · blue spots", value: 96, depthTier: 3, atlasCell: [0, 2], hue: 0, scale: 1.04, rarity: "rare" },
  yellowtailKingfish: { id: "yellowtailKingfish", name: "Yellowtail Kingfish", shape: "Yellow stripe · forked yellow tail", value: 120, depthTier: 4, atlasCell: [1, 2], hue: 0, scale: 1.16, rarity: "rare" },
  mulloway: { id: "mulloway", name: "Mulloway", shape: "Bronze-silver flank · pearly spots", value: 156, depthTier: 5, atlasCell: [2, 2], hue: 0, scale: 1.24, rarity: "legendary" },
};

export const FISHING_SPOTS: readonly FishingSpotDefinition[] = [
  { id: "sunwardShoal", name: "Sunward Shoal", species: "bluegill", requiresPermit: false, requiredDepthTier: 0, region: "brindleCoast", x: 0.18, y: SURFACE_Y },
  { id: "mosswaterPool", name: "Mosswater Pool", species: "largemouthBass", requiresPermit: false, requiredDepthTier: 1, region: "mosswaterReach", x: 0.5, y: SURFACE_Y },
  { id: "outerGloam", name: "Outer Gloam", species: "lakeTrout", requiresPermit: true, requiredDepthTier: 3, region: "violetGloam", x: 0.82, y: SURFACE_Y },
];

export const SPOT_RESIDENTS: Record<SpotId, readonly FishSpecies[]> = {
  sunwardShoal: ["bluegill", "yellowPerch", "emeraldShiner"],
  mosswaterPool: ["northernPike", "largemouthBass", "bowfin"],
  outerGloam: ["lakeTrout", "burbot", "lakeSturgeon"],
};

export const BEACH_SPOT_RESIDENTS: Record<SpotId, readonly FishSpecies[]> = {
  sunwardShoal: ["seaMullet", "yellowfinBream", "sandWhiting"],
  mosswaterPool: ["duskyFlathead", "luderick", "easternAustralianSalmon"],
  outerGloam: ["snapper", "yellowtailKingfish", "mulloway"],
};

export const WORLD_SPOT_RESIDENTS: Record<WorldId, Record<SpotId, readonly FishSpecies[]>> = {
  lake: SPOT_RESIDENTS,
  beach: BEACH_SPOT_RESIDENTS,
};

export function residentsForSpot(world: WorldId, spotId: SpotId): readonly FishSpecies[] {
  return WORLD_SPOT_RESIDENTS[world][spotId];
}

export function primarySpeciesForSpot(world: WorldId, spotId: SpotId): FishSpecies {
  return world === "lake" ? spotById(spotId).species : residentsForSpot(world, spotId)[0]!;
}

export const REGIONS: readonly RegionDefinition[] = [
  { id: "brindleCoast", name: "Brindle Coast", startX: 0, endX: 0.4, surfaceTint: "#2d91a0", shallow: "#3d9da4", middle: "#236874", deep: "#0b2c3b" },
  { id: "mosswaterReach", name: "Mosswater Reach", startX: 0.4, endX: 0.69, surfaceTint: "#4f876e", shallow: "#4c9078", middle: "#285f57", deep: "#102f37" },
  { id: "violetGloam", name: "Violet Gloam", startX: 0.69, endX: 1, surfaceTint: "#62527f", shallow: "#596f88", middle: "#383d69", deep: "#181b3d" },
];

export const REGION_TINT_BLEND_WIDTH = 0.14;

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

export function regionSurfaceTintAt(x: number): string {
  const clampedX = Math.max(0, Math.min(1, x));
  for (let index = 0; index < REGIONS.length - 1; index += 1) {
    const current = REGIONS[index];
    const next = REGIONS[index + 1];
    if (!current || !next) continue;
    const blendStart = current.endX - REGION_TINT_BLEND_WIDTH / 2;
    const blendEnd = current.endX + REGION_TINT_BLEND_WIDTH / 2;
    if (clampedX < blendStart || clampedX > blendEnd) continue;
    const amount = (clampedX - blendStart) / REGION_TINT_BLEND_WIDTH;
    return blendHexColours(current.surfaceTint, next.surfaceTint, amount);
  }
  return regionAt(clampedX).surfaceTint;
}

function blendHexColours(from: string, to: string, amount: number): string {
  const fromValue = Number.parseInt(from.slice(1), 16);
  const toValue = Number.parseInt(to.slice(1), 16);
  const channel = (shift: number): number => Math.round(
    ((fromValue >> shift) & 0xff) * (1 - amount) + ((toValue >> shift) & 0xff) * amount,
  );
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`;
}

export function boatClassAt(tier: number): string {
  return BOAT_CLASSES[Math.max(0, Math.min(BOAT_CLASSES.length - 1, Math.floor(tier)))] ?? BOAT_CLASSES[0];
}

export function upgradeTierCap(upgrade: UpgradeId): number {
  return upgrade === "cargo" ? BALANCE.maxCargoTier : BALANCE.maxUpgradeTier;
}

export function engineSpeedMultiplier(tier: number): number {
  const clampedTier = Math.max(0, Math.min(BALANCE.maxUpgradeTier, Math.floor(tier)));
  if (clampedTier === BALANCE.maxUpgradeTier) return BALANCE.maxEngineSpeedMultiplier;
  return 1 + clampedTier * BALANCE.engineSpeedPerTier;
}
