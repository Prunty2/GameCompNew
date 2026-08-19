import {
  BALANCE,
  FISH,
  SPOT_RESIDENTS,
  spotById,
  type FishSpecies,
  type SpotId,
  type WorldPoint,
} from "./balance";
import {
  FISHING_MOVEMENT_PROFILES,
  fishingSpeciesMotion,
} from "./fishingMovement";
import type { RandomSource } from "./math";

const FISHING_CATCH_RADIUS = 0.058;
const FISHING_DIVE_DURATION = 0.85;
const FISHING_RETURN_DURATION = 1.15;
const fishingInteractionBrand: unique symbol = Symbol("FishingInteraction");

export interface FishingInteraction {
  readonly [fishingInteractionBrand]: true;
}

interface FishingTarget extends WorldPoint {
  species: FishSpecies;
  direction: -1 | 1;
  speed: number;
  homeY: number;
  motionPhase: number;
}

type FishingInteractionPhase =
  | { kind: "steering" }
  | {
      kind: "reeling";
      species: FishSpecies;
      targetIndex: number;
      startedAt: number;
      direction: -1 | 1;
    }
  | { kind: "exiting"; startedAt: number }
  | { kind: "complete" };

interface FishingInteractionState extends FishingInteraction {
  spot: SpotId;
  objectiveSpecies: FishSpecies;
  lineTier: number;
  elapsed: number;
  motionTime: number;
  hook: WorldPoint;
  targets: FishingTarget[];
  phase: FishingInteractionPhase;
}

export interface BeginFishingInteractionOptions {
  spot: SpotId;
  objectiveSpecies: FishSpecies;
  lineTier: number;
  random: RandomSource;
  initialTime?: number;
}

export interface FishingInteractionInput {
  hookX: number;
  hookY: number;
}

export type FishingInteractionOutcome =
  | { kind: "caught"; species: FishSpecies }
  | { kind: "left" };

export type FishingInteractionStep =
  | { status: "active" }
  | { status: "complete"; outcome: FishingInteractionOutcome };

export type FishingExitRequest =
  | { accepted: false }
  | { accepted: true; step: FishingInteractionStep };

export interface FishingFishScene {
  readonly species: FishSpecies;
  readonly point: Readonly<WorldPoint>;
  readonly heading: -1 | 1;
  readonly reachable: boolean;
  readonly objective: boolean;
  readonly hooked: boolean;
  readonly opacity: number;
  readonly pose: Readonly<{
    animationFrame: number;
    verticalOffsetRatio: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  }>;
}

export interface FishingScene {
  readonly spot: SpotId;
  readonly objectiveSpecies: FishSpecies;
  readonly phase: "steering" | "reeling" | "exiting";
  readonly lineTier: number;
  readonly maximumDepth: number;
  readonly hook: Readonly<WorldPoint>;
  readonly fish: readonly FishingFishScene[];
  readonly hookedFish: Readonly<{
    species: FishSpecies;
    direction: -1 | 1;
    wriggle: number;
    animationFrame: number;
  }> | null;
  readonly transition: Readonly<{
    diveProgress: number;
    reelProgress: number;
    surfaceProgress: number;
    schoolOpacity: number;
    surfaceSpriteOpacity: number;
  }>;
  readonly controls: Readonly<{
    canSteer: boolean;
    canLeave: boolean;
  }>;
  readonly narration: string;
}

export function beginFishingInteraction(
  options: BeginFishingInteractionOptions,
): FishingInteraction {
  const residents = SPOT_RESIDENTS[options.spot];
  if (!residents.includes(options.objectiveSpecies)) {
    throw new Error(`${options.objectiveSpecies} is not resident at ${options.spot}.`);
  }
  const requestedLineTier = Number.isFinite(options.lineTier) ? options.lineTier : 0;
  const lineTier = Math.max(0, Math.min(BALANCE.maxUpgradeTier, Math.floor(requestedLineTier)));
  const targets = residents.flatMap((species, residentIndex) => (
    [0, 1].map((schoolIndex): FishingTarget => {
      const fish = FISH[species];
      const index = residentIndex * 2 + schoolIndex;
      const homeY = Math.min(0.92, 0.19 + fish.depthTier * 0.135 + options.random.next() * 0.05);
      return {
        species,
        x: 0.12 + ((index * 0.153) % 0.76),
        y: homeY,
        direction: index % 2 === 0 ? 1 : -1,
        speed: 0.048 + fish.depthTier * 0.0075 + options.random.next() * 0.032,
        homeY,
        motionPhase: (index * 1.73 + fish.depthTier * 0.61) % (Math.PI * 2),
      };
    })
  ));
  const interaction: FishingInteractionState = {
    [fishingInteractionBrand]: true,
    spot: options.spot,
    objectiveSpecies: options.objectiveSpecies,
    lineTier,
    elapsed: 0,
    motionTime: Number.isFinite(options.initialTime) ? Math.max(0, options.initialTime ?? 0) : 0,
    hook: { x: 0.5, y: 0.08 },
    targets,
    phase: { kind: "steering" },
  };
  return interaction;
}

