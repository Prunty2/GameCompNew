export interface BoatSteamPuff {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

const PUFF_COUNT = 7;

export function boatSteamPuffs(
  elapsed: number,
  speedRatio: number,
  localMovementDirection: number,
  reducedMotion: boolean,
): BoatSteamPuff[] {
  const clampedSpeed = clamp(speedRatio, 0, 1);
  const direction = Math.sign(localMovementDirection);
  const motionScale = reducedMotion ? 0.2 : 1;
  const cycleSpeed = reducedMotion ? 0.16 : 0.34 + clampedSpeed * 0.22;
  const puffs: BoatSteamPuff[] = [];

  for (let index = 0; index < PUFF_COUNT; index += 1) {
    const age = modulo(elapsed * cycleSpeed - index / PUFF_COUNT, 1);
    const easedAge = 1 - (1 - age) ** 2;
    const trail = clampedSpeed * easedAge * 0.3 * motionScale;
    const idleDrift = Math.sin(elapsed * 0.7 + index * 2.1) * 0.012 * easedAge * motionScale;

    puffs.push({
      x: direction === 0 ? idleDrift : -direction * trail + idleDrift,
      y: -0.025 - easedAge * (0.28 - clampedSpeed * 0.08) * motionScale,
      radius: 0.022 + easedAge * 0.072,
      opacity: Math.sin(Math.PI * age) * (0.34 + clampedSpeed * 0.18),
    });
  }

  return puffs;
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
