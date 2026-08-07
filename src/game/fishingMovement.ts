import type { FishSpecies } from "./balance";

export interface FishingMovementProfile {
  cruise: number;
  burstStrength: number;
  burstFrequency: number;
  burstSharpness: number;
  depthAmplitude: number;
  depthFrequency: number;
  bodyFrequency: number;
  flexAmount: number;
}

export interface FishingSpeciesMotion {
  horizontalMultiplier: number;
  depthOffset: number;
  pitch: number;
  flex: number;
}

export const FISHING_MOVEMENT_PROFILES: Record<FishSpecies, FishingMovementProfile> = {
  reedfin: {
    cruise: 0.72, burstStrength: 0.18, burstFrequency: 0.65, burstSharpness: 2,
    depthAmplitude: 0.018, depthFrequency: 1.1, bodyFrequency: 2.8, flexAmount: 0.022,
  },
  sunPerch: {
    cruise: 0.38, burstStrength: 0.72, burstFrequency: 1.05, burstSharpness: 6,
    depthAmplitude: 0.032, depthFrequency: 1.8, bodyFrequency: 3.6, flexAmount: 0.032,
  },
  silverDart: {
    cruise: 0.9, burstStrength: 1.2, burstFrequency: 1.4, burstSharpness: 10,
    depthAmplitude: 0.015, depthFrequency: 2.4, bodyFrequency: 5.2, flexAmount: 0.018,
  },
  needlePike: {
    cruise: 1, burstStrength: 0.3, burstFrequency: 0.45, burstSharpness: 4,
    depthAmplitude: 0.009, depthFrequency: 0.55, bodyFrequency: 2.1, flexAmount: 0.012,
  },
  mossback: {
    cruise: 0.32, burstStrength: 0.15, burstFrequency: 0.3, burstSharpness: 2,
    depthAmplitude: 0.012, depthFrequency: 0.45, bodyFrequency: 1.4, flexAmount: 0.012,
  },
  lanternEel: {
    cruise: 0.62, burstStrength: 0.32, burstFrequency: 0.7, burstSharpness: 3,
    depthAmplitude: 0.05, depthFrequency: 1.7, bodyFrequency: 4.2, flexAmount: 0.045,
  },
  gloamGill: {
    cruise: 0.22, burstStrength: 0.9, burstFrequency: 0.55, burstSharpness: 12,
    depthAmplitude: 0.024, depthFrequency: 0.8, bodyFrequency: 3.2, flexAmount: 0.028,
  },
  violetRay: {
    cruise: 0.5, burstStrength: 0.2, burstFrequency: 0.35, burstSharpness: 3,
    depthAmplitude: 0.06, depthFrequency: 0.65, bodyFrequency: 1.8, flexAmount: 0.04,
  },
  abyssCrown: {
    cruise: 0.18, burstStrength: 1.4, burstFrequency: 0.28, burstSharpness: 18,
    depthAmplitude: 0.015, depthFrequency: 0.3, bodyFrequency: 1.1, flexAmount: 0.01,
  },
};

export function fishingSpeciesMotion(species: FishSpecies, elapsed: number, phase: number): FishingSpeciesMotion {
  const profile = FISHING_MOVEMENT_PROFILES[species];
  const burstWave = Math.max(0, Math.sin(elapsed * profile.burstFrequency + phase));
  const burst = burstWave ** profile.burstSharpness;
  const primaryDepthPhase = elapsed * profile.depthFrequency + phase;
  const secondaryDepthPhase = elapsed * profile.depthFrequency * 0.47 + phase * 1.7;
  const depthOffset = Math.sin(primaryDepthPhase) * profile.depthAmplitude
    + Math.sin(secondaryDepthPhase) * profile.depthAmplitude * 0.35;
  const depthSlope = Math.cos(primaryDepthPhase) * profile.depthAmplitude * profile.depthFrequency
    + Math.cos(secondaryDepthPhase) * profile.depthAmplitude * profile.depthFrequency * 0.1645;
  const flex = Math.sin(elapsed * profile.bodyFrequency + phase * 0.8);
  return {
    horizontalMultiplier: profile.cruise + burst * profile.burstStrength,
    depthOffset,
    pitch: clamp(depthSlope * 1.8, -0.09, 0.09),
    flex,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
