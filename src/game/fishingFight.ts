import {
  BALANCE,
  FISH,
  FISHING_FIGHT_PROFILES,
  reelSpeedMultiplier,
  type FishSpecies,
} from "./balance";
import {
  FISHING_SPECIES_FIGHT_PROFILES,
  type FishingFightStyle,
} from "./fishingBehaviour";

export type FishingFightBehaviour = "calm" | "run" | "thrash";

export interface FishingFightMotion {
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
  motion?: FishingFightMotion;
}

export interface FishingFightPose {
  kind: FishingFightBehaviour;
  intensity: number;
}

export interface FishingFightStep extends FishingFightMeters {
  motion: FishingFightMotion;
  style: FishingFightStyle;
  behaviour: FishingFightBehaviour;
  struggle: number;
  broken: boolean;
  landed: boolean;
}

export const RESTING_FIGHT_MOTION: FishingFightMotion = { x: 0, y: 0, vx: 0, vy: 0 };

export type FishingFightCue = "reel" | "release" | "resume" | "critical" | "landed";

export const FISHING_FIGHT_RELEASE_TENSION = 0.72;
export const FISHING_FIGHT_RESUME_TENSION = 0.45;
export const FISHING_FIGHT_PULLING_STRUGGLE = 0.55;
export const FISHING_FIGHT_TIRED_STAMINA = 0.22;
export const FISHING_FIGHT_OPENING_RUN_SECONDS = 0.65;

