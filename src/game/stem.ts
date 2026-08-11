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
    depthM: 20,
    temperatureC: 12,
    oxygenMgL: 6.4,
    turbidity: "high",
    habitat: "submerged plants and woody debris",
    clue: "Dim vegetation provides camouflage and feeding surfaces for deep-bodied fish.",
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
  reedfin: {
    temperatureRangeC: [18, 24],
    minimumOxygenMgL: 7,
    habitat: "Sunlit reeds and sheltered shallows",
    ecologicalRole: "Eats small insects and is prey for larger fish.",
    evidence: "Its broad fins provide control around dense reeds.",
  },
  sunPerch: {
    temperatureRangeC: [19, 25],
    minimumOxygenMgL: 7.4,
    habitat: "Warm edges with plants and exposed roots",
    ecologicalRole: "Controls insect larvae near the surface.",
    evidence: "Its tall body turns quickly through vegetation.",
  },
  silverDart: {
    temperatureRangeC: [16, 21],
    minimumOxygenMgL: 7.5,
    habitat: "Clear open shelves where schools can accelerate",
    ecologicalRole: "Transfers energy from plankton to predators.",
    evidence: "Its narrow body reduces drag in open water.",
  },
  needlePike: {
    temperatureRangeC: [12, 18],
    minimumOxygenMgL: 6.5,
    habitat: "Cool current channels and drop-offs",
    ecologicalRole: "Ambush predator that limits smaller fish populations.",
    evidence: "Its pointed head and long body support sudden forward strikes.",
  },
  mossback: {
    temperatureRangeC: [9, 15],
    minimumOxygenMgL: 5.8,
    habitat: "Plant-covered deep pools and woody debris",
    ecologicalRole: "Consumes snails and organisms attached to plants.",
    evidence: "Its mottled hump resembles submerged vegetation.",
  },
  lanternEel: {
    temperatureRangeC: [8, 14],
    minimumOxygenMgL: 5.4,
    habitat: "Dim mid-water below dense plant cover",
    ecologicalRole: "Night predator of insects and juvenile fish.",
    evidence: "Its lure attracts prey where sunlight is weak.",
  },
  gloamGill: {
    temperatureRangeC: [5, 10],
    minimumOxygenMgL: 4.8,
    habitat: "Cold rocky walls in the outer lake",
    ecologicalRole: "Slow-growing predator vulnerable to overfishing.",
    evidence: "Large eyes collect more light in dark water.",
  },
  violetRay: {
    temperatureRangeC: [4, 8],
    minimumOxygenMgL: 4.5,
    habitat: "Cold silty floor below the main light zone",
    ecologicalRole: "Disturbs sediment and exposes food for other species.",
    evidence: "Wide fins let it glide efficiently close to the bottom.",
  },
  abyssCrown: {
    temperatureRangeC: [3, 7],
    minimumOxygenMgL: 4,
    habitat: "The deepest low-light trench",
    ecologicalRole: "Rare apex species with very slow population recovery.",
    evidence: "Armour and sensory organs compensate for cold, dark conditions.",
  },
};

const SURVEY_CHOICES: Record<FishSpecies, readonly [FishSpecies, FishSpecies, FishSpecies]> = {
  reedfin: ["reedfin", "silverDart", "gloamGill"],
  sunPerch: ["sunPerch", "mossback", "needlePike"],
  silverDart: ["silverDart", "mossback", "sunPerch"],
  needlePike: ["needlePike", "reedfin", "violetRay"],
  mossback: ["mossback", "silverDart", "abyssCrown"],
  lanternEel: ["lanternEel", "sunPerch", "gloamGill"],
  gloamGill: ["gloamGill", "sunPerch", "lanternEel"],
  violetRay: ["violetRay", "needlePike", "reedfin"],
  abyssCrown: ["abyssCrown", "reedfin", "needlePike"],
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

export function estimateRoute(contract: Contract, engineTier: number): RouteEstimate {
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
