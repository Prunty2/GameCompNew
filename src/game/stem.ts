import {
  BALANCE,
  FISH,
  WORLD_SPOT_RESIDENTS,
  engineSpeedMultiplier,
  harborById,
  spotById,
  type FishSpecies,
  type SpotId,
  type WorldId,
} from "./balance";
import type { Contract } from "./simulation";

export interface WaterReading {
  depthM: number;
  temperatureC: number;
  oxygenMgL: number;
  turbidity: "low" | "moderate" | "high";
  habitat: string;
  clue: string;
}

export interface FishScienceProfile {
  temperatureRangeC: readonly [number, number];
  minimumOxygenMgL: number;
  habitat: string;
  ecologicalRole: string;
  evidence: string;
}

export interface RouteEstimate {
  distanceKm: number;
  safeMinutes: number;
  fastMinutes: number;
  safeArrivalFreshness: number;
  fastArrivalFreshness: number;
}

export interface SurveyResult {
  correct: boolean;
  expected: FishSpecies;
  explanation: string;
}

export const WATER_READINGS: Record<SpotId, WaterReading> = {
  sunwardShoal: {
    depthM: 4,
    temperatureC: 21,
    oxygenMgL: 8.4,
    turbidity: "low",
    habitat: "sunlit reeds",
    clue: "Warm, oxygen-rich shallows favour compact fish that shelter among reeds.",
  },
  mosswaterPool: {
    depthM: 8,
    temperatureC: 19,
    oxygenMgL: 6.4,
    turbidity: "high",
    habitat: "submerged plants and woody debris",
    clue: "Warm, sheltered vegetation supports ambush predators and air-breathing bowfin.",
  },
  outerGloam: {
    depthM: 31,
    temperatureC: 8,
    oxygenMgL: 5.5,
    turbidity: "moderate",
    habitat: "cold rocky drop-off",
    clue: "Cold, darker water favours species with large eyes and efficient movement.",
  },
};

export const BEACH_WATER_READINGS: Record<SpotId, WaterReading> = {
  sunwardShoal: {
    depthM: 4,
    temperatureC: 20,
    oxygenMgL: 8,
    turbidity: "low",
    habitat: "sandy surf and estuary edge",
    clue: "Open sand and oxygenated shallows support schooling mullet, bream, and whiting.",
  },
  mosswaterPool: {
    depthM: 8,
    temperatureC: 19,
    oxygenMgL: 7.2,
    turbidity: "moderate",
    habitat: "sand, seagrass, and shallow reef",
    clue: "Mixed cover supports sand ambushers, algae grazers, and fast coastal schools.",
  },
  outerGloam: {
    depthM: 31,
    temperatureC: 16,
    oxygenMgL: 6.5,
    turbidity: "low",
    habitat: "rocky lighthouse reef and adjacent deep water",
    clue: "Deeper reef edges suit powerful pelagic fish and large coastal predators.",
  },
};

const WORLD_WATER_READINGS: Record<WorldId, Record<SpotId, WaterReading>> = {
  lake: WATER_READINGS,
  beach: BEACH_WATER_READINGS,
};