export function fishingFightBehaviour(
  species: FishSpecies,
  fightAge: number,
  stamina: number,
): FishingFightPose {
  const profile = FISHING_SPECIES_FIGHT_PROFILES[species];
  const energy = clamp(stamina, 0, 1);
  if (energy <= FISHING_FIGHT_TIRED_STAMINA) {
    return { kind: "calm", intensity: 0.07 + (1 - energy) * 0.04 };
  }
  if (fightAge < FISHING_FIGHT_OPENING_RUN_SECONDS) {
    const openingProgress = smoothstep(fightAge / FISHING_FIGHT_OPENING_RUN_SECONDS);
    const openingPulse = Math.sin(Math.PI * openingProgress);
    return {
      kind: "run",
      intensity: clamp(
        profile.runIntensity
          * (0.14 + (1 - openingProgress) * 0.41 + openingPulse * 0.45)
          * (0.5 + energy * 0.5),
        0,
        1,
      ),
    };
  }
  const activeAge = Math.max(0, fightAge - FISHING_FIGHT_OPENING_RUN_SECONDS);
  const cyclePosition = positiveModulo(activeAge / profile.cycleSeconds, 1);
  const runFraction = profile.runFraction;
  const thrashFraction = profile.thrashFraction;
  const calmEnd = clamp(1 - runFraction - thrashFraction, 0.28, 0.72);
  const runEnd = calmEnd + runFraction;

  if (cyclePosition >= calmEnd && cyclePosition < runEnd) {
    const local = (cyclePosition - calmEnd) / Math.max(0.04, runFraction);
    const pulse = smoothstep(Math.sin(Math.PI * local));
    return {
      kind: "run",
      intensity: clamp((0.16 + pulse * 0.84) * profile.runIntensity * (0.5 + energy * 0.5), 0, 1),
    };
  }
  if (cyclePosition >= runEnd) {
    const local = (cyclePosition - runEnd) / Math.max(0.04, thrashFraction);
    const pulse = smoothstep(Math.sin(Math.PI * Math.min(1, local)));
    return {
      kind: "thrash",
      intensity: clamp((0.14 + pulse * 0.86) * profile.thrashIntensity * (0.55 + energy * 0.45), 0, 1),
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
  reelTier = 0,
): FishingFightStep {
  const fish = FISH[species];
  const rarityProfile = FISHING_FIGHT_PROFILES[fish.rarity];
  const speciesProfile = FISHING_SPECIES_FIGHT_PROFILES[species];
  const safeDt = clamp(dt, 0, 0.1);
  const stamina = clamp(meters.stamina, 0, 1);
  const pose = fishingFightBehaviour(species, fightAge, stamina);
  const lineStrength = 1 + Math.max(0, lineTier) * BALANCE.fishingLineStrengthPerTier;
  const run = pose.kind === "run" ? pose.intensity : 0;
  const thrash = pose.kind === "thrash" ? pose.intensity : 0;
  const motion = stepFightMotion(
    species,
    meters.motion ?? RESTING_FIGHT_MOTION,
    pose,
    fightAge,
    direction,
    safeDt,
  );

  let progress = meters.progress;
  let tension = meters.tension;
  let nextStamina = stamina;
  if (reeling) {
    const reelRate = pose.kind === "run"
      ? rarityProfile.reelProgressPerSecond / speciesProfile.reelResistance * (0.06 + (1 - run) * 0.1)
      : pose.kind === "thrash"
        ? rarityProfile.reelProgressPerSecond / speciesProfile.reelResistance * (0.34 + (1 - thrash) * 0.18)
        : rarityProfile.reelProgressPerSecond / speciesProfile.reelResistance * (0.82 + (1 - stamina) * 0.24);
    const tensionRate = pose.kind === "run"
      ? rarityProfile.runTensionPerSecond * speciesProfile.runPower * run
      : pose.kind === "thrash"
        ? rarityProfile.thrashTensionPerSecond * speciesProfile.thrashPower * thrash
        : 0;
    progress += reelRate * reelSpeedMultiplier(reelTier) * safeDt;
    tension += tensionRate / lineStrength * safeDt;
    if (pose.kind === "calm") {
      tension -= rarityProfile.calmSlackPerSecond * 0.18 * safeDt;
    }
    nextStamina -= rarityProfile.staminaDrainPerSecond / speciesProfile.endurance
      * (pose.kind === "run" ? 0.9 + run * 0.35 : 0.58 + thrash * 0.22)
      * safeDt;
  } else if (pose.kind === "run") {
    progress -= rarityProfile.runSlipPerSecond * speciesProfile.runSlip * (0.5 + run * 0.72) * safeDt;
    tension -= rarityProfile.runSlackPerSecond * speciesProfile.runSlack * (0.58 + run * 0.58) * safeDt;
    nextStamina -= rarityProfile.staminaDrainPerSecond / speciesProfile.endurance * 0.14 * run * safeDt;
  } else if (pose.kind === "thrash") {
    progress -= rarityProfile.thrashSlipPerSecond * speciesProfile.runSlip * (0.36 + thrash * 0.62) * safeDt;
    tension -= rarityProfile.thrashSlackPerSecond * speciesProfile.runSlack * (0.46 + thrash * 0.38) * safeDt;
  } else {
    progress -= rarityProfile.calmSlipPerSecond * safeDt;
    tension -= rarityProfile.calmSlackPerSecond * safeDt;
    nextStamina += rarityProfile.staminaRecoveryPerSecond * speciesProfile.recovery * safeDt;
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
    motion,
    style: speciesProfile.style,
    behaviour: pose.kind,
    struggle: pose.intensity,
    broken: criticalSeconds >= BALANCE.fishingBreakGraceSeconds,
    landed: progress >= 1,
  };
}

export function stepFightMotion(
  species: FishSpecies,
  motion: FishingFightMotion,
  pose: FishingFightPose,
  fightAge: number,
  direction: -1 | 1,
  dt: number,
): FishingFightMotion {
  const safeDt = clamp(dt, 0, 0.1);
  if (safeDt === 0) return motion;
  const profile = FISHING_SPECIES_FIGHT_PROFILES[species];
  const seed = speciesSeed(species);
  const clock = Math.max(0, fightAge) * profile.pathFrequency + seed;
  const broadX = Math.sin(clock * 1.17) * 0.62 + Math.sin(clock * 0.53 + 1.8) * 0.38;
  const broadY = Math.sin(clock * 0.83 + 0.7) * 0.68 + Math.sin(clock * 1.41 + 2.2) * 0.32;
  const thrashWave = Math.sin(clock * 2.35 + seed * 0.7);
  const activity = pose.kind === "calm" ? 0.16 : pose.intensity;
  const runBias = pose.kind === "run" ? direction * profile.horizontalRange * pose.intensity : 0;
  const targetX = runBias + broadX * profile.horizontalRange
    * (pose.kind === "thrash" ? 0.68 : pose.kind === "run" ? 0.24 : 0.12)
    * activity;
  const targetY = (pose.kind === "run" ? profile.runDepthBias * pose.intensity : 0)
    + broadY * profile.verticalRange * (pose.kind === "thrash" ? 0.65 : 0.22) * activity
    + (pose.kind === "thrash" ? thrashWave * profile.verticalRange * 0.32 * activity : 0);
  const response = profile.steeringResponse * (pose.kind === "thrash" ? 1.15 : pose.kind === "calm" ? 0.72 : 1);
  const desiredVx = (targetX - motion.x) * response;
  const desiredVy = (targetY - motion.y) * response;
  const velocityBlend = 1 - Math.exp(-profile.motionDamping * safeDt);
  let vx = motion.vx + (desiredVx - motion.vx) * velocityBlend;
  let vy = motion.vy + (desiredVy - motion.vy) * velocityBlend;
  const speed = Math.hypot(vx, vy);
  const maximumSpeed = profile.maximumSpeed * (pose.kind === "calm" ? 0.45 : 0.72 + activity * 0.28);
  if (speed > maximumSpeed) {
    const speedScale = maximumSpeed / speed;
    vx *= speedScale;
    vy *= speedScale;
  }
  let x = motion.x + vx * safeDt;
  let y = motion.y + vy * safeDt;
  const radius = Math.hypot(x, y);
  const maxRadius = Math.max(0.045, profile.horizontalRange + Math.abs(profile.runDepthBias) + 0.025);
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
  species: FishSpecies,
  elapsed: number,
  hookedAt: number,
  struggle: number,
  reducedMotion: boolean,
  behaviour: FishingFightBehaviour = "calm",
): number {
  if (reducedMotion) return 0;
  const profile = FISHING_SPECIES_FIGHT_PROFILES[species];
  const age = Math.max(0, elapsed - hookedAt);
  const behaviourScale = behaviour === "thrash" ? 1 : behaviour === "run" ? 0.48 : 0.28;
  return Math.sin(age * profile.wriggleFrequency)
    * profile.wriggleAmplitude
    * behaviourScale
    * (0.35 + struggle * 0.65);
}

function speciesSeed(species: FishSpecies): number {
  const fish = FISH[species];
  return fish.atlasCell[0] * 0.73 + fish.atlasCell[1] * 1.19 + fish.depthTier * 0.41
    + species.length * 0.17;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothstep(value: number): number {
  const safe = clamp(value, 0, 1);
  return safe * safe * (3 - safe * 2);
}
