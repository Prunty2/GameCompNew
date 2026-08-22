export const FISHING_REEL_DURATION = 1.15;
export const FISHING_LOSS_SWIM_DURATION = 0.36;
export const FISHING_LOSS_RETRACT_DURATION = 0.42;
export const FISHING_LOSS_DURATION = FISHING_LOSS_SWIM_DURATION + FISHING_LOSS_RETRACT_DURATION;

export interface FishingLossProgress {
  swim: number;
  retract: number;
}

export function fishingLossProgress(elapsed: number, lostAt: number): FishingLossProgress {
  const age = Math.max(0, elapsed - lostAt);
  return {
    swim: smoothstep(clamp(age / FISHING_LOSS_SWIM_DURATION, 0, 1)),
    retract: smoothstep(clamp((age - FISHING_LOSS_SWIM_DURATION) / FISHING_LOSS_RETRACT_DURATION, 0, 1)),
  };
}

export function fishingReelProgress(elapsed: number, hookedAt: number): number {
  const linear = clamp((elapsed - hookedAt) / FISHING_REEL_DURATION, 0, 1);
  return linear * linear * (3 - 2 * linear);
}

export function fishingReelSchoolOpacity(reelProgress: number): number {
  return 1 - clamp(reelProgress, 0, 1);
}

export function fishingReelWriggle(
  elapsed: number,
  hookedAt: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;
  const age = Math.max(0, elapsed - hookedAt);
  const remaining = 1 - fishingReelProgress(elapsed, hookedAt);
  return Math.sin(age * 25) * remaining;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}
