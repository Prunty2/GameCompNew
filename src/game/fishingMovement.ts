import type { FishSpecies } from "./balance";

export interface FishingMovementProfile {
  cruise: number;
  speedVariance: number;
  burstStrength: number;
  burstFrequency: number;
  burstSharpness: number;
  turnFrequency: number;
  reverseChance: number;
  depthAmplitude: number;
  depthFrequency: number;
  jukeStrength: number;
  bodyFrequency: number;
  flexAmount: number;
}

export interface FishingSpeciesMotion {
  horizontalMultiplier: number;
  heading: -1 | 1;
  depthOffset: number;
  pitch: number;
  flex: number;
}

export const FISHING_MOVEMENT_PROFILES: Record<FishSpecies, FishingMovementProfile> = {
  reedfin: {
    cruise: 1.02, speedVariance: 0.26, burstStrength: 0.48, burstFrequency: 0.85, burstSharpness: 2,
    turnFrequency: 0.48, reverseChance: 0.22,
    depthAmplitude: 0.022, depthFrequency: 1.25, jukeStrength: 0.55, bodyFrequency: 3.4, flexAmount: 0.026,
  },
  sunPerch: {
    cruise: 0.82, speedVariance: 0.38, burstStrength: 1.15, burstFrequency: 1.35, burstSharpness: 5,
    turnFrequency: 0.8, reverseChance: 0.38,
    depthAmplitude: 0.04, depthFrequency: 2.1, jukeStrength: 1.15, bodyFrequency: 4.8, flexAmount: 0.038,
  },
  silverDart: {
    cruise: 1.35, speedVariance: 0.42, burstStrength: 1.65, burstFrequency: 1.8, burstSharpness: 8,
    turnFrequency: 1.05, reverseChance: 0.42,
    depthAmplitude: 0.023, depthFrequency: 2.8, jukeStrength: 1.35, bodyFrequency: 6.4, flexAmount: 0.022,
  },
  needlePike: {
    cruise: 1.42, speedVariance: 0.2, burstStrength: 0.62, burstFrequency: 0.62, burstSharpness: 4,
    turnFrequency: 0.34, reverseChance: 0.18,
    depthAmplitude: 0.013, depthFrequency: 0.7, jukeStrength: 0.4, bodyFrequency: 2.6, flexAmount: 0.014,
  },
  mossback: {
    cruise: 0.58, speedVariance: 0.18, burstStrength: 0.3, burstFrequency: 0.42, burstSharpness: 2,
    turnFrequency: 0.28, reverseChance: 0.16,
    depthAmplitude: 0.016, depthFrequency: 0.55, jukeStrength: 0.32, bodyFrequency: 1.8, flexAmount: 0.014,
  },
  lanternEel: {
    cruise: 1.02, speedVariance: 0.34, burstStrength: 0.72, burstFrequency: 1.05, burstSharpness: 3,
    turnFrequency: 0.62, reverseChance: 0.3,
    depthAmplitude: 0.06, depthFrequency: 2.05, jukeStrength: 0.9, bodyFrequency: 5.1, flexAmount: 0.052,
  },
  gloamGill: {
    cruise: 0.62, speedVariance: 0.46, burstStrength: 1.35, burstFrequency: 0.78, burstSharpness: 10,
    turnFrequency: 0.72, reverseChance: 0.4,
    depthAmplitude: 0.032, depthFrequency: 1.05, jukeStrength: 1.2, bodyFrequency: 4.2, flexAmount: 0.034,
  },
  violetRay: {
    cruise: 0.86, speedVariance: 0.24, burstStrength: 0.5, burstFrequency: 0.5, burstSharpness: 3,
    turnFrequency: 0.32, reverseChance: 0.2,
    depthAmplitude: 0.072, depthFrequency: 0.8, jukeStrength: 0.5, bodyFrequency: 2.25, flexAmount: 0.045,
  },
  abyssCrown: {
    cruise: 0.48, speedVariance: 0.3, burstStrength: 1.9, burstFrequency: 0.4, burstSharpness: 15,
    turnFrequency: 0.3, reverseChance: 0.3,
    depthAmplitude: 0.02, depthFrequency: 0.4, jukeStrength: 1, bodyFrequency: 1.55, flexAmount: 0.013,
  },
};

export function fishingSpeciesMotion(species: FishSpecies, elapsed: number, phase: number): FishingSpeciesMotion {
  const profile = FISHING_MOVEMENT_PROFILES[species];
  const speedNoise = valueNoise(elapsed * profile.burstFrequency * 0.63, phase + 5.7);
  const burstClock = elapsed * profile.burstFrequency + phase * 0.37;
  const burstIndex = Math.floor(burstClock);
  const burstProgress = burstClock - burstIndex;
  const burstRoll = hashUnit(burstIndex, phase + 13.1);
  const burstPulse = burstRoll > 0.34
    ? Math.sin(Math.PI * burstProgress) ** profile.burstSharpness * (0.45 + burstRoll * 0.55)
    : 0;
  const turnIndex = Math.floor(elapsed * profile.turnFrequency + phase * 0.23);
  const heading = hashUnit(turnIndex, phase + 31.7) < profile.reverseChance ? -1 : 1;
  const depthOffset = randomDepthOffset(profile, elapsed, phase);
  const sampleStep = 0.016;
  const depthSlope = (
    randomDepthOffset(profile, elapsed + sampleStep, phase)
    - randomDepthOffset(profile, elapsed - sampleStep, phase)
  ) / (sampleStep * 2);
  const flex = Math.sin(elapsed * profile.bodyFrequency + phase * 0.8 + speedNoise * 0.55);
  return {
    horizontalMultiplier: Math.max(0.16, profile.cruise * (1 + speedNoise * profile.speedVariance)
      + burstPulse * profile.burstStrength),
    heading,
    depthOffset,
    pitch: clamp(depthSlope * 1.35, -0.16, 0.16),
    flex,
  };
}

function randomDepthOffset(profile: FishingMovementProfile, elapsed: number, phase: number): number {
  const primaryWave = Math.sin(elapsed * profile.depthFrequency + phase) * profile.depthAmplitude;
  const wandering = valueNoise(elapsed * profile.depthFrequency * 0.72, phase + 19.3)
    * profile.depthAmplitude * 0.62;
  const jukeClock = elapsed * (profile.burstFrequency * 0.79 + 0.18) + phase * 0.51;
  const jukeIndex = Math.floor(jukeClock);
  const jukeProgress = jukeClock - jukeIndex;
  const jukeRoll = hashUnit(jukeIndex, phase + 47.9);
  const jukeDirection = hashUnit(jukeIndex, phase + 71.3) < 0.5 ? -1 : 1;
  const juke = jukeRoll > 0.48
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
