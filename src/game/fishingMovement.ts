import type { FishSpecies } from "./balance";

export type FishLocomotorGait = "pectoral" | "subcarangiform" | "carangiform" | "amiiform" | "anguilliform";

export interface FishingMovementProfile {
  gait: FishLocomotorGait;
  cruise: number;
  speedVariance: number;
  burstStrength: number;
  burstFrequency: number;
  burstChance: number;
  burstSharpness: number;
  turnFrequency: number;
  reverseChance: number;
  turnEase: number;
  depthAmplitude: number;
  depthFrequency: number;
  jukeStrength: number;
  jukeChance: number;
  bodyFrequency: number;
  flexAmount: number;
}

export interface FishingSpeciesMotion {
  horizontalMultiplier: number;
  heading: -1 | 1;
  depthOffset: number;
  pitch: number;
  flex: number;
  propulsion: number;
}

// Profiles translate observed locomotor strategies into readable deterministic gameplay.
// Speeds are relative to each spawned fish's base speed; depths are normalized fishing-view units.
export const FISHING_MOVEMENT_PROFILES: Record<FishSpecies, FishingMovementProfile> = {
  bluegill: {
    gait: "pectoral", cruise: 0.48, speedVariance: 0.12, burstStrength: 0.62,
    burstFrequency: 0.72, burstChance: 0.55, burstSharpness: 4,
    turnFrequency: 0.34, reverseChance: 0.42, turnEase: 0.18,
    depthAmplitude: 0.018, depthFrequency: 0.72, jukeStrength: 0.34, jukeChance: 0.28,
    bodyFrequency: 3.2, flexAmount: 0.018,
  },
  yellowPerch: {
    gait: "subcarangiform", cruise: 0.86, speedVariance: 0.1, burstStrength: 0.38,
    burstFrequency: 0.62, burstChance: 0.42, burstSharpness: 3,
    turnFrequency: 0.24, reverseChance: 0.34, turnEase: 0.15,
    depthAmplitude: 0.024, depthFrequency: 0.5, jukeStrength: 0.24, jukeChance: 0.2,
    bodyFrequency: 4.1, flexAmount: 0.028,
  },
  emeraldShiner: {
    gait: "carangiform", cruise: 1.15, speedVariance: 0.16, burstStrength: 1.18,
    burstFrequency: 1.15, burstChance: 0.68, burstSharpness: 5,
    turnFrequency: 0.42, reverseChance: 0.38, turnEase: 0.12,
    depthAmplitude: 0.019, depthFrequency: 0.9, jukeStrength: 0.45, jukeChance: 0.38,
    bodyFrequency: 6.2, flexAmount: 0.024,
  },
  whiteSucker: {
    gait: "subcarangiform", cruise: 0.45, speedVariance: 0.06, burstStrength: 0.18,
    burstFrequency: 0.28, burstChance: 0.22, burstSharpness: 4,
    turnFrequency: 0.16, reverseChance: 0.32, turnEase: 0.22,
    depthAmplitude: 0.006, depthFrequency: 0.25, jukeStrength: 0.04, jukeChance: 0.08,
    bodyFrequency: 2.2, flexAmount: 0.018,
  },
  northernPike: {
    gait: "subcarangiform", cruise: 0.12, speedVariance: 0.08, burstStrength: 3.1,
    burstFrequency: 0.28, burstChance: 0.38, burstSharpness: 10,
    turnFrequency: 0.14, reverseChance: 0.28, turnEase: 0.22,
    depthAmplitude: 0.009, depthFrequency: 0.3, jukeStrength: 0.12, jukeChance: 0.12,
    bodyFrequency: 2.8, flexAmount: 0.016,
  },
  largemouthBass: {
    gait: "subcarangiform", cruise: 0.42, speedVariance: 0.12, burstStrength: 1.12,
    burstFrequency: 0.62, burstChance: 0.62, burstSharpness: 5,
    turnFrequency: 0.26, reverseChance: 0.36, turnEase: 0.18,
    depthAmplitude: 0.015, depthFrequency: 0.46, jukeStrength: 0.28, jukeChance: 0.22,
    bodyFrequency: 4.4, flexAmount: 0.03,
  },
  bowfin: {
    gait: "amiiform", cruise: 0.52, speedVariance: 0.09, burstStrength: 0.48,
    burstFrequency: 0.44, burstChance: 0.42, burstSharpness: 4,
    turnFrequency: 0.3, reverseChance: 0.46, turnEase: 0.2,
    depthAmplitude: 0.021, depthFrequency: 0.58, jukeStrength: 0.18, jukeChance: 0.18,
    bodyFrequency: 5.2, flexAmount: 0.014,
  },
  lakeTrout: {
    gait: "subcarangiform", cruise: 1.04, speedVariance: 0.08, burstStrength: 0.32,
    burstFrequency: 0.36, burstChance: 0.36, burstSharpness: 3,
    turnFrequency: 0.16, reverseChance: 0.3, turnEase: 0.14,
    depthAmplitude: 0.027, depthFrequency: 0.36, jukeStrength: 0.14, jukeChance: 0.12,
    bodyFrequency: 3.8, flexAmount: 0.026,
  },
  burbot: {
    gait: "anguilliform", cruise: 0.38, speedVariance: 0.1, burstStrength: 0.34,
    burstFrequency: 0.34, burstChance: 0.34, burstSharpness: 4,
    turnFrequency: 0.2, reverseChance: 0.4, turnEase: 0.22,
    depthAmplitude: 0.012, depthFrequency: 0.42, jukeStrength: 0.12, jukeChance: 0.12,
    bodyFrequency: 2.5, flexAmount: 0.04,
  },
  lakeSturgeon: {
    gait: "subcarangiform", cruise: 0.58, speedVariance: 0.05, burstStrength: 0.12,
    burstFrequency: 0.2, burstChance: 0.2, burstSharpness: 3,
    turnFrequency: 0.11, reverseChance: 0.3, turnEase: 0.25,
    depthAmplitude: 0.008, depthFrequency: 0.24, jukeStrength: 0, jukeChance: 0,
    bodyFrequency: 1.8, flexAmount: 0.018,
  },
  seaMullet: {
    gait: "subcarangiform", cruise: 1.05, speedVariance: 0.12, burstStrength: 0.9,
    burstFrequency: 0.95, burstChance: 0.54, burstSharpness: 5,
    turnFrequency: 0.34, reverseChance: 0.35, turnEase: 0.13,
    depthAmplitude: 0.016, depthFrequency: 0.8, jukeStrength: 0.34, jukeChance: 0.25,
    bodyFrequency: 5.8, flexAmount: 0.025,
  },
  yellowfinBream: {
    gait: "pectoral", cruise: 0.55, speedVariance: 0.1, burstStrength: 0.54,
    burstFrequency: 0.58, burstChance: 0.45, burstSharpness: 4,
    turnFrequency: 0.36, reverseChance: 0.43, turnEase: 0.2,
    depthAmplitude: 0.02, depthFrequency: 0.55, jukeStrength: 0.26, jukeChance: 0.22,
    bodyFrequency: 3.4, flexAmount: 0.019,
  },
  sandWhiting: {
    gait: "subcarangiform", cruise: 0.9, speedVariance: 0.11, burstStrength: 0.52,
    burstFrequency: 0.72, burstChance: 0.46, burstSharpness: 4,
    turnFrequency: 0.24, reverseChance: 0.34, turnEase: 0.15,
    depthAmplitude: 0.011, depthFrequency: 0.42, jukeStrength: 0.2, jukeChance: 0.17,
    bodyFrequency: 4.9, flexAmount: 0.028,
  },
  duskyFlathead: {
    gait: "subcarangiform", cruise: 0.1, speedVariance: 0.07, burstStrength: 3.2,
    burstFrequency: 0.25, burstChance: 0.34, burstSharpness: 10,
    turnFrequency: 0.13, reverseChance: 0.27, turnEase: 0.24,
    depthAmplitude: 0.006, depthFrequency: 0.25, jukeStrength: 0.08, jukeChance: 0.08,
    bodyFrequency: 2.6, flexAmount: 0.015,
  },
  luderick: {
    gait: "pectoral", cruise: 0.48, speedVariance: 0.08, burstStrength: 0.42,
    burstFrequency: 0.45, burstChance: 0.36, burstSharpness: 4,
    turnFrequency: 0.32, reverseChance: 0.45, turnEase: 0.21,
    depthAmplitude: 0.017, depthFrequency: 0.48, jukeStrength: 0.16, jukeChance: 0.15,
    bodyFrequency: 3.1, flexAmount: 0.017,
  },
  easternAustralianSalmon: {
    gait: "carangiform", cruise: 1.22, speedVariance: 0.13, burstStrength: 1.18,
    burstFrequency: 1.08, burstChance: 0.64, burstSharpness: 5,
    turnFrequency: 0.36, reverseChance: 0.32, turnEase: 0.12,
    depthAmplitude: 0.022, depthFrequency: 0.75, jukeStrength: 0.38, jukeChance: 0.31,
    bodyFrequency: 6.2, flexAmount: 0.025,
  },
  snapper: {
    gait: "subcarangiform", cruise: 0.62, speedVariance: 0.08, burstStrength: 0.65,
    burstFrequency: 0.48, burstChance: 0.4, burstSharpness: 4,
    turnFrequency: 0.2, reverseChance: 0.31, turnEase: 0.17,
    depthAmplitude: 0.018, depthFrequency: 0.38, jukeStrength: 0.14, jukeChance: 0.13,
    bodyFrequency: 3.7, flexAmount: 0.026,
  },
  yellowtailKingfish: {
    gait: "carangiform", cruise: 1.35, speedVariance: 0.14, burstStrength: 1.8,
    burstFrequency: 0.82, burstChance: 0.6, burstSharpness: 6,
    turnFrequency: 0.3, reverseChance: 0.27, turnEase: 0.11,
    depthAmplitude: 0.02, depthFrequency: 0.64, jukeStrength: 0.42, jukeChance: 0.32,
    bodyFrequency: 6.8, flexAmount: 0.027,
  },
  mulloway: {
    gait: "subcarangiform", cruise: 0.42, speedVariance: 0.07, burstStrength: 1.08,
    burstFrequency: 0.32, burstChance: 0.32, burstSharpness: 6,
    turnFrequency: 0.14, reverseChance: 0.3, turnEase: 0.22,
    depthAmplitude: 0.012, depthFrequency: 0.31, jukeStrength: 0.1, jukeChance: 0.1,
    bodyFrequency: 3.2, flexAmount: 0.022,
  },
};

