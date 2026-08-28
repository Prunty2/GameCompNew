export interface SurfaceFishingCue {
  distance: number;
  fishCount: number;
  fishVisibility: number;
  lensVisibility: number;
  hookVisibility: number;
}

export interface SurfaceFishPose {
  offsetX: number;
  depth: number;
  direction: -1 | 1;
  scale: number;
}

export interface SurfaceFishingLocationVisibility {
  fishVisibility: number;
  lensVisibility: number;
}

export type SurfaceWaterClarity = "lake" | "clear" | "spill";

const VISIBLE_FISH = 12;
const HOOK_FADE_RADIUS_MULTIPLIER = 5;
const HOOK_PROMINENT_VISIBILITY_RADIUS_MULTIPLIER = 4;
const HOOK_FULL_VISIBILITY_RADIUS_MULTIPLIER = 3;
const PROMINENT_HOOK_VISIBILITY = 0.65;
const LENS_REVEAL_RADIUS_MULTIPLIER = 4.6;
const DISTANT_FISH_VISIBILITY = 0.3;
const PROXIMITY_FISH_VISIBILITY = 0.35;
const SCHOOL_POSITIONS = [
  [-0.12, 0.32],
  [0.18, 0.45],
  [-0.32, 0.57],
  [0.35, 0.68],
  [-0.4, 0.22],
  [0.4, 0.26],
  [-0.04, 0.72],
  [0.06, 0.17],
  [-0.24, 0.76],
  [0.27, 0.55],
  [-0.45, 0.43],
  [0.45, 0.79],
] as const;

export function surfaceFishingCue(
  boatX: number,
  spotX: number,
  interactionRadius: number,
): SurfaceFishingCue {
  const safeRadius = Math.max(0.000_001, interactionRadius);
  const distance = Math.abs(boatX - spotX);
  const lensRadius = safeRadius * LENS_REVEAL_RADIUS_MULTIPLIER;
  const hookFadeRadius = safeRadius * HOOK_FADE_RADIUS_MULTIPLIER;
  const prominentHookVisibilityRadius = safeRadius * HOOK_PROMINENT_VISIBILITY_RADIUS_MULTIPLIER;
  const fullHookVisibilityRadius = safeRadius * HOOK_FULL_VISIBILITY_RADIUS_MULTIPLIER;
  const lensVisibility = Math.sqrt(smootherStep(1 - distance / lensRadius));
  const hookVisibility = hookCueVisibility(
    distance,
    hookFadeRadius,
    prominentHookVisibilityRadius,
    fullHookVisibilityRadius,
  );
  return {
    distance,
    fishCount: VISIBLE_FISH,
    fishVisibility: DISTANT_FISH_VISIBILITY + lensVisibility * PROXIMITY_FISH_VISIBILITY,
    lensVisibility,
    hookVisibility,
  };
}

function hookCueVisibility(
  distance: number,
  fadeRadius: number,
  prominentRadius: number,
  fullVisibilityRadius: number,
): number {
  if (distance >= fadeRadius) return 0;
  if (distance > prominentRadius) {
    const fadeProgress = (fadeRadius - distance) / (fadeRadius - prominentRadius);
    return smootherStep(fadeProgress) * PROMINENT_HOOK_VISIBILITY;
  }

  const fullVisibilityProgress = (prominentRadius - distance)
    / (prominentRadius - fullVisibilityRadius);
  return PROMINENT_HOOK_VISIBILITY
    + smootherStep(fullVisibilityProgress) * (1 - PROMINENT_HOOK_VISIBILITY);
}

export function surfaceFishingLocationVisibility(
  cue: SurfaceFishingCue,
  waterClarity: SurfaceWaterClarity,
): SurfaceFishingLocationVisibility {
  if (waterClarity === "lake") {
    return {
      fishVisibility: cue.fishVisibility,
      lensVisibility: cue.lensVisibility,
    };
  }
  if (waterClarity === "spill") {
    return {
      fishVisibility: clamp(cue.fishVisibility * 0.72, 0, 1),
      lensVisibility: clamp(cue.lensVisibility * 0.78, 0, 1),
    };
  }
  return {
    fishVisibility: clamp(cue.fishVisibility * 1.55, 0, 1),
    lensVisibility: clamp(Math.max(0.18, cue.lensVisibility * 1.45), 0, 1),
  };
}

export function surfaceFishPose(
  spotIndex: number,
  fishIndex: number,
  elapsed: number,
  reducedMotion: boolean,
): SurfaceFishPose {
  const seed = hash01(spotIndex * 41 + fishIndex * 17 + 13);
  const [baseX, baseDepth] = SCHOOL_POSITIONS[fishIndex % SCHOOL_POSITIONS.length]!;
  const stablePhase = seed * Math.PI * 2 + fishIndex * 1.71;
  const motion = reducedMotion ? 0 : elapsed * (0.22 + seed * 0.11);
  const direction = Math.sin(stablePhase + motion * 0.72) >= 0 ? 1 : -1;
  const mirroredX = spotIndex % 2 === 0 ? baseX : -baseX;

  return {
    offsetX: mirroredX + Math.sin(stablePhase + motion) * 0.035,
    depth: clamp(baseDepth + (seed - 0.5) * 0.04 + Math.cos(stablePhase + motion * 0.63) * 0.018, 0.1, 0.82),
    direction,
    scale: 0.76 + seed * 0.42,
  };
}

function smootherStep(value: number): number {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * bounded * (bounded * (bounded * 6 - 15) + 10);
}

function hash01(value: number): number {
  const wave = Math.sin(value * 12.9898 + 78.233) * 43_758.5453;
  return wave - Math.floor(wave);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
