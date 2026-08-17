import {
  BALANCE,
  FISH,
  SPOT_RESIDENTS,
  engineSpeedMultiplier,
  harborById,
  spotById,
  type FishSpecies,
  type SpotId,
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
};

export function surveyChoices(spotId: SpotId, researchTarget?: FishSpecies): readonly FishSpecies[] {
  return SURVEY_CHOICES[surveyTarget(spotId, researchTarget)];
}

export function evaluateSurvey(
  spotId: SpotId,
  prediction: FishSpecies,
  researchTarget?: FishSpecies,
): SurveyResult {
  const reading = WATER_READINGS[spotId];
  const expected = surveyTarget(spotId, researchTarget);
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

function surveyTarget(spotId: SpotId, researchTarget?: FishSpecies): FishSpecies {
  if (researchTarget && SPOT_RESIDENTS[spotId].includes(researchTarget)) return researchTarget;
  return spotById(spotId).species;
}
