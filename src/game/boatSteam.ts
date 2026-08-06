export interface BoatSteamPuff {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

const PUFF_COUNT = 8;
const STEAM_CYCLE_SPEED = 0.4;

export function boatSteamPuffs(
  elapsed: number,
  speedRatio: number,
  localMovementDirection: number,
  reducedMotion: boolean,
): BoatSteamPuff[] {
  const clampedSpeed = clamp(speedRatio, 0, 1);
  const direction = Math.sign(localMovementDirection);
  const motionScale = reducedMotion ? 0.2 : 1;
  const cycleSpeed = reducedMotion ? 0.16 : STEAM_CYCLE_SPEED;
  const puffs: BoatSteamPuff[] = [];

  for (let index = 0; index < PUFF_COUNT; index += 1) {
    const age = modulo(elapsed * cycleSpeed - index / PUFF_COUNT, 1);
    const easedAge = 1 - (1 - age) ** 2;
    const trail = clampedSpeed * easedAge * 0.46 * motionScale;
    const idleDrift = Math.sin(elapsed * 0.7 + index * 2.1) * 0.012 * easedAge * motionScale;

    puffs.push({
      x: direction === 0 ? idleDrift : -direction * trail + idleDrift,
      y: -0.025 - easedAge * (0.38 - clampedSpeed * 0.06) * motionScale,
      radius: 0.032 + easedAge * 0.118,
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
