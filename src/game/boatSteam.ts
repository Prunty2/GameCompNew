export interface BoatSteamPuff {
  x: number;
  y: number;
  radius: number;
  stretchX: number;
  stretchY: number;
  rotation: number;
  opacity: number;
  spriteIndex: number;
}

const PUFF_COUNT = 8;
const STEAM_CYCLE_SPEED = 0.4;
const SPRITE_COUNT = 8;

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
    const cyclePosition = elapsed * cycleSpeed - index / PUFF_COUNT;
    const cycle = Math.floor(cyclePosition);
    const age = modulo(cyclePosition, 1);
    const easedAge = 1 - (1 - age) ** 2;
    const seed = index * 37.17 + cycle * 91.73;
    const trailScale = 0.78 + seededUnit(seed + 1.3) * 0.44;
    const riseScale = 0.78 + seededUnit(seed + 4.1) * 0.42;
    const flattening = seededUnit(seed + 7.7);
    const sizeScale = 0.88 + seededUnit(seed + 12.4) * 0.24;
    const trail = clampedSpeed * easedAge * 0.46 * trailScale * motionScale;
    const idleDrift = Math.sin(elapsed * 0.7 + index * 2.1) * 0.012 * easedAge * motionScale;
    const wander = Math.sin(age * Math.PI * (1.2 + flattening * 0.7) + seed)
      * easedAge * 0.032 * motionScale;
    const riseWander = Math.sin(age * Math.PI * 2 + seededUnit(seed + 23.2) * Math.PI * 2)
      * easedAge * 0.018 * motionScale;

    puffs.push({
      x: (direction === 0 ? idleDrift : -direction * trail + idleDrift) + wander,
      y: -0.025 - easedAge * (0.38 - clampedSpeed * 0.06) * riseScale * motionScale + riseWander,
      radius: (0.032 + easedAge * 0.118) * sizeScale,
      stretchX: 0.76 + easedAge * (0.1 + flattening * 0.08),
      stretchY: 0.9 + easedAge * (0.04 + (1 - flattening) * 0.08),
      rotation: (seededUnit(seed + 16.2) - 0.5) * 0.34,
      opacity: Math.sin(Math.PI * age) * (0.34 + clampedSpeed * 0.18),
      spriteIndex: Math.floor(seededUnit(seed + 18.9) * SPRITE_COUNT),
    });
  }

  return puffs;
}

function seededUnit(seed: number): number {
  return modulo(Math.sin(seed * 12.9898) * 43_758.5453, 1);
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
