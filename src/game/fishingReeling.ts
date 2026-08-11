export const FISHING_REEL_DURATION = 1.15;

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