export const FISH_SCIENCE: Record<FishSpecies, FishScienceProfile> = {
  bluegill: {
    temperatureRangeC: [18, 27],
    minimumOxygenMgL: 5,
    habitat: "Warm vegetated shallows near docks and reeds",
    ecologicalRole: "Consumes insects and small crustaceans while feeding larger predators.",
    evidence: "Its broad pectoral fins support precise station keeping among plants.",
  },
  yellowPerch: {
    temperatureRangeC: [12, 24],
    minimumOxygenMgL: 5.5,
    habitat: "Nearshore schools over sand, gravel, and sparse plants",
    ecologicalRole: "Connects benthic insects and small fish to larger predators.",
    evidence: "Its schooling body plan supports steady, coordinated cruising near shore.",
  },
  emeraldShiner: {
    temperatureRangeC: [10, 24],
    minimumOxygenMgL: 5.5,
    habitat: "Open nearshore water beside harbors and river mouths",
    ecologicalRole: "Transfers energy from plankton to predators.",
    evidence: "Its narrow silver body suits quick burst-and-coast swimming in dense schools.",
  },
  northernPike: {
    temperatureRangeC: [8, 22],
    minimumOxygenMgL: 5,
    habitat: "Vegetated lake margins, river pools, and woody cover",
    ecologicalRole: "Ambush predator that limits smaller fish populations.",
    evidence: "Its long, rear-finned body holds nearly still before one explosive strike.",
  },
  largemouthBass: {
    temperatureRangeC: [18, 27],
    minimumOxygenMgL: 5,
    habitat: "Warm pools around submerged plants, logs, and dock structure",
    ecologicalRole: "Predates crayfish, insects, and smaller fishes.",
    evidence: "It alternates compact tail-powered bursts with energy-saving glides.",
  },
  bowfin: {
    temperatureRangeC: [18, 28],
    minimumOxygenMgL: 3,
    habitat: "Warm, slow vegetated backwaters with low dissolved oxygen",
    ecologicalRole: "Resilient predator of crayfish and smaller fishes.",
    evidence: "Its long dorsal ribbon fin undulates for slow, precise movement without body sway.",
  },
  lakeTrout: {
    temperatureRangeC: [4, 12],
    minimumOxygenMgL: 6,
    habitat: "Cold, oxygen-rich rocky water below the warm surface layer",
    ecologicalRole: "Slow-growing predator vulnerable to overfishing.",
    evidence: "Its trout-shaped body uses sustained posterior-body beats for efficient cruising.",
  },
  burbot: {
    temperatureRangeC: [2, 12],
    minimumOxygenMgL: 4,
    habitat: "Cold rocky or silty lake bottom",
    ecologicalRole: "Night-active bottom predator of invertebrates and fish.",
    evidence: "Its elongated body travels slowly near the bed with gentle whole-body waves.",
  },
  lakeSturgeon: {
    temperatureRangeC: [4, 18],
    minimumOxygenMgL: 5,
    habitat: "Bottom habitats of large lakes and connected rivers",
    ecologicalRole: "Long-lived benthic feeder with very slow population recovery.",
    evidence: "Its armored forebody stays steady while the broad tail powers slow bottom cruising.",
  },
  seaMullet: {
    temperatureRangeC: [12, 27], minimumOxygenMgL: 5,
    habitat: "Coastal shallows, estuaries, and surf-zone schools",
    ecologicalRole: "Schooling detritivore that links estuary productivity with coastal food webs.",
    evidence: "Its streamlined body and forked tail support steady, coordinated schooling near shore.",
  },
  yellowfinBream: {
    temperatureRangeC: [14, 25], minimumOxygenMgL: 5,
    habitat: "Estuaries, nearshore beaches, and rocky reef edges",
    ecologicalRole: "Omnivore that feeds on shellfish, worms, and small crustaceans.",
    evidence: "Its deep body and active pectoral fins suit close maneuvering around mixed coastal structure.",
  },
  sandWhiting: {
    temperatureRangeC: [16, 26], minimumOxygenMgL: 5.5,
    habitat: "Sandy bays, estuaries, seagrass margins, and water beyond the breakers",
    ecologicalRole: "Benthic feeder on worms, small crustaceans, and molluscs.",
    evidence: "Its slender body makes compact tail beats while cruising close above open sand.",
  },
  duskyFlathead: {
    temperatureRangeC: [14, 26], minimumOxygenMgL: 5,
    habitat: "Shallow sand and mud beside sheltered rocky reef",
    ecologicalRole: "Bottom ambush predator of fish and crustaceans.",
    evidence: "Its flattened head and camouflaged body stay nearly still before a short explosive strike.",
  },
  luderick: {
    temperatureRangeC: [14, 24], minimumOxygenMgL: 5.5,
    habitat: "Estuaries, seagrass, and shallow algae-covered rocky reef",
    ecologicalRole: "Important coastal grazer of algae and aquatic vegetation.",
    evidence: "Its deep body and pectoral sculling support controlled turns while grazing close to structure.",
  },
  easternAustralianSalmon: {
    temperatureRangeC: [12, 22], minimumOxygenMgL: 6,
    habitat: "Coastal schools over sand, with juveniles entering bays and estuaries",
    ecologicalRole: "Mobile predator of schooling fish and coastal invertebrates.",
    evidence: "Its powerful forked tail drives fast, coordinated open-water schooling.",
  },
  snapper: {
    temperatureRangeC: [12, 22], minimumOxygenMgL: 5.5,
    habitat: "Juvenile bays and estuaries, then deeper offshore rocky reefs",
    ecologicalRole: "Reef predator and benthic feeder on fish, crustaceans, and molluscs.",
    evidence: "Its robust body uses measured posterior beats to patrol reef margins efficiently.",
  },
  yellowtailKingfish: {
    temperatureRangeC: [16, 24], minimumOxygenMgL: 6,
    habitat: "Open water around rocky reefs and adjacent sand",
    ecologicalRole: "Fast pelagic predator of fish, squid, and crustaceans.",
    evidence: "Its narrow tail base and deeply forked tail produce swift rear-body-driven swimming.",
  },
  mulloway: {
    temperatureRangeC: [13, 24], minimumOxygenMgL: 5,
    habitat: "Shallow estuaries, coastal channels, and offshore reefs",
    ecologicalRole: "Large coastal predator of fish, prawns, and squid.",
    evidence: "Its long robust body cruises steadily, reserving stronger tail beats for a surge.",
  },
};

