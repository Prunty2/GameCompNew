import {
  BALANCE,
  FISH,
  FISHING_FIGHT_PROFILES,
  type FishSpecies,
} from "./balance";

export interface FishingFightMeters {
  progress: number;
  tension: number;
  stamina: number;
  criticalSeconds: number;
}

export interface FishingFightStep extends FishingFightMeters {
  struggle: number;
  broken: boolean;
  landed: boolean;
}

export function fishingStruggleIntensity(
  species: FishSpecies,
  fightAge: number,
  stamina: number,
): number {
  const fish = FISH[species];
  const profile = FISHING_FIGHT_PROFILES[fish.rarity];
  const speciesPhase = fish.atlasCell[0] * 0.23 + fish.atlasCell[1] * 0.31 + fish.depthTier * 0.11;
  const cyclePosition = positiveModulo(fightAge / profile.struggleCycleSeconds + speciesPhase, 1);
  if (cyclePosition >= profile.struggleFraction) return 0.08;
  const pulse = Math.sin(Math.PI * cyclePosition / profile.struggleFraction);
  return clamp(0.08 + pulse * (0.52 + clamp(stamina, 0, 1) * 0.4), 0, 1);
}

export function stepFishingFight(
  species: FishSpecies,
  meters: FishingFightMeters,
  reeling: boolean,
  fightAge: number,
  lineTier: number,
  dt: number,
): FishingFightStep {
  const fish = FISH[species];
  const profile = FISHING_FIGHT_PROFILES[fish.rarity];
  const safeDt = clamp(dt, 0, 0.1);
  const stamina = clamp(meters.stamina, 0, 1);
  const struggle = fishingStruggleIntensity(species, fightAge, stamina);
  const lineStrength = 1 + Math.max(0, lineTier) * BALANCE.fishingLineStrengthPerTier;

  let progress = meters.progress;
  let tension = meters.tension;
  let nextStamina = stamina;
  if (reeling) {
    progress += profile.reelProgressPerSecond
      * (0.76 + (1 - stamina) * 0.24)
      * (1 - struggle * 0.38)
      * safeDt;
    tension += profile.tensionPerSecond * (0.22 + struggle * 0.78) / lineStrength * safeDt;
    nextStamina -= profile.staminaDrainPerSecond * (0.62 + struggle * 0.38) * safeDt;
  } else {
    progress -= profile.slipPerSecond * (0.4 + struggle * 0.6) * safeDt;
    tension -= profile.tensionRecoveryPerSecond * (1 - struggle * 0.28) * safeDt;
    nextStamina += profile.staminaRecoveryPerSecond * safeDt;
  }

  progress = clamp(progress, 0, 1);
  tension = clamp(tension, 0, 1);
  nextStamina = clamp(nextStamina, 0, 1);
  const criticalSeconds = tension >= BALANCE.fishingCriticalTension
    ? meters.criticalSeconds + safeDt
    : 0;

  return {
    progress,
    tension,
    stamina: nextStamina,
    criticalSeconds,
    struggle,
    broken: criticalSeconds >= BALANCE.fishingBreakGraceSeconds,
    landed: progress >= 1,
  };
}

export function fishingFightWriggle(
  elapsed: number,
  hookedAt: number,
  struggle: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;
  return Math.sin(Math.max(0, elapsed - hookedAt) * 25) * (0.28 + struggle * 0.72);
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