export function fishingSpeciesMotion(species: FishSpecies, elapsed: number, phase: number): FishingSpeciesMotion {
  const profile = FISHING_MOVEMENT_PROFILES[species];
  const speedNoise = valueNoise(elapsed * profile.burstFrequency * 0.42, phase + 5.7);
  const burstClock = elapsed * profile.burstFrequency + phase * 0.37;
  const burstIndex = Math.floor(burstClock);
  const burstProgress = burstClock - burstIndex;
  const burstRoll = hashUnit(burstIndex, phase + 13.1);
  const burstPulse = burstRoll > 1 - profile.burstChance
    ? Math.sin(Math.PI * burstProgress) ** profile.burstSharpness * (0.6 + burstRoll * 0.4)
    : 0;
  const turn = turnMotion(profile, elapsed, phase);
  const unturnedSpeed = Math.max(0.04, profile.cruise * (1 + speedNoise * profile.speedVariance)
    + burstPulse * profile.burstStrength);
  const horizontalMultiplier = unturnedSpeed * turn.speedScale;
  const depthOffset = naturalDepthOffset(profile, elapsed, phase);
  const sampleStep = 0.016;
  const depthSlope = (
    naturalDepthOffset(profile, elapsed + sampleStep, phase)
    - naturalDepthOffset(profile, elapsed - sampleStep, phase)
  ) / (sampleStep * 2);
  const propulsion = clamp(
    horizontalMultiplier / Math.max(0.1, profile.cruise + profile.burstStrength * 0.3),
    0,
    1,
  );
  const flex = Math.sin(elapsed * profile.bodyFrequency + phase * 0.8) * propulsion;
  return {
    horizontalMultiplier,
    heading: turn.heading,
    depthOffset,
    pitch: clamp(depthSlope * 1.05, -0.11, 0.11),
    flex,
    propulsion,
  };
}

