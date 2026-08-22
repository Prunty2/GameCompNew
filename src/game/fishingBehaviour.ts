import type { FishSpecies } from "./balance";

export type FishingFightStyle =
  | "kick-glide"
  | "steady-school"
  | "schooling-sprint"
  | "ambush-surge"
  | "leaping-thrash"
  | "rolling-power"
  | "deep-sustained"
  | "bottom-writhe"
  | "bottom-power"
  | "schooling-run"
  | "cautious-pulse"
  | "sand-dive"
  | "reef-dive"
  | "power-dive"
  | "long-run";

export interface FishingSpeciesFightProfile {
  style: FishingFightStyle;
  cycleSeconds: number;
  runFraction: number;
  thrashFraction: number;
  runIntensity: number;
  thrashIntensity: number;
  runPower: number;
  thrashPower: number;
  reelResistance: number;
  endurance: number;
  recovery: number;
  runSlip: number;
  runSlack: number;
  horizontalRange: number;
  verticalRange: number;
  runDepthBias: number;
  pathFrequency: number;
  steeringResponse: number;
  motionDamping: number;
  maximumSpeed: number;
  wriggleFrequency: number;
  wriggleAmplitude: number;
}

// Research notes and sources for these gameplay translations live in
// Docs/Fish-Behaviour-Research.md. Values preserve each species' observed
// locomotor character while keeping every fight legible in the same input model.
export const FISHING_SPECIES_FIGHT_PROFILES: Record<FishSpecies, FishingSpeciesFightProfile> = {
  bluegill: {
    style: "kick-glide", cycleSeconds: 3.2, runFraction: 0.22, thrashFraction: 0.16,
    runIntensity: 0.62, thrashIntensity: 0.62, runPower: 0.78, thrashPower: 0.84,
    reelResistance: 0.86, endurance: 0.78, recovery: 0.9, runSlip: 0.76, runSlack: 1.08,
    horizontalRange: 0.055, verticalRange: 0.028, runDepthBias: 0.01,
    pathFrequency: 0.92, steeringResponse: 3.8, motionDamping: 5.2, maximumSpeed: 0.2,
    wriggleFrequency: 12, wriggleAmplitude: 0.12,
  },
  yellowPerch: {
    style: "steady-school", cycleSeconds: 3.55, runFraction: 0.2, thrashFraction: 0.13,
    runIntensity: 0.58, thrashIntensity: 0.5, runPower: 0.74, thrashPower: 0.76,
    reelResistance: 0.92, endurance: 0.86, recovery: 0.94, runSlip: 0.72, runSlack: 1.04,
    horizontalRange: 0.06, verticalRange: 0.018, runDepthBias: 0.018,
    pathFrequency: 0.68, steeringResponse: 3.25, motionDamping: 5.6, maximumSpeed: 0.18,
    wriggleFrequency: 10.5, wriggleAmplitude: 0.1,
  },
  emeraldShiner: {
    style: "schooling-sprint", cycleSeconds: 2.75, runFraction: 0.28, thrashFraction: 0.14,
    runIntensity: 0.84, thrashIntensity: 0.58, runPower: 0.88, thrashPower: 0.76,
    reelResistance: 0.82, endurance: 0.7, recovery: 1.02, runSlip: 0.92, runSlack: 1.18,
    horizontalRange: 0.085, verticalRange: 0.026, runDepthBias: -0.008,
    pathFrequency: 1.3, steeringResponse: 5.2, motionDamping: 6.2, maximumSpeed: 0.31,
    wriggleFrequency: 17, wriggleAmplitude: 0.11,
  },
  northernPike: {
    style: "ambush-surge", cycleSeconds: 4.8, runFraction: 0.2, thrashFraction: 0.1,
    runIntensity: 1, thrashIntensity: 0.64, runPower: 1.2, thrashPower: 0.92,
    reelResistance: 1.04, endurance: 1.12, recovery: 0.82, runSlip: 1.18, runSlack: 1.02,
    horizontalRange: 0.14, verticalRange: 0.025, runDepthBias: 0.006,
    pathFrequency: 0.48, steeringResponse: 5.5, motionDamping: 4.5, maximumSpeed: 0.38,
    wriggleFrequency: 8.5, wriggleAmplitude: 0.14,
  },
  largemouthBass: {
    style: "leaping-thrash", cycleSeconds: 3.5, runFraction: 0.24, thrashFraction: 0.24,
    runIntensity: 0.82, thrashIntensity: 1, runPower: 0.98, thrashPower: 1.18,
    reelResistance: 1.08, endurance: 1.02, recovery: 0.9, runSlip: 0.98, runSlack: 0.96,
    horizontalRange: 0.095, verticalRange: 0.09, runDepthBias: -0.045,
    pathFrequency: 0.82, steeringResponse: 4.8, motionDamping: 4.8, maximumSpeed: 0.34,
    wriggleFrequency: 16, wriggleAmplitude: 0.24,
  },
  bowfin: {
    style: "rolling-power", cycleSeconds: 4.1, runFraction: 0.22, thrashFraction: 0.25,
    runIntensity: 0.78, thrashIntensity: 0.94, runPower: 1.04, thrashPower: 1.2,
    reelResistance: 1.06, endurance: 0.98, recovery: 0.82, runSlip: 0.8, runSlack: 0.88,
    horizontalRange: 0.08, verticalRange: 0.055, runDepthBias: 0.022,
    pathFrequency: 0.64, steeringResponse: 3.7, motionDamping: 4.4, maximumSpeed: 0.25,
    wriggleFrequency: 13, wriggleAmplitude: 0.28,
  },
  lakeTrout: {
    style: "deep-sustained", cycleSeconds: 5.1, runFraction: 0.34, thrashFraction: 0.1,
    runIntensity: 0.88, thrashIntensity: 0.56, runPower: 1.08, thrashPower: 0.86,
    reelResistance: 1.1, endurance: 1.02, recovery: 0.86, runSlip: 0.9, runSlack: 0.9,
    horizontalRange: 0.125, verticalRange: 0.04, runDepthBias: 0.045,
    pathFrequency: 0.5, steeringResponse: 3.8, motionDamping: 4.6, maximumSpeed: 0.28,
    wriggleFrequency: 9, wriggleAmplitude: 0.14,
  },
  burbot: {
    style: "bottom-writhe", cycleSeconds: 4.6, runFraction: 0.17, thrashFraction: 0.3,
    runIntensity: 0.58, thrashIntensity: 0.9, runPower: 0.88, thrashPower: 1.14,
    reelResistance: 1.14, endurance: 1.02, recovery: 0.78, runSlip: 0.7, runSlack: 0.82,
    horizontalRange: 0.055, verticalRange: 0.035, runDepthBias: 0.06,
    pathFrequency: 0.48, steeringResponse: 3.1, motionDamping: 4.9, maximumSpeed: 0.19,
    wriggleFrequency: 11, wriggleAmplitude: 0.3,
  },
  lakeSturgeon: {
    style: "bottom-power", cycleSeconds: 6.2, runFraction: 0.38, thrashFraction: 0.08,
    runIntensity: 0.94, thrashIntensity: 0.48, runPower: 1.28, thrashPower: 0.96,
    reelResistance: 1.12, endurance: 1, recovery: 0.72, runSlip: 0.56, runSlack: 0.76,
    horizontalRange: 0.145, verticalRange: 0.024, runDepthBias: 0.075,
    pathFrequency: 0.34, steeringResponse: 2.65, motionDamping: 4.2, maximumSpeed: 0.24,
    wriggleFrequency: 6.8, wriggleAmplitude: 0.16,
  },
  seaMullet: {
    style: "schooling-run", cycleSeconds: 3.1, runFraction: 0.3, thrashFraction: 0.13,
    runIntensity: 0.82, thrashIntensity: 0.58, runPower: 0.9, thrashPower: 0.8,
    reelResistance: 0.88, endurance: 0.84, recovery: 0.98, runSlip: 1.02, runSlack: 1.12,
    horizontalRange: 0.1, verticalRange: 0.035, runDepthBias: -0.018,
    pathFrequency: 1.04, steeringResponse: 4.9, motionDamping: 5.8, maximumSpeed: 0.32,
    wriggleFrequency: 15, wriggleAmplitude: 0.12,
  },
  yellowfinBream: {
    style: "cautious-pulse", cycleSeconds: 3.7, runFraction: 0.22, thrashFraction: 0.19,
    runIntensity: 0.7, thrashIntensity: 0.76, runPower: 0.86, thrashPower: 0.96,
    reelResistance: 1, endurance: 0.98, recovery: 0.92, runSlip: 0.84, runSlack: 0.98,
    horizontalRange: 0.07, verticalRange: 0.035, runDepthBias: 0.018,
    pathFrequency: 0.78, steeringResponse: 3.9, motionDamping: 5.1, maximumSpeed: 0.23,
    wriggleFrequency: 12.5, wriggleAmplitude: 0.16,
  },
  sandWhiting: {
    style: "sand-dive", cycleSeconds: 3.35, runFraction: 0.24, thrashFraction: 0.13,
    runIntensity: 0.72, thrashIntensity: 0.54, runPower: 0.84, thrashPower: 0.78,
    reelResistance: 0.9, endurance: 0.82, recovery: 0.96, runSlip: 0.88, runSlack: 1.06,
    horizontalRange: 0.078, verticalRange: 0.045, runDepthBias: 0.05,
    pathFrequency: 0.86, steeringResponse: 4.3, motionDamping: 5.4, maximumSpeed: 0.25,
    wriggleFrequency: 14, wriggleAmplitude: 0.11,
  },
  duskyFlathead: {
    style: "ambush-surge", cycleSeconds: 5, runFraction: 0.18, thrashFraction: 0.11,
    runIntensity: 1, thrashIntensity: 0.66, runPower: 1.18, thrashPower: 0.92,
    reelResistance: 1.08, endurance: 1.18, recovery: 0.8, runSlip: 1.12, runSlack: 0.94,
    horizontalRange: 0.135, verticalRange: 0.03, runDepthBias: 0.07,
    pathFrequency: 0.42, steeringResponse: 5.2, motionDamping: 4.6, maximumSpeed: 0.36,
    wriggleFrequency: 8, wriggleAmplitude: 0.16,
  },
  luderick: {
    style: "rolling-power", cycleSeconds: 4.25, runFraction: 0.32, thrashFraction: 0.23,
    runIntensity: 0.84, thrashIntensity: 0.88, runPower: 1.04, thrashPower: 1.12,
    reelResistance: 1.05, endurance: 1, recovery: 0.84, runSlip: 0.88, runSlack: 0.9,
    horizontalRange: 0.105, verticalRange: 0.055, runDepthBias: 0.018,
    pathFrequency: 0.66, steeringResponse: 3.8, motionDamping: 4.6, maximumSpeed: 0.27,
    wriggleFrequency: 12, wriggleAmplitude: 0.27,
  },
  easternAustralianSalmon: {
    style: "schooling-sprint", cycleSeconds: 3.65, runFraction: 0.39, thrashFraction: 0.16,
    runIntensity: 0.96, thrashIntensity: 0.82, runPower: 1.14, thrashPower: 1.02,
    reelResistance: 1.08, endurance: 1.04, recovery: 0.86, runSlip: 0.88, runSlack: 0.9,
    horizontalRange: 0.145, verticalRange: 0.065, runDepthBias: -0.035,
    pathFrequency: 1.16, steeringResponse: 5.1, motionDamping: 5.2, maximumSpeed: 0.4,
    wriggleFrequency: 18, wriggleAmplitude: 0.2,
  },
  snapper: {
    style: "reef-dive", cycleSeconds: 4.7, runFraction: 0.34, thrashFraction: 0.14,
    runIntensity: 0.9, thrashIntensity: 0.7, runPower: 1.16, thrashPower: 0.96,
    reelResistance: 1.1, endurance: 1.05, recovery: 0.82, runSlip: 0.88, runSlack: 0.84,
    horizontalRange: 0.105, verticalRange: 0.07, runDepthBias: 0.08,
    pathFrequency: 0.58, steeringResponse: 4.1, motionDamping: 4.7, maximumSpeed: 0.3,
    wriggleFrequency: 10, wriggleAmplitude: 0.17,
  },
  yellowtailKingfish: {
    style: "power-dive", cycleSeconds: 5.2, runFraction: 0.42, thrashFraction: 0.11,
    runIntensity: 1, thrashIntensity: 0.7, runPower: 1.34, thrashPower: 1.02,
    reelResistance: 1.2, endurance: 1.18, recovery: 0.78, runSlip: 0.86, runSlack: 0.76,
    horizontalRange: 0.15, verticalRange: 0.085, runDepthBias: 0.1,
    pathFrequency: 0.72, steeringResponse: 4.6, motionDamping: 4.4, maximumSpeed: 0.42,
    wriggleFrequency: 13, wriggleAmplitude: 0.2,
  },
  mulloway: {
    style: "long-run", cycleSeconds: 6.5, runFraction: 0.44, thrashFraction: 0.09,
    runIntensity: 0.96, thrashIntensity: 0.58, runPower: 1.32, thrashPower: 0.94,
    reelResistance: 1.14, endurance: 1.05, recovery: 0.72, runSlip: 0.54, runSlack: 0.72,
    horizontalRange: 0.16, verticalRange: 0.05, runDepthBias: 0.06,
    pathFrequency: 0.38, steeringResponse: 3.1, motionDamping: 4, maximumSpeed: 0.31,
    wriggleFrequency: 7.2, wriggleAmplitude: 0.18,
  },
};
