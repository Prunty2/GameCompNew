import {
  BALANCE,
  FISH,
  FISHING_FIGHT_PROFILES,
  type FishSpecies,
} from "./balance";

export type FishingFightBehaviour = "calm" | "run" | "thrash";

export interface FishingFightDart {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface FishingFightMeters {
  progress: number;
  tension: number;
  stamina: number;
  criticalSeconds: number;
  dart?: FishingFightDart;
}

export interface FishingFightPose {
  kind: FishingFightBehaviour;
  intensity: number;
}

export interface FishingFightStep extends FishingFightMeters {
  dart: FishingFightDart;
  behaviour: FishingFightBehaviour;
  struggle: number;
  broken: boolean;
  landed: boolean;
}

export const RESTING_FIGHT_DART: FishingFightDart = { x: 0, y: 0, vx: 0, vy: 0 };

export type FishingFightCue = "reel" | "release" | "resume" | "critical" | "landed";

export const FISHING_FIGHT_RELEASE_TENSION = 0.72;
export const FISHING_FIGHT_RESUME_TENSION = 0.45;
export const FISHING_FIGHT_PULLING_STRUGGLE = 0.55;
export const FISHING_FIGHT_TIRED_STAMINA = 0.22;

export function fishingFightBehaviour(
  species: FishSpecies,
  fightAge: number,
  stamina: number,
): FishingFightPose {
  const fish = FISH[species];
  const profile = FISHING_FIGHT_PROFILES[fish.rarity];
  const energy = clamp(stamina, 0, 1);
  const speciesPhase = fish.atlasCell[0] * 0.23 + fish.atlasCell[1] * 0.31 + fish.depthTier * 0.11;
  const cyclePosition = positiveModulo(fightAge / profile.cycleSeconds + speciesPhase, 1);
  const runFraction = clamp(profile.runFraction + fish.depthTier * 0.018, 0.16, 0.46);
  const thrashFraction = clamp(profile.thrashFraction, 0.08, 0.3);
  const calmEnd = clamp(1 - runFraction - thrashFraction, 0.28, 0.72);
  const runEnd = calmEnd + runFraction;
  const tired = energy <= FISHING_FIGHT_TIRED_STAMINA;

  if (!tired && cyclePosition >= calmEnd && cyclePosition < runEnd) {
    const local = (cyclePosition - calmEnd) / Math.max(0.04, runFraction);
    const pulse = Math.sin(Math.PI * local);
    return {
      kind: "run",
      intensity: clamp(0.42 + pulse * (0.38 + energy * 0.22), 0, 1),
    };
  }
  if (!tired && cyclePosition >= runEnd) {
    const local = (cyclePosition - runEnd) / Math.max(0.04, thrashFraction);
    const pulse = Math.sin(Math.PI * Math.min(1, local));
    return {
      kind: "thrash",
      intensity: clamp(0.34 + pulse * 0.5, 0, 1),
    };
  }
  return {
    kind: "calm",
    intensity: 0.08 + (1 - energy) * 0.05,
  };
}

export function fishingStruggleIntensity(
  species: FishSpecies,
  fightAge: number,
  stamina: number,
): number {
  return fishingFightBehaviour(species, fightAge, stamina).intensity;
}

export function fishingFightCue(fight: {
  tension: number;
  progress: number;
  landingAt: number | null;
  behaviour?: FishingFightBehaviour;
  struggle?: number;
}): FishingFightCue {
  if (fight.landingAt !== null) return "landed";
  if (fight.tension >= BALANCE.fishingCriticalTension) return "critical";
  if (fight.behaviour === "run") return "release";
  if (fight.behaviour === "thrash" && fight.tension >= FISHING_FIGHT_RESUME_TENSION) return "release";
  if (
    fight.tension >= FISHING_FIGHT_RELEASE_TENSION
    || (fight.struggle ?? 0) >= FISHING_FIGHT_PULLING_STRUGGLE
      && fight.tension >= FISHING_FIGHT_RESUME_TENSION
      && fight.behaviour !== "calm"
  ) {
    return "release";
  }
  if (fight.progress > 0.08 && fight.tension <= FISHING_FIGHT_RESUME_TENSION) {
    return "resume";
  }
  return "reel";
}

export function stepFishingFight(
  species: FishSpecies,
  meters: FishingFightMeters,
  reeling: boolean,
  fightAge: number,
  lineTier: number,
  dt: number,
  direction: -1 | 1 = 1,
): FishingFightStep {
  const fish = FISH[species];
  const profile = FISHING_FIGHT_PROFILES[fish.rarity];
  const safeDt = clamp(dt, 0, 0.1);
  const stamina = clamp(meters.stamina, 0, 1);
  const pose = fishingFightBehaviour(species, fightAge, stamina);
  const lineStrength = 1 + Math.max(0, lineTier) * BALANCE.fishingLineStrengthPerTier;
  const run = pose.kind === "run" ? pose.intensity : 0;
  const thrash = pose.kind === "thrash" ? pose.intensity : 0;
  const dart = stepFightDart(species, meters.dart ?? RESTING_FIGHT_DART, pose, fightAge, direction, safeDt);

  let progress = meters.progress;
  let tension = meters.tension;
  let nextStamina = stamina;
  if (reeling) {
    const reelRate = pose.kind === "run"
      ? profile.reelProgressPerSecond * (0.08 + (1 - run) * 0.12)
      : pose.kind === "thrash"
        ? profile.reelProgressPerSecond * (0.42 + (1 - thrash) * 0.2)
        : profile.reelProgressPerSecond * (0.86 + (1 - stamina) * 0.2);
    const tensionRate = pose.kind === "run"
      ? profile.runTensionPerSecond * (0.55 + run * 0.7)
      : pose.kind === "thrash"
        ? profile.thrashTensionPerSecond * (0.45 + thrash * 0.7)
        : profile.calmTensionPerSecond;
    progress += reelRate * safeDt;
    tension += tensionRate / lineStrength * safeDt;
    nextStamina -= profile.staminaDrainPerSecond
      * (pose.kind === "run" ? 0.9 + run * 0.35 : 0.58 + thrash * 0.22)
      * safeDt;
  } else if (pose.kind === "run") {
    progress -= profile.runSlipPerSecond * (0.55 + run * 0.7) * safeDt;
    tension -= profile.runSlackPerSecond * (0.62 + run * 0.55) * lineStrength * safeDt;
    nextStamina -= profile.staminaDrainPerSecond * 0.12 * run * safeDt;
  } else if (pose.kind === "thrash") {
    progress -= profile.thrashSlipPerSecond * (0.4 + thrash * 0.6) * safeDt;
    tension -= profile.thrashSlackPerSecond * (0.5 + thrash * 0.35) * safeDt;
  } else {
    progress -= profile.calmSlipPerSecond * safeDt;
    tension -= profile.calmSlackPerSecond * safeDt;
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
    dart,
    behaviour: pose.kind,
    struggle: pose.intensity,
    broken: criticalSeconds >= BALANCE.fishingBreakGraceSeconds,
    landed: progress >= 1,
  };
}

export function stepFightDart(
  species: FishSpecies,
  dart: FishingFightDart,
  pose: FishingFightPose,
  fightAge: number,
  direction: -1 | 1,
  dt: number,
): FishingFightDart {
  const safeDt = clamp(dt, 0, 0.1);
  const fish = FISH[species];
  const seed = fish.atlasCell[0] * 3.17 + fish.atlasCell[1] * 8.91 + fish.depthTier * 1.63;
  const slotWidth = pose.kind === "thrash" ? 0.09 : pose.kind === "run" ? 0.16 : 0.42;
  const slot = Math.floor(Math.max(0, fightAge) / slotWidth);
  const previousSlot = Math.floor(Math.max(0, fightAge - safeDt) / slotWidth);
  let vx = dart.vx;
  let vy = dart.vy;
  if (slot !== previousSlot && unitNoise(slot * 19.73 + seed) < dartChance(pose.kind)) {
    const angle = (unitNoise(slot * 11.17 + seed + 4.2) - 0.5) * Math.PI * 2;
    const away = direction >= 0 ? 0 : Math.PI;
    const mixed = pose.kind === "run" ? angle * 0.55 + away * 0.45 : angle;
    const force = dartForce(pose) * (0.72 + unitNoise(slot * 5.9 + seed) * 0.56);
    vx += Math.cos(mixed) * force;
    vy += Math.sin(mixed) * force * 0.72;
  }
  const targetX = pose.kind === "run" ? direction * 0.07 * pose.intensity : 0;
  const targetY = pose.kind === "run" ? 0.045 * pose.intensity : pose.kind === "thrash" ? 0.01 : 0;
  const spring = pose.kind === "run" ? 2.1 : pose.kind === "thrash" ? 5.4 : 6.8;
  const damp = pose.kind === "run" ? 1.6 : pose.kind === "thrash" ? 3.8 : 5.2;
  vx += (targetX - dart.x) * spring * safeDt;
  vy += (targetY - dart.y) * spring * safeDt;
  const drag = Math.exp(-damp * safeDt);
  vx *= drag;
  vy *= drag;
  let x = dart.x + vx * safeDt;
  let y = dart.y + vy * safeDt;
  const radius = Math.hypot(x, y);
  const maxRadius = pose.kind === "run" ? 0.17 : pose.kind === "thrash" ? 0.11 : 0.055;
  if (radius > maxRadius) {
    const scale = maxRadius / radius;
    x *= scale;
    y *= scale;
    vx *= scale;
    vy *= scale;
  }
  return { x, y, vx, vy };
}

export function fishingFightWriggle(
  elapsed: number,
  hookedAt: number,
  struggle: number,
  reducedMotion: boolean,
  behaviour: FishingFightBehaviour = "calm",
): number {
  if (reducedMotion) return 0;
  const age = Math.max(0, elapsed - hookedAt);
  if (behaviour === "run") return Math.sin(age * 9.5) * (0.1 + struggle * 0.2);
  if (behaviour === "thrash") return Math.sin(age * 31) * (0.28 + struggle * 0.55);
  return Math.sin(age * 14) * (0.1 + struggle * 0.16);
}

function dartChance(kind: FishingFightBehaviour): number {
  if (kind === "thrash") return 0.78;
  if (kind === "run") return 0.62;
  return 0.22;
}

function dartForce(pose: FishingFightPose): number {
  if (pose.kind === "run") return 3.6 + pose.intensity * 1.8;
  if (pose.kind === "thrash") return 2.4 + pose.intensity * 1.3;
  return 0.7 + pose.intensity * 0.4;
}

function unitNoise(seed: number): number {
  const value = Math.sin(seed) * 43758.5453123;
  return value - Math.floor(value);
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