const SURVEY_CHOICES: Record<FishSpecies, readonly [FishSpecies, FishSpecies, FishSpecies]> = {
  bluegill: ["bluegill", "emeraldShiner", "lakeTrout"],
  yellowPerch: ["yellowPerch", "largemouthBass", "northernPike"],
  emeraldShiner: ["emeraldShiner", "largemouthBass", "yellowPerch"],
  northernPike: ["northernPike", "bluegill", "burbot"],
  largemouthBass: ["largemouthBass", "emeraldShiner", "lakeSturgeon"],
  bowfin: ["bowfin", "yellowPerch", "lakeTrout"],
  lakeTrout: ["lakeTrout", "yellowPerch", "bowfin"],
  burbot: ["burbot", "northernPike", "bluegill"],
  lakeSturgeon: ["lakeSturgeon", "bluegill", "northernPike"],
  seaMullet: ["seaMullet", "yellowfinBream", "sandWhiting"],
  yellowfinBream: ["yellowfinBream", "seaMullet", "luderick"],
  sandWhiting: ["sandWhiting", "yellowfinBream", "duskyFlathead"],
  duskyFlathead: ["duskyFlathead", "sandWhiting", "luderick"],
  luderick: ["luderick", "yellowfinBream", "easternAustralianSalmon"],
  easternAustralianSalmon: ["easternAustralianSalmon", "seaMullet", "yellowtailKingfish"],
  snapper: ["snapper", "mulloway", "yellowfinBream"],
  yellowtailKingfish: ["yellowtailKingfish", "easternAustralianSalmon", "mulloway"],
  mulloway: ["mulloway", "snapper", "duskyFlathead"],
};

export function surveyChoices(spotId: SpotId, researchTarget?: FishSpecies, world: WorldId = "lake"): readonly FishSpecies[] {
  return SURVEY_CHOICES[surveyTarget(spotId, researchTarget, world)];
}

export function evaluateSurvey(
  spotId: SpotId,
  prediction: FishSpecies,
  researchTarget?: FishSpecies,
  world: WorldId = "lake",
): SurveyResult {
  const reading = WORLD_WATER_READINGS[world][spotId];
  const expected = surveyTarget(spotId, researchTarget, world);
  const correct = prediction === expected;
  const profile = FISH_SCIENCE[expected];
  return {
    correct,
    expected,
    explanation: `${reading.temperatureC}°C water with ${reading.oxygenMgL.toFixed(1)} mg/L oxygen and ${reading.habitat} best matches the ${FISH[expected].name}. ${profile.evidence}`,
  };
}

export function estimateRoute(
  contract: Pick<Contract, "spot" | "destination">,
  engineTier: number,
): RouteEstimate {
  const origin = spotById(contract.spot);
  const destination = harborById(contract.destination);
  const distanceKm = Math.round(
    Math.abs(destination.x - origin.x) * BALANCE.routeDistanceScaleKm * 10,
  ) / 10;
  const engineFactor = engineSpeedMultiplier(engineTier);
  const safeSpeedKmPerMinute = BALANCE.maxSurfaceSpeed
    * BALANCE.safeRouteSpeedMultiplier
    * engineFactor
    * BALANCE.routeDistanceScaleKm;
  const fastSpeedKmPerMinute = BALANCE.maxSurfaceSpeed
    * BALANCE.fastRouteSpeedMultiplier
    * engineFactor
    * BALANCE.routeDistanceScaleKm;
  const safeMinutes = roundOne(distanceKm / safeSpeedKmPerMinute);
  const fastMinutes = roundOne(distanceKm / fastSpeedKmPerMinute);
  return {
    distanceKm,
    safeMinutes,
    fastMinutes,
    safeArrivalFreshness: Math.max(0, Math.round(100 - safeMinutes * BALANCE.routeFreshnessLossPerMinute)),
    fastArrivalFreshness: Math.max(0, Math.round(100 - fastMinutes * BALANCE.routeFreshnessLossPerMinute)),
  };
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function surveyTarget(spotId: SpotId, researchTarget: FishSpecies | undefined, world: WorldId): FishSpecies {
  const residents = WORLD_SPOT_RESIDENTS[world][spotId];
  if (researchTarget && residents.includes(researchTarget)) return researchTarget;
  return world === "lake" ? spotById(spotId).species : residents[0]!;
}