export function advanceFishingInteraction(
  interaction: FishingInteraction,
  input: FishingInteractionInput,
  dt: number,
): FishingInteractionStep {
  const state = interactionState(interaction);
  if (state.phase.kind === "complete") {
    throw new Error("Cannot advance a completed Fishing interaction.");
  }
  const safeDt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
  state.elapsed += safeDt;
  state.motionTime += safeDt;

  if (state.phase.kind === "exiting") {
    if (state.elapsed - state.phase.startedAt >= FISHING_RETURN_DURATION) {
      state.phase = { kind: "complete" };
      return { status: "complete", outcome: { kind: "left" } };
    }
    return { status: "active" };
  }
  if (state.phase.kind === "reeling") {
    if (state.elapsed - state.phase.startedAt >= FISHING_RETURN_DURATION) {
      const species = state.phase.species;
      state.phase = { kind: "complete" };
      return { status: "complete", outcome: { kind: "caught", species } };
    }
    return { status: "active" };
  }

  const hookX = clamp(Number.isFinite(input.hookX) ? input.hookX : 0, -1, 1);
  const hookY = clamp(Number.isFinite(input.hookY) ? input.hookY : 0, -1, 1);
  const verticalSpeed = hookY < 0 ? BALANCE.fishingHookUpSpeed : BALANCE.fishingHookDownSpeed;
  state.hook.x = clamp(state.hook.x + hookX * BALANCE.fishingHookHorizontalSpeed * safeDt, 0.07, 0.93);
  state.hook.y = clamp(state.hook.y + hookY * verticalSpeed * safeDt, 0.07, maximumDepth(state.lineTier));

  for (const [targetIndex, target] of state.targets.entries()) {
    const motion = fishingSpeciesMotion(target.species, state.motionTime, target.motionPhase);
    target.x += target.speed * motion.horizontalMultiplier * target.direction * motion.heading * safeDt;
    target.y = clamp(target.homeY + motion.depthOffset, 0.1, 0.92);
    if (target.x < 0.1 || target.x > 0.9) {
      target.x = clamp(target.x, 0.1, 0.9);
      target.direction = target.direction === 1 ? -1 : 1;
    }
    const reachable = FISH[target.species].depthTier <= state.lineTier;
    if (reachable && distance(state.hook, target) <= FISHING_CATCH_RADIUS) {
      state.phase = {
        kind: "reeling",
        species: target.species,
        targetIndex,
        startedAt: state.elapsed,
        direction: multiplyDirection(target.direction, motion.heading),
      };
      return { status: "active" };
    }
  }
  return { status: "active" };
}

export function requestFishingExit(
  interaction: FishingInteraction,
  reducedMotion: boolean,
): FishingExitRequest {
  const state = interactionState(interaction);
  if (state.phase.kind !== "steering") return { accepted: false };
  if (reducedMotion) {
    state.phase = { kind: "complete" };
    return {
      accepted: true,
      step: { status: "complete", outcome: { kind: "left" } },
    };
  }
  state.phase = { kind: "exiting", startedAt: state.elapsed };
  return { accepted: true, step: { status: "active" } };
}

