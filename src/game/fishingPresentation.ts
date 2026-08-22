import {
  BALANCE,
  residentsForSpot,
  type FishRarity,
  type FishSpecies,
  type SpotId,
  type WorldId,
  type WorldPoint,
} from "./balance";
import { FISHING_MOVEMENT_PROFILES, fishingSpeciesMotion } from "./fishingMovement";

export interface FishingViewLayout {
  surfaceY: number;
  underwaterHeight: number;
  lineLimitY: number;
  lineLimitRatio: number;
}

export interface FishingFishPose {
  animationFrame: number;
  verticalOffsetRatio: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  heading: -1 | 1;
}

export interface FishingFocusPresentation {
  backgroundFishOpacity: number;
  backgroundPoseElapsed: number;
  showTargetGuides: boolean;
}

export interface FishingLineAppearance {
  colour: string;
  width: number;
}

const LINE_COLOUR_SAFE = "#f4e2b9";
const LINE_COLOUR_WARN = "#e8a44d";
const LINE_COLOUR_CRITICAL = "#e45a3a";
const LINE_COLOUR_PEAK = "#ff8a6a";
const LINE_COLOUR_HIGH_CONTRAST_SAFE = "#ffffff";
const LINE_COLOUR_HIGH_CONTRAST_WARN = "#ffe08a";
const LINE_COLOUR_HIGH_CONTRAST_CRITICAL = "#ff6240";

export const FISHING_DIVE_DURATION = 0.85;

export const FISHING_RARITY_COLOURS: Record<FishRarity, string> = {
  common: "#f4e6c5",
  uncommon: "#79b99e",
  rare: "#e8a44d",
  legendary: "#9a82bd",
};

export const FISHING_ENVIRONMENT_KEYS: Record<SpotId, string> = {
  sunwardShoal: "fishing-sunward-shoal",
  mosswaterPool: "fishing-mosswater-pool",
  outerGloam: "fishing-outer-gloam",
};

export function fishingDiveProgress(elapsed: number, startedAt: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  const linear = clamp((elapsed - startedAt) / FISHING_DIVE_DURATION, 0, 1);
  return 1 - (1 - linear) ** 3;
}

export function fishingReelCameraProgress(
  diveProgress: number,
  reelProgress: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;
  return clamp(diveProgress, 0, 1) * (1 - clamp(reelProgress, 0, 1));
}

export function fishingFocusPresentation(
  elapsed: number,
  schoolOpacity: number,
  hookedAt: number | null,
): FishingFocusPresentation {
  const fightActive = hookedAt !== null;
  return {
    backgroundFishOpacity: clamp(schoolOpacity, 0, 1) * (fightActive ? 0.68 : 1),
    backgroundPoseElapsed: fightActive ? hookedAt : elapsed,
    showTargetGuides: !fightActive,
  };
}

export function fishingViewLayout(height: number, lineTier: number, diveProgress: number): FishingViewLayout {
  const settledSurfaceY = height * 0.31;
  const sailingSurfaceY = height * 0.78;
  const surfaceY = sailingSurfaceY + (settledSurfaceY - sailingSurfaceY) * clamp(diveProgress, 0, 1);
  const underwaterHeight = Math.max(1, height - surfaceY);
  const lineLimitRatio = Math.min(0.92, 0.67 + Math.max(0, lineTier) * 0.045);
  return {
    surfaceY,
    underwaterHeight,
    lineLimitY: surfaceY + underwaterHeight * lineLimitRatio,
    lineLimitRatio,
  };
}

