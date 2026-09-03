import type { FishSpecies, SpotId, WorldPoint } from "./balance";
import {
  fishingFightCue,
  type FishingFightBehaviour,
  type FishingFightCue,
} from "./fishingFight";

export const FISHING_SURFACE_DURATION = 1.15;
export const FISHING_LOSS_SWIM_DURATION = 0.36;
export const FISHING_LOSS_RETRACT_DURATION = 0.42;
export const FISHING_LOSS_DURATION = FISHING_LOSS_SWIM_DURATION + FISHING_LOSS_RETRACT_DURATION;
export const FISHING_LOSS_DEPTH_TOLERANCE = 0.03;

export interface FishingTarget extends WorldPoint {
  species: FishSpecies;
  direction: -1 | 1;
  speed: number;
  homeY: number;
  phase: number;
  velocityX: number;
  velocityY: number;
}

export interface FishingFightState {
  species: FishSpecies;
  targetIndex: number;
  hookedAt: number;
  direction: -1 | 1;
  progress: number;
  tension: number;
  stamina: number;
  behaviour: FishingFightBehaviour;
  struggle: number;
  motionX: number;
  motionY: number;
  motionVx: number;
  motionVy: number;
  landingAt: number | null;
  lostAt: number | null;
}

export interface FishingSessionState {
  spot: SpotId;
  startedAt: number;
  hook: WorldPoint;
  targets: FishingTarget[];
  reeling: FishingFightState | null;
  exitingAt: number | null;
}

export type FishingSessionPhase =
  | "steering"
  | "fighting"
  | "landing"
  | "fish-escaping"
  | "line-retracting"
  | "exiting";

export interface FishingLossProgress {
  swim: number;
  retract: number;
}

export interface FishingSessionDescription {
  phase: FishingSessionPhase;
  fightCue: FishingFightCue | null;
  landingProgress: number;
  exitProgress: number;
  surfaceProgress: number;
  schoolOpacity: number;
  lossProgress: FishingLossProgress | null;
}

export function describeFishingSession(
  session: FishingSessionState,
  elapsed: number,
): FishingSessionDescription {
  const fight = session.reeling;
  const landingProgress = fight?.landingAt === null || fight?.landingAt === undefined
    ? 0
    : transitionProgress(elapsed, fight.landingAt, FISHING_SURFACE_DURATION);
  const exitProgress = session.exitingAt === null
    ? 0
    : transitionProgress(elapsed, session.exitingAt, FISHING_SURFACE_DURATION);
  const lossProgress = fight?.lostAt === null || fight?.lostAt === undefined
    ? null
    : fishingLossProgress(elapsed, fight.lostAt);
  const surfaceProgress = fight?.landingAt !== null && fight?.landingAt !== undefined
    ? landingProgress
    : exitProgress;

  return {
    phase: fishingSessionPhase(session, lossProgress),
    fightCue: fight === null ? null : fishingFightCue(fight),
    landingProgress,
    exitProgress,
    surfaceProgress,
    schoolOpacity: 1 - surfaceProgress,
    lossProgress,
  };
}

function fishingSessionPhase(
  session: FishingSessionState,
  lossProgress: FishingLossProgress | null,
): FishingSessionPhase {
  const fight = session.reeling;
  if (fight?.lostAt !== null && fight?.lostAt !== undefined) {
    return lossProgress?.retract === 0 ? "fish-escaping" : "line-retracting";
  }
  if (fight?.landingAt !== null && fight?.landingAt !== undefined) return "landing";
  if (fight) return "fighting";
  if (session.exitingAt !== null) return "exiting";
  return "steering";
}

function fishingLossProgress(elapsed: number, lostAt: number): FishingLossProgress {
  const age = Math.max(0, elapsed - lostAt);
  return {
    swim: smoothstep(clamp(age / FISHING_LOSS_SWIM_DURATION, 0, 1)),
    retract: smoothstep(clamp(
      (age - FISHING_LOSS_SWIM_DURATION) / FISHING_LOSS_RETRACT_DURATION,
      0,
      1,
    )),
  };
}

function transitionProgress(elapsed: number, startedAt: number, duration: number): number {
  return smoothstep(clamp((elapsed - startedAt) / duration, 0, 1));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}