function turnMotion(
  profile: FishingMovementProfile,
  elapsed: number,
  phase: number,
): { heading: -1 | 1; speedScale: number } {
  const clock = elapsed * profile.turnFrequency + phase * 0.23;
  const segment = Math.floor(clock);
  const progress = clock - segment;
  const heading = headingForSegment(segment, phase, profile.reverseChance);
  const previous = headingForSegment(segment - 1, phase, profile.reverseChance);
  const next = headingForSegment(segment + 1, phase, profile.reverseChance);
  const fromTurn = previous === heading ? 1 : smoothstep(clamp(progress / profile.turnEase, 0, 1));
  const toTurn = next === heading ? 1 : smoothstep(clamp((1 - progress) / profile.turnEase, 0, 1));
  return { heading, speedScale: Math.max(0.04, Math.min(fromTurn, toTurn)) };
}

function headingForSegment(segment: number, phase: number, reverseChance: number): -1 | 1 {
  return hashUnit(segment, phase + 31.7) < reverseChance ? -1 : 1;
}

function naturalDepthOffset(profile: FishingMovementProfile, elapsed: number, phase: number): number {
  const primaryWave = Math.sin(elapsed * profile.depthFrequency + phase) * profile.depthAmplitude;
  const wandering = valueNoise(elapsed * profile.depthFrequency * 0.38, phase + 19.3)
    * profile.depthAmplitude * 0.45;
  const jukeClock = elapsed * (profile.burstFrequency * 0.58 + 0.08) + phase * 0.51;
  const jukeIndex = Math.floor(jukeClock);
  const jukeProgress = jukeClock - jukeIndex;
  const jukeRoll = hashUnit(jukeIndex, phase + 47.9);
  const jukeDirection = hashUnit(jukeIndex, phase + 71.3) < 0.5 ? -1 : 1;
  const juke = jukeRoll > 1 - profile.jukeChance
    ? Math.sin(Math.PI * jukeProgress) ** 4 * profile.depthAmplitude * profile.jukeStrength * jukeDirection
    : 0;
  return primaryWave + wandering + juke;
}

function valueNoise(value: number, seed: number): number {
  const index = Math.floor(value);
  const blend = value - index;
  const smoothBlend = blend * blend * (3 - blend * 2);
  const start = hashUnit(index, seed) * 2 - 1;
  const end = hashUnit(index + 1, seed) * 2 - 1;
  return start + (end - start) * smoothBlend;
}

function hashUnit(index: number, seed: number): number {
  const value = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