export function projectFishingInteraction(
  interaction: FishingInteraction,
  reducedMotion: boolean,
): FishingScene {
  const state = interactionState(interaction);
  if (state.phase.kind === "complete") {
    throw new Error("Cannot project a completed Fishing interaction.");
  }
  const entryDiveProgress = diveProgress(state.elapsed, reducedMotion);
  const reelProgress = state.phase.kind === "reeling"
    ? returnProgress(state.elapsed, state.phase.startedAt)
    : 0;
  const exitProgress = state.phase.kind === "exiting"
    ? returnProgress(state.elapsed, state.phase.startedAt)
    : 0;
  const surfaceProgress = state.phase.kind === "reeling" ? reelProgress : exitProgress;
  const surfacing = state.phase.kind !== "steering";
  const schoolOpacity = surfacing ? 1 - surfaceProgress : 1;
  const settledDiveProgress = surfacing
    ? reducedMotion ? 0 : entryDiveProgress * (1 - surfaceProgress)
    : entryDiveProgress;
  const hookedTargetIndex = state.phase.kind === "reeling" ? state.phase.targetIndex : -1;
  const fish = state.targets.map((target, targetIndex): FishingFishScene => {
    const pose = fishPose(target.species, state.motionTime, target.motionPhase, reducedMotion);
    return {
      species: target.species,
      point: { x: target.x, y: target.y },
      heading: target.direction === pose.heading ? 1 : -1,
      reachable: FISH[target.species].depthTier <= state.lineTier,
      objective: target.species === state.objectiveSpecies,
      hooked: targetIndex === hookedTargetIndex,
      opacity: schoolOpacity,
      pose: {
        animationFrame: pose.animationFrame,
        verticalOffsetRatio: pose.verticalOffsetRatio,
        rotation: pose.rotation,
        scaleX: pose.scaleX,
        scaleY: pose.scaleY,
      },
    };
  });
  const spot = spotById(state.spot);
  const hookedFish = state.phase.kind === "reeling"
    ? {
        species: state.phase.species,
        direction: state.phase.direction,
        wriggle: reducedMotion ? 0 : fishingWriggle(state.elapsed, state.phase.startedAt),
        animationFrame: fishPose(state.phase.species, state.motionTime, 0, reducedMotion).animationFrame,
      }
    : null;
  const narration = state.phase.kind === "reeling"
    ? `Fishing at ${spot.name}. Reeling ${FISH[state.phase.species].name} to the boat.`
    : state.phase.kind === "exiting"
      ? `Leaving ${spot.name} and returning to the lake surface.`
      : `Fishing at ${spot.name}. Target ${FISH[state.objectiveSpecies].name}, ${FISH[state.objectiveSpecies].rarity} rarity.`;
  return {
    spot: state.spot,
    objectiveSpecies: state.objectiveSpecies,
    phase: state.phase.kind,
    lineTier: state.lineTier,
    maximumDepth: maximumDepth(state.lineTier),
    hook: { ...state.hook },
    fish,
    hookedFish,
    transition: {
      diveProgress: settledDiveProgress,
      reelProgress,
      surfaceProgress,
      schoolOpacity,
      surfaceSpriteOpacity: reelProgress,
    },
    controls: {
      canSteer: state.phase.kind === "steering",
      canLeave: state.phase.kind === "steering",
    },
    narration,
  };
}

function interactionState(interaction: FishingInteraction): FishingInteractionState {
  return interaction as FishingInteractionState;
}

function maximumDepth(lineTier: number): number {
  return Math.min(0.94, 0.3 + lineTier * 0.125);
}

function diveProgress(elapsed: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  const linear = clamp(elapsed / FISHING_DIVE_DURATION, 0, 1);
  return 1 - (1 - linear) ** 3;
}

function returnProgress(elapsed: number, startedAt: number): number {
  const linear = clamp((elapsed - startedAt) / FISHING_RETURN_DURATION, 0, 1);
  return linear * linear * (3 - 2 * linear);
}

function fishingWriggle(elapsed: number, startedAt: number): number {
  const age = Math.max(0, elapsed - startedAt);
  return Math.sin(age * 25) * (1 - returnProgress(elapsed, startedAt));
}

function fishPose(
  species: FishSpecies,
  elapsed: number,
  phase: number,
  reducedMotion: boolean,
): {
  animationFrame: number;
  verticalOffsetRatio: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  heading: -1 | 1;
} {
  const motion = fishingSpeciesMotion(species, elapsed, phase);
  if (reducedMotion) {
    return {
      animationFrame: 0,
      verticalOffsetRatio: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      heading: motion.heading,
    };
  }
  const profile = FISHING_MOVEMENT_PROFILES[species];
  const framePhase = ((elapsed * profile.bodyFrequency + phase * 0.8) / (Math.PI * 2)) % 1;
  const animationFrame = motion.propulsion < 0.16
    ? 0
    : Math.floor((framePhase < 0 ? framePhase + 1 : framePhase) * 4) % 4;
  return {
    animationFrame,
    verticalOffsetRatio: motion.flex * profile.flexAmount * 0.08,
    rotation: motion.pitch,
    scaleX: 1 + motion.flex * profile.flexAmount,
    scaleY: 1 - motion.flex * profile.flexAmount * 0.62,
    heading: motion.heading,
  };
}

function multiplyDirection(first: -1 | 1, second: -1 | 1): -1 | 1 {
  return first === second ? 1 : -1;
}

function distance(first: WorldPoint, second: WorldPoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