export function fishingFishPose(
  species: FishSpecies,
  elapsed: number,
  phase: number,
  reducedMotion: boolean,
): FishingFishPose {
  if (reducedMotion) {
    const motion = fishingSpeciesMotion(species, elapsed, phase);
    return { animationFrame: 0, verticalOffsetRatio: 0, rotation: 0, scaleX: 1, scaleY: 1, heading: motion.heading };
  }
  const profile = FISHING_MOVEMENT_PROFILES[species];
  const motion = fishingSpeciesMotion(species, elapsed, phase);
  const framePhase = ((elapsed * profile.bodyFrequency + phase * 0.8) / (Math.PI * 2)) % 1;
  const animationFrame = motion.propulsion < 0.16
    ? 0
    : Math.floor((framePhase < 0 ? framePhase + 1 : framePhase) * 4) % 4;
  return {
    animationFrame,
    verticalOffsetRatio: motion.flex * profile.flexAmount * 0.08,
    rotation: motion.pitch,
    scaleX: 1 + motion.flex * profile.flexAmount,
    scaleY: 1 - motion.flex * profile.flexAmount * 0.62,
    heading: motion.heading,
  };
}

export function fishingPointToScreen(
  point: WorldPoint,
  width: number,
  layout: FishingViewLayout,
  maximumDepth: number,
): WorldPoint {
  const topRatio = 0.08;
  const bottomRatio = 0.96;
  const safeMaximum = Math.max(0.08, maximumDepth);
  const depthRatio = point.y <= safeMaximum
    ? topRatio + (point.y / safeMaximum) * (layout.lineLimitRatio - topRatio)
    : layout.lineLimitRatio
      + ((point.y - safeMaximum) / Math.max(0.01, 0.94 - safeMaximum))
        * (bottomRatio - layout.lineLimitRatio);
  return {
    x: point.x * width,
    y: layout.surfaceY + layout.underwaterHeight * clamp(depthRatio, topRatio, bottomRatio),
  };
}

export function targetRarity(species: FishSpecies, rarity: FishRarity): { species: FishSpecies; colour: string } {
  return { species, colour: FISHING_RARITY_COLOURS[rarity] };
}

export function fishingHighlightSpecies(
  marketTarget: FishSpecies | null,
  world: WorldId,
  spotId: SpotId,
): FishSpecies | null {
  if (!marketTarget) return null;
  return residentsForSpot(world, spotId).includes(marketTarget) ? marketTarget : null;
}

export function fishingLineAppearance(tension: number, highContrast: boolean): FishingLineAppearance {
  const amount = clamp(tension, 0, 1);
  const warnAt = 0.55;
  const criticalAt = BALANCE.fishingCriticalTension;
  const colour = highContrast
    ? amount >= criticalAt
      ? mixHex(LINE_COLOUR_HIGH_CONTRAST_CRITICAL, "#ffd0c4", (amount - criticalAt) / Math.max(0.01, 1 - criticalAt))
      : amount >= warnAt
        ? mixHex(LINE_COLOUR_HIGH_CONTRAST_WARN, LINE_COLOUR_HIGH_CONTRAST_CRITICAL, (amount - warnAt) / (criticalAt - warnAt))
        : mixHex(LINE_COLOUR_HIGH_CONTRAST_SAFE, LINE_COLOUR_HIGH_CONTRAST_WARN, amount / warnAt)
    : amount >= criticalAt
      ? mixHex(LINE_COLOUR_CRITICAL, LINE_COLOUR_PEAK, (amount - criticalAt) / Math.max(0.01, 1 - criticalAt))
      : amount >= warnAt
        ? mixHex(LINE_COLOUR_WARN, LINE_COLOUR_CRITICAL, (amount - warnAt) / (criticalAt - warnAt))
        : mixHex(LINE_COLOUR_SAFE, LINE_COLOUR_WARN, amount / warnAt);
  return {
    colour,
    width: (highContrast ? 3 : 2) + amount * (highContrast ? 2.2 : 2.6),
  };
}

function mixHex(from: string, to: string, amount: number): string {
  const t = clamp(amount, 0, 1);
  const start = parseHex(from);
  const end = parseHex(to);
  const channel = (index: number): string => Math.round(start[index] + (end[index] - start[index]) * t)
    .toString(16)
    .padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

function parseHex(colour: string): readonly [number, number, number] {
  const hex = colour.replace("#", "");
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
