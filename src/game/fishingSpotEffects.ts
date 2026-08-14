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

const VISIBLE_FISH = 12;
const HOOK_REVEAL_RADIUS_MULTIPLIER = 3;
const HOOK_FULL_VISIBILITY_RADIUS_MULTIPLIER = 2;
const MINIMUM_HOOK_VISIBILITY = 0.4;
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
  const lensRadius = safeRadius * 3.6;
  const hookRadius = safeRadius * HOOK_REVEAL_RADIUS_MULTIPLIER;
  const fullHookVisibilityRadius = safeRadius * HOOK_FULL_VISIBILITY_RADIUS_MULTIPLIER;
  const hookFadeDistance = hookRadius - fullHookVisibilityRadius;
  const lensVisibility = Math.sqrt(smootherStep(1 - distance / lensRadius));
  const hookVisibility = distance > hookRadius
    ? 0
    : MINIMUM_HOOK_VISIBILITY
      + smootherStep((hookRadius - distance) / hookFadeDistance) * (1 - MINIMUM_HOOK_VISIBILITY);
  return {
    distance,
    fishCount: VISIBLE_FISH,
    fishVisibility: DISTANT_FISH_VISIBILITY + lensVisibility * PROXIMITY_FISH_VISIBILITY,
    lensVisibility,
    hookVisibility,
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
