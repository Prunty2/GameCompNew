import { describe, expect, test } from "vitest";
import {
  FISHING_LOSS_DURATION,
  FISHING_LOSS_SWIM_DURATION,
  FISHING_SURFACE_DURATION,
  describeFishingSession,
  fishingHighlightSpecies,
  type FishingFightState,
  type FishingSessionState,
} from "../game/fishingSession";

function session(reeling: FishingFightState | null = null): FishingSessionState {
  return {
    spot: "sunwardShoal",
    startedAt: 8,
    hook: { x: 0.5, y: 0.08 },
    targets: [],
    reeling,
    exitingAt: null,
  };
}

function fight(overrides: Partial<FishingFightState> = {}): FishingFightState {
  return {
    species: "bluegill",
    targetIndex: 0,
    hookedAt: 10,
    direction: 1,
    progress: 0.4,
    tension: 0.3,
    stamina: 0.8,
    behaviour: "calm",
    struggle: 0.1,
    motionX: 0,
    motionY: 0,
    motionVx: 0,
    motionVy: 0,
    landingAt: null,
    lostAt: null,
    ...overrides,
  };
}

describe("fishing session", () => {
  test("highlights a tracked fish only when it lives at the fishing ground", () => {
    expect(fishingHighlightSpecies(null, "lake", "sunwardShoal")).toBeNull();
    expect(fishingHighlightSpecies("bluegill", "lake", "sunwardShoal")).toBe("bluegill");
    expect(fishingHighlightSpecies("northernPike", "lake", "sunwardShoal")).toBeNull();
    expect(fishingHighlightSpecies("seaMullet", "beach", "sunwardShoal")).toBe("seaMullet");
    expect(fishingHighlightSpecies("bluegill", "beach", "sunwardShoal")).toBeNull();
  });

  test("describes steering and fighting through one interface", () => {
    expect(describeFishingSession(session(), 10)).toMatchObject({
      phase: "steering",
      fightCue: null,
      surfaceProgress: 0,
      schoolOpacity: 1,
    });
    expect(describeFishingSession(session(fight()), 10)).toMatchObject({
      phase: "fighting",
      fightCue: "resume",
      surfaceProgress: 0,
      schoolOpacity: 1,
    });
  });

  test("describes the unchanged landing and exit timing", () => {
    const landing = describeFishingSession(session(fight({ landingAt: 10 })), 10 + FISHING_SURFACE_DURATION / 2);
    expect(landing.phase).toBe("landing");
    expect(landing.landingProgress).toBeCloseTo(0.5);
    expect(landing.surfaceProgress).toBeCloseTo(0.5);
    expect(landing.schoolOpacity).toBeCloseTo(0.5);

    const exiting = session();
    exiting.exitingAt = 10;
    expect(describeFishingSession(exiting, 10 + FISHING_SURFACE_DURATION)).toMatchObject({
      phase: "exiting",
      exitProgress: 1,
      surfaceProgress: 1,
      schoolOpacity: 0,
    });
  });

  test("sequences fish escape before the broken line retracts", () => {
    const lost = session(fight({ lostAt: 10 }));
    expect(describeFishingSession(lost, 10)).toMatchObject({
      phase: "fish-escaping",
      lossProgress: { swim: 0, retract: 0 },
    });
    expect(describeFishingSession(lost, 10 + FISHING_LOSS_SWIM_DURATION)).toMatchObject({
      phase: "fish-escaping",
      lossProgress: { swim: 1, retract: 0 },
    });
    expect(describeFishingSession(lost, 10 + FISHING_LOSS_DURATION)).toMatchObject({
      phase: "line-retracting",
      lossProgress: { swim: 1, retract: 1 },
    });
  });
});
